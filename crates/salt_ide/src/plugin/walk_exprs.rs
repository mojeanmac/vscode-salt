use rustc_middle::{ty::TyCtxt, ty};
use rustc_hir::intravisit::{self, Visitor};
use rustc_hir::{Expr, HirId, ItemKind, TyKind, BodyId, FnSig, PatKind, ExprKind};
use rustc_utils::TyExt;
use std::collections::HashMap;
use rustc_middle::hir::nested_filter;

pub struct FnInfo {
    pub immut_fns: Vec<String>,
    pub mut_fns: Vec<String>,
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
        if let ItemKind::Fn(sig, _, body_id) = item.kind {
        let immut_inputs = immut_inputs(tcx, &sig, body_id);
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
fn immut_inputs(tcx: TyCtxt, sig: &FnSig, body_id: BodyId) -> bool {
    let typeck_results = tcx.typeck(body_id.hir_id.owner);
    // unsafe fns actually can't change mutability of params
    // but unsafe cells can
    // if sig.header.safety == rustc_hir::Safety::Unsafe {
    //     return false;
    // }

    // first ensure type immutability
    for input in sig.decl.inputs.iter() {
        let ty = typeck_results.node_type(input.hir_id);
        if let ty::Adt(def, _) = ty.kind() {
            if def.is_unsafe_cell() { //TODO: validate w Cell and RefCell
                return false;
            }
        }
        match input.kind {
            TyKind::Ref(_, mut_ty) => {
                if mut_ty.mutbl.is_mut() {
                    return false;
                }
            },
            TyKind::Ptr(mut_ty) => {
                if mut_ty.mutbl.is_mut() {
                    return false;
                }
            },
            _ => {},
        }
    }

    // then ensure pattern immutability
    let body = tcx.hir().body(body_id);
    for param in body.params.iter() {
        if let PatKind::Binding(mode, ..) = param.pat.kind {
            if mode.1.is_mut() {
                return false;
            }
        }
    }
    
    true
}

pub struct HirVisitor<'tcx> {
    pub tcx: TyCtxt<'tcx>,
    pub loop_count: usize,
    pub match_count: usize,
    pub exprs: HashMap<HirId, Vec<String>>,
    pub cur_hir_id: Option<HirId>,
    pub recursive_fns: Vec<String>,
}

impl<'tcx> HirVisitor<'tcx> {
    pub fn new(tcx: TyCtxt<'tcx>) -> Self {
        Self {
            tcx,
            loop_count: 0,
            match_count: 0,
            exprs: HashMap::new(),
            cur_hir_id: None,
            recursive_fns: Vec::new(),
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
            ExprKind::Match(..) => {
                self.match_count += 1; //TODO: why does it collect if statements?
            },
            ExprKind::Call(f, _) => { //check for recursion (in progress)
                if f.hir_id == expr.hir_id {
                self.recursive_fns.push(expr.hir_id.to_string());
                self.recursive_fns.push(f.hir_id.to_string());
                }
            },
            ExprKind::MethodCall(
                segment,
                receiver,
                _params,
                _span) => {
                let method_name = segment.ident.to_string();
                let receiver_type = typeck_results.expr_ty(receiver);

                // if segment.hir_id == expr.hir_id {
                // self.recursive_fns.push(segment.hir_id);
                // self.recursive_fns.push(expr.hir_id);
                // }

                // does receiver type implement iter trait?
                if self.ty_impls_iter(receiver_type, expr) {

                match self.cur_hir_id {
                    Some(hir_id) => {
                    self.exprs
                        .entry(hir_id)
                        .or_default()
                        .push(method_name);
                    }
                    None => {
                    self.exprs
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