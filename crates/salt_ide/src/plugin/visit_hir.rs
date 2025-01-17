use rustc_middle::ty::{Ty, TyCtxt, TyKind, ExistentialPredicate};
use rustc_span::source_map::SourceMap;
use rustc_span::def_id::DefId;
use rustc_hir::intravisit::{self, Visitor};
use rustc_hir::{Item, BodyId, Expr, ExprKind, HirId, ItemKind, PatKind, def::DefKind, OwnerId};
use rustc_utils::TyExt;
use rustc_middle::hir::nested_filter;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};

#[derive(Serialize, Deserialize)]
struct Args {
    total: u32,
    mut_count: u32,
    closure_traits: Vec<String>,
    tys: Vec<String>,
}

#[derive(Serialize, Deserialize)]
struct Return {
    mutabl: bool,
    closure_trait: Option<String>,
    ty: String,
}

enum Block {
    Loop {
        id: HirId,
        lines: usize,
    },
    Match {
        id: HirId,
        lines: usize,
        arms: u32,
    },
    LetExpr {
        id: HirId,
    },
    Def {
        args: Args,
        ret: Return,
        recursive: bool,
        lines: usize,
        calls: u32,
    }
}

#[derive(Serialize, Deserialize)]
enum BlockJson {
    Loop {
        id: String,
        lines: usize,
    },
    Match {
        id: String,
        lines: usize,
        arms: u32,
    },
    LetExpr {
        id: String,
    },
    Def {
        args: serde_json::Value,
        ret: serde_json::Value,
        recursive: bool,
        lines: usize,
        calls: u32,
    }
}

impl Block {
    fn to_json(&self) -> BlockJson {
        match self {
            Block::Loop { id, lines } => BlockJson::Loop {
                id: id.to_string(), //hashed later on
                lines: *lines,
            },
            Block::Match { id, lines, arms } => BlockJson::Match {
                id: id.to_string(),
                lines: *lines,
                arms: *arms,
            },
            Block::LetExpr { id } => BlockJson::LetExpr {
                id: id.to_string(),
            },
            Block::Def { args, ret, recursive, lines, calls } => BlockJson::Def {
                args: serde_json::to_value(args).unwrap(),
                ret: serde_json::to_value(ret).unwrap(),
                recursive: *recursive,
                lines: *lines,
                calls: *calls,
            }            
        }
    }
}

pub struct HirVisitor<'tcx> {
    tcx: TyCtxt<'tcx>,
    source_map: &'tcx SourceMap,
    fns: HashMap<DefId, Block>,
    loops: Vec<Block>,
    matches: Vec<Block>,
    let_exprs: Vec<Block>,
    iter_mthds: HashMap<OwnerId, Vec<String>>,
}

#[derive(Serialize, Deserialize)]
pub struct VisitorJson {
    fns: HashMap<String, BlockJson>,
    loops: Vec<BlockJson>,
    matches: Vec<BlockJson>,
    let_exprs: Vec<BlockJson>,
    iter_mthds: Vec<Vec<String>>,
}

impl<'tcx> HirVisitor<'tcx> {
    pub fn new(tcx: TyCtxt<'tcx>) -> Self {
        Self {
            tcx,
            source_map: tcx.sess.source_map(),
            fns: HashMap::new(),
            loops: Vec::new(),
            matches: Vec::new(),
            let_exprs: Vec::new(),
            iter_mthds: HashMap::new(),
        }
    }

    pub fn to_json(&self) -> VisitorJson {
        VisitorJson {
            fns: self.fns.iter().map(|(k, v)| (format!("{:?}", k), v.to_json()) ).collect(),
            loops: self.loops.iter().map(|b| b.to_json()).collect(),
            matches: self.matches.iter().map(|b| b.to_json()).collect(),
            let_exprs: self.let_exprs.iter().map(|b| b.to_json()).collect(),
            iter_mthds: self.iter_mthds.values().cloned().collect(),
        }
    }
}

