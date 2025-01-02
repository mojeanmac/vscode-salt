use rustc_middle::ty::{TyCtxt, TyKind};
use rustc_hir::intravisit::{self, Visitor};
use rustc_hir::{Item, BodyId, Expr, ExprKind, HirId, ItemKind, PatKind, def::DefKind};
use rustc_utils::TyExt;
use rustc_middle::hir::nested_filter;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};


// #[derive(Serialize, Deserialize)]
enum Block {
    Loop {
        id: HirId,
        span: usize,
    },
    Match {
        id: HirId,
        span: usize,
        arms: usize,
    },
    Def {
        id: HirId,
        span: usize,
        calls: usize,
    }
}

#[derive(Serialize, Deserialize)]
enum BlockJson {
    Loop {
        id: String,
        span: usize,
    },
    Match {
        id: String,
        span: usize,
        arms: usize,
    },
    Def {
        id: String,
        span: usize,
        calls: usize,
    }
}

impl Block {
    fn to_json(&self) -> BlockJson {
        match self {
            Block::Loop { id, span } => BlockJson::Loop {
                id: id.to_string(),
                span: *span,
            },
            Block::Match { id, span, arms } => BlockJson::Match {
                id: id.to_string(),
                span: *span,
                arms: *arms,
            },
            Block::Def { id, span, calls } => BlockJson::Def {
                id: id.to_string(),
                span: *span,
                calls: *calls,
            },
        }
    }
}

// ensure both type and pattern immutability of inputs
fn immut_inputs(tcx: TyCtxt, body_id: BodyId) -> bool {
    let typeck_results = tcx.typeck(body_id.hir_id.owner);
    let body = tcx.hir().body(body_id);
    for param in body.params {
        let ty = typeck_results.node_type(param.hir_id);
        match ty.kind() {
            TyKind::Adt(def, _) => {
                if def.is_unsafe_cell() {
                    return false;
                }
            },
            TyKind::Ref(.., mut_ty) => {
                if mut_ty.is_mut() {
                    return false;
                }
            },
            TyKind::RawPtr(.., mut_ty) => {
                if mut_ty.is_mut() {
                    return false;
                }
            },
            _ => {},
        }
        if let PatKind::Binding(mode, ..) = param.pat.kind {
            if mode.1.is_mut() {
                return false;
            }
        }
    }
    
    true
}

pub struct HirVisitor<'tcx> {
    tcx: TyCtxt<'tcx>,
    immut_fns: Vec<Block>,
    mut_fns: Vec<Block>,
    closures: Vec<Block>,
    recursive_fns: HashSet<HirId>,
    loops: Vec<Block>,
    matches: Vec<Block>,
    iter_mthds: HashMap<HirId, Vec<String>>,
    cur_hir_id: Option<HirId>,
}

#[derive(Serialize, Deserialize)]
pub struct VisitorJson {
    immut_fns: Vec<BlockJson>,
    mut_fns: Vec<BlockJson>,
    closures: Vec<BlockJson>,
    recursive_fns: Vec<String>,
    loops: Vec<BlockJson>,
    matches: Vec<BlockJson>,
    iter_mthds: Vec<Vec<String>>,
}

impl<'tcx> HirVisitor<'tcx> {
    pub fn new(tcx: TyCtxt<'tcx>) -> Self {
        Self {
            tcx,
            immut_fns: Vec::new(),
            mut_fns: Vec::new(),
            closures: Vec::new(),
            recursive_fns: HashSet::new(),
            loops: Vec::new(),
            matches: Vec::new(),
            iter_mthds: HashMap::new(),
            cur_hir_id: None,
        }
    }

    pub fn to_json(&self) -> VisitorJson {
        VisitorJson {
            immut_fns: self.immut_fns.iter().map(|b| b.to_json()).collect(),
            mut_fns: self.mut_fns.iter().map(|b| b.to_json()).collect(),
            closures: self.closures.iter().map(|b| b.to_json()).collect(),
            recursive_fns: self.recursive_fns.iter().map(|d| d.to_string()).collect(),
            loops: self.loops.iter().map(|b| b.to_json()).collect(),
            matches: self.matches.iter().map(|b| b.to_json()).collect(),
            iter_mthds: self.iter_mthds.values().cloned().collect(),
        }
    }

    fn ty_impls_iter(&self, ty: rustc_middle::ty::Ty<'tcx>, expr: &Expr<'tcx>) -> bool {
        if let Some(iterator_trait_def_id) = self.tcx.lang_items().iterator_trait() {
        if ty.does_implement_trait(
            self.tcx,
            self.tcx.param_env(expr.hir_id.owner),
            iterator_trait_def_id) {
            return true
        }
        }
        false
    }
}

impl<'tcx> Visitor<'tcx> for HirVisitor<'tcx> {
    type NestedFilter = nested_filter::OnlyBodies;
    fn nested_visit_map(&mut self) -> Self::Map {
        self.tcx.hir()
    }

    fn visit_item(&mut self, item: &'tcx Item<'tcx>) {
        let def_id = item.owner_id.to_def_id();
        match self.tcx.def_kind(def_id) {
            DefKind::Fn => {
                if let ItemKind::Fn(.., body_id) = item.kind {
                    let func = Block::Def {
                        id: item.hir_id(),
                        span: 0, //TODO: get span
                        calls: 0,
                    };
                    let immut_inputs = immut_inputs(self.tcx, body_id);
                    if immut_inputs {
                        self.immut_fns.push(func);
                    } else {
                        self.mut_fns.push(func);
                    }
                }
            }
            DefKind::Closure => {
                self.closures.push(Block::Def {
                    id: item.hir_id(),
                    span: 0, //TODO: get span
                    calls: 0, //if it has a name
                });
            }
            _ => {},
        }
        intravisit::walk_item(self, item);
    }

    fn visit_expr(&mut self, expr: &'tcx Expr<'tcx>) {
        let typeck_results = self.tcx.typeck(expr.hir_id.owner);
        match expr.kind {
            ExprKind::Loop(..) => {
                self.loops.push(Block::Loop {
                    id: expr.hir_id,
                    span: 0, //TODO: get span
                });
            },
            ExprKind::Match(_, arms, src) => {
                if src == rustc_hir::MatchSource::Normal {
                    self.matches.push(Block::Match {
                        id: expr.hir_id,
                        span: 0, //TODO: get span
                        arms: arms.len(),
                    });
                }
            },
            ExprKind::Call(func, ..) => { //check for recursion
                if let ExprKind::Path(qpath) = func.kind {
                    if let Some(def_id) = typeck_results
                            .qpath_res(&qpath, func.hir_id)
                            .opt_def_id() {
                        if expr.hir_id.owner.def_id.to_def_id() == def_id {
                            self.recursive_fns.insert(
                                expr.hir_id);
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
                if self.ty_impls_iter(receiver_type, expr) {
                    match self.cur_hir_id {
                        Some(hir_id) => {
                        self.iter_mthds
                            .entry(hir_id)
                            .or_default()
                            .push(method_name);
                        }
                        None => {
                        self.iter_mthds
                            .entry(expr.hir_id)
                            .or_default()
                            .push(method_name);
                        }
                    }
                }
            }
            _ => {
                self.cur_hir_id = None;
            }
        }
        intravisit::walk_expr(self, expr);
    }
}

pub fn hash_string(input: &str) -> String {
    let mut hasher = DefaultHasher::new();
    input.hash(&mut hasher);
    let hash_value = hasher.finish();
    format!("{}", hash_value)[..8].to_string()
  }