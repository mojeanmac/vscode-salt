use rustc_middle::ty::{TyCtxt, TyKind};
use rustc_hir::intravisit::{self, Visitor};
use rustc_hir::{BodyId, Expr, ExprKind, HirId, ItemKind, PatKind};
use rustc_utils::TyExt;
use std::collections::HashMap;
use rustc_middle::hir::nested_filter;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct FnInfo {
    immut_fns: Vec<String>,
    mut_fns: Vec<String>,
}

// item-wise analysis
pub fn function_defs(tcx: TyCtxt) -> FnInfo {
    let hir = tcx.hir();
    let mut info = FnInfo {
        immut_fns: Vec::new(),
        mut_fns: Vec::new(),
    };
    for id in hir.items() {
        let item = hir.item(id);
        if let ItemKind::Fn(.., body_id) = item.kind {
            let immut_inputs = immut_inputs(tcx, body_id);
            if immut_inputs {
                info.immut_fns.push(item.ident.to_string());
            } else {
                info.mut_fns.push(item.ident.to_string());
            }
        }
    }
    info
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
    loop_count: usize,
    match_count: usize,
    iter_mthds: HashMap<HirId, Vec<String>>,
    cur_hir_id: Option<HirId>,
    recursive_fns: Vec<String>,
}

#[derive(Serialize, Deserialize)]
pub struct VisitorJson {
    loop_count: usize,
    match_count: usize,
    iter_mthds: Vec<Vec<String>>,
    recursive_fns: Vec<String>,
}

impl<'tcx> HirVisitor<'tcx> {
    pub fn new(tcx: TyCtxt<'tcx>) -> Self {
        Self {
            tcx,
            loop_count: 0,
            match_count: 0,
            iter_mthds: HashMap::new(),
            cur_hir_id: None,
            recursive_fns: Vec::new(),
        }
    }

    pub fn to_json(&self) -> VisitorJson {
        VisitorJson {
            loop_count: self.loop_count,
            match_count: self.match_count,
            iter_mthds: self.iter_mthds.values().cloned().collect(),
            recursive_fns: self.recursive_fns.clone(),
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

    fn visit_expr(&mut self, expr: &'tcx Expr<'tcx>) {
        let typeck_results = self.tcx.typeck(expr.hir_id.owner);
        match expr.kind {
            ExprKind::Loop(..) => {
                self.loop_count += 1;
            },
            ExprKind::Match(.., src) => {
                if src == rustc_hir::MatchSource::Normal {
                    self.match_count += 1;
                }
            },
            ExprKind::Call(func, ..) => { //check for recursion
                if let ExprKind::Path(qpath) = func.kind {
                    if let Some(def_id) = typeck_results
                            .qpath_res(&qpath, func.hir_id)
                            .opt_def_id() {
                        if expr.hir_id.owner.def_id.to_def_id() == def_id {
                            self.recursive_fns.push(
                                self.tcx.def_path_str(def_id));
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