impl<'tcx> Visitor<'tcx> for HirVisitor<'tcx> {
    type NestedFilter = nested_filter::OnlyBodies;
    fn nested_visit_map(&mut self) -> Self::Map {
        self.tcx.hir()
    }

    // visit functions, including traits and impls which may have nested fns
    fn visit_item(&mut self, item: &'tcx Item<'tcx>) {
        let def_id = item.owner_id.to_def_id();
        if self.tcx.def_kind(def_id) == DefKind::Fn {
            match item.kind {
                ItemKind::Fn(.., body_id) => { 
                    let args = visit_args(self.tcx, body_id);
                    let ret = visit_return(self.tcx, body_id);
                    self.fns.insert(def_id, Block::Def {
                        args,
                        ret,
                        recursive: false,
                        lines: line_count(self.source_map, item.span),
                        calls: 0,
                    });
                    let body = self.tcx.hir().body(body_id);
                    for param in body.params {
                        self.visit_param(param);
                    }
                }
                ItemKind::Impl(impl_item) => {
                    for item_id in impl_item.items {
                        let assoc_item = self.tcx.hir().impl_item(item_id.id);
                        self.visit_impl_item(assoc_item);
                    }
                }
                ItemKind::Trait(.., trait_items) => {
                    for item_id in trait_items {
                        let assoc_item = self.tcx.hir().trait_item(item_id.id);
                        self.visit_trait_item(assoc_item);
                    }
                }
                _ => {}
            }
        }
        intravisit::walk_item(self, item);
    }

    fn visit_impl_item(&mut self, item: &'tcx rustc_hir::ImplItem<'tcx>) {
        if let rustc_hir::ImplItemKind::Fn(.., body_id) = item.kind {
            let args = visit_args(self.tcx, body_id);
            let ret = visit_return(self.tcx, body_id);
            self.fns.insert(item.owner_id.to_def_id(), Block::Def {
                args,
                ret,
                recursive: false,
                lines: line_count(self.source_map, item.span),
                calls: 0,
            });
        }
        intravisit::walk_impl_item(self, item);
    }

    fn visit_trait_item(&mut self, item: &'tcx rustc_hir::TraitItem<'tcx>){ //TODO verify
        if let rustc_hir::TraitItemKind::Fn(..) = item.kind {
            let body_id = BodyId { hir_id: item.hir_id() };
            let args = visit_args(self.tcx, body_id);
            let ret = visit_return(self.tcx, body_id);
            self.fns.insert(item.owner_id.to_def_id(), Block::Def {
                args,
                ret,
                recursive: false,
                lines: line_count(self.source_map, item.span),
                calls: 0,
            });
        }
        intravisit::walk_trait_item(self, item)
    }

    fn visit_expr(&mut self, expr: &'tcx Expr<'tcx>) {
        let typeck_results = self.tcx.typeck(expr.hir_id.owner);
        match expr.kind {
            ExprKind::Loop(..) => {
                self.loops.push(Block::Loop {
                    id: expr.hir_id,
                    lines: line_count(self.source_map, expr.span),
                });
            },
            ExprKind::Match(.., arms, src) => {
                if src == rustc_hir::MatchSource::Normal {
                    self.matches.push(Block::Match {
                        id: expr.hir_id,
                        lines: line_count(self.source_map, expr.span),
                        arms: arms.len() as u32,
                    });
                }
            },
            ExprKind::Let(..) => {
                self.let_exprs.push(Block::LetExpr {
                    id: expr.hir_id,
                });
            },
            ExprKind::Call(func, ..) => {
                if let ExprKind::Path(qpath) = func.kind {
                    if let Some(def_id) = typeck_results
                        .qpath_res(&qpath, func.hir_id)
                        .opt_def_id()
                    {
                        //check for recursion
                        if expr.hir_id.owner.def_id.to_def_id() == def_id {
                            if let Block::Def { recursive, .. } =  self.fns.get_mut(&def_id).unwrap() {
                                *recursive = true;
                            }
                        }
                        // increment local fn calls
                        if self.fns.contains_key(&def_id) {
                            if let Block::Def { calls, .. } = self.fns.get_mut(&def_id).unwrap() {
                                *calls += 1;
                            }
                        }
                    }
                }
            }
            ExprKind::MethodCall(
                segment,
                receiver,
                _params,
                _span) => {
                let method_name = segment.ident.to_string();
                let receiver_type = typeck_results.expr_ty(receiver);

                // does receiver type implement iter trait?
                if ty_impls_iter(self.tcx, receiver_type, expr) {
                    self.iter_mthds
                        .entry(expr.hir_id.owner)
                        .or_default()
                        .push(method_name);
                }
            }
            _ => {}
        }
        intravisit::walk_expr(self, expr);
    }
}

// count mutable arguments and closure arguments
fn visit_args(tcx: TyCtxt, body_id: BodyId) -> Args {
    let mut mut_count = 0;
    let mut closure_traits = Vec::new();
    let mut tys = Vec::new();

    let typeck_results = tcx.typeck(body_id.hir_id.owner);
    let body = tcx.hir().body(body_id);
    for param in body.params {
        let ty = typeck_results.node_type(param.hir_id);
        tys.push(ty.to_string());

        if let Some(closure_trait) = is_ty_closure(tcx, &ty, body_id.hir_id.owner.to_def_id()) {
            closure_traits.push(closure_trait);
        }
        
        match ty.kind() {
            TyKind::Adt(def, _) => {
                if def.is_unsafe_cell() { mut_count += 1; }
            },
            TyKind::Ref(.., mut_ty) => {
                if mut_ty.is_mut() { mut_count += 1; }

            },
            TyKind::RawPtr(.., mut_ty) => {
                if mut_ty.is_mut() { mut_count += 1; }
            },
            _ => {},
        }
        if let PatKind::Binding(mode, ..) = param.pat.kind {
            if mode.1.is_mut() { mut_count += 1; }
        }
    }
    Args {
        total: body.params.len() as u32,
        mut_count,
        closure_traits,
        tys,
    }
}

fn visit_return(tcx: TyCtxt, body_id: BodyId) -> Return {
    let body = tcx.hir().body(body_id);
    let ty = tcx.typeck(body_id.hir_id.owner).node_type(body.value.hir_id);
    let mutabl = match ty.kind() {
        TyKind::Adt(def, _) => {
            def.is_unsafe_cell()
        },
        TyKind::Ref(.., mut_ty) => {
            mut_ty.is_mut()
        },
        TyKind::RawPtr(.., mut_ty) => {
            mut_ty.is_mut()
        },
        _ => false,
    };
    let closure_trait = is_ty_closure(tcx, &ty, body_id.hir_id.owner.to_def_id());
    Return {
        mutabl,
        closure_trait,
        ty: ty.to_string(),
    }
}

fn is_ty_closure<'tcx>(tcx: TyCtxt<'tcx>, ty: &Ty<'tcx>, def_id: DefId) -> Option<String> {
    let param_env = tcx.param_env(def_id);
    let lang_items = tcx.lang_items();
    
    // check if closure impl
    if let Some(fn_trait) = lang_items.fn_trait() {
        if ty.does_implement_trait(tcx, param_env, fn_trait) {
            return Some("Fn".to_string());
        }
    }
    if let Some(fn_trait) = lang_items.fn_mut_trait() {
        if ty.does_implement_trait(tcx, param_env, fn_trait) {
            return Some("FnMut".to_string());
        }
    }
    if let Some(fn_trait) = lang_items.fn_once_trait() {
        if ty.does_implement_trait(tcx, param_env, fn_trait) {
            return Some("FnOnce".to_string());
        }
    }

    if let Some(closure_trait) = is_dyn_closure(tcx, ty) {
        return Some(closure_trait);
    }

    None
}

fn is_dyn_closure(tcx: TyCtxt, ty: &Ty) -> Option<String> {
    match ty.kind() {
        TyKind::Dynamic(preds, ..) => {
            for pred in preds.iter() {
                if let ExistentialPredicate::Trait(trait_pred) = pred.skip_binder() {
                    if let Some(trait_name) = tcx.def_path_str(trait_pred.def_id).split("::").last() {
                        match trait_name {
                            "Fn" => return Some("Fn".to_string()),
                            "FnMut" => return Some("FnMut".to_string()),
                            "FnOnce" => return Some("FnOnce".to_string()),
                            _ => {}
                        }
                    }
                }
            }
            None
        },
        TyKind::Ref(_, inner_ty, _) => {
            is_dyn_closure(tcx, inner_ty)
        },
        TyKind::Adt(..) => {
            if let Some(inner_ty) = ty.boxed_ty() {
                is_dyn_closure(tcx, &inner_ty)
            } else {
                None
            }
        },
        _ => None,
    }
}

fn ty_impls_iter<'tcx>(tcx: TyCtxt<'tcx>, ty: Ty<'tcx>, expr: &Expr<'tcx>) -> bool {
    if let Some(iterator_trait_def_id) = tcx.lang_items().iterator_trait() {
        if ty.does_implement_trait(
            tcx,
            tcx.param_env(expr.hir_id.owner),
            iterator_trait_def_id) {
            return true;
        }
    }
    false
}

fn line_count(source_map: &SourceMap, span: rustc_span::Span) -> usize {
    let start = source_map.lookup_char_pos(span.lo()).line;
    let end = source_map.lookup_char_pos(span.hi()).line;
    end - start + 1
}

pub fn hash_string(input: &str) -> String {
    let mut hasher = DefaultHasher::new();
    input.hash(&mut hasher);
    let hash_value = hasher.finish();
    format!("{}", hash_value)[..8].to_string()
}