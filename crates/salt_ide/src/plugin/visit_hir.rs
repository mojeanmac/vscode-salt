use rustc_middle::ty::{Ty, TyCtxt, TyKind, ExistentialPredicate};
use rustc_span::source_map::SourceMap;
use rustc_span::def_id::DefId;
use rustc_hir::intravisit::{self, Visitor};
use rustc_hir::{Item, BodyId, Expr, ExprKind, ItemKind, PatKind, def::DefKind, OwnerId, MatchSource};
use rustc_utils::TyExt;
use rustc_middle::hir::nested_filter;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, hash_map::DefaultHasher};
use std::hash::{Hash, Hasher};

// togglable for testing
const HASH_EN: bool = false;

// function parameters (inputs)
#[derive(Serialize, Deserialize, Default)]
pub(crate) struct Params {
    pub(crate) closure_traits: Vec<String>,
    pub(crate) ty_kinds: Vec<(bool, String)>,
}

// function return arguments (outputs)
#[derive(Serialize, Deserialize)]
pub(crate) struct Return {
    pub(crate) mutabl: bool,
    pub(crate) closure_trait: Option<String>,
    pub(crate) ty_kind: String,
}

impl Default for Return {
    fn default() -> Self {
        Return {
            mutabl: false,
            closure_trait: None,
            ty_kind: "".to_string()
        }
    }
}

// block-y types analyzed during visit
// raw version of BlockJson used by HirVisitor
enum Block {
    Loop {
        def_id: DefId,
        lines: usize,
        depth: usize,
    },
    Match {
        def_id: DefId,
        lines: usize,
        arms: u32,
        depth: usize,
    },
    LetExpr{
        def_id: DefId,
        depth: usize,
    },
    Unsafe {
        def_id: DefId,
        lines: usize,
        depth: usize,
    },
    Iter {
        def_id: DefId,
        depth: usize,
        methods: Vec<String>,
    },
    Def {
        params: Params,
        ret: Return,
        unsafety: bool,
        recursive: bool,
        lines: usize,
    },
    NoType {
        def_id: DefId,
        lines: usize,
        depth: usize,
    }
}

// json version of Block used for serialization
#[derive(Serialize, Deserialize, PartialEq, Eq, Debug, Clone)]
pub enum BlockJson {
    Loop {
        def_id: String,
        lines: usize,
        depth: usize,
    },
    Match {
        def_id: String,
        lines: usize,
        arms: u32,
        depth: usize,
    },
    LetExpr {
        def_id: String,
        depth: usize,
    },
    Unsafe {
        def_id: String,
        lines: usize,
        depth: usize,
    },
    Iter {
        def_id: String,
        depth: usize,
        methods: Vec<String>,
    },
    Def {
        params: serde_json::Value,
        ret: serde_json::Value,
        unsafety: bool,
        recursive: bool,
        lines: usize,
    },
    NoType {
        def_id: String,
        lines: usize,
        depth: usize,
    }
}

impl Block {
    fn to_json(&self) -> BlockJson {
        match self {
            Block::Loop { def_id, lines, depth} => BlockJson::Loop {
                def_id: hash_id(def_id),
                lines: *lines,
                depth: *depth,
            },
            Block::Match { def_id, lines, arms, depth } => BlockJson::Match {
                def_id: hash_id(def_id),
                lines: *lines,
                arms: *arms,
                depth: *depth,
            },
            Block::LetExpr {def_id, depth } => BlockJson::LetExpr {
                def_id: hash_id(def_id),
                depth: *depth,
            },
            Block::Unsafe { def_id, lines, depth } => BlockJson::Unsafe {
                def_id: hash_id(def_id),
                lines: *lines,
                depth: *depth,
            },
            Block::Iter { def_id, depth, methods } => BlockJson::Iter {
                def_id: hash_id(def_id),
                depth: *depth,
                methods: methods.clone(),
            },
            Block::Def { params, ret, unsafety, recursive, lines } => BlockJson::Def {
                params: serde_json::to_value(params).unwrap(),
                ret: serde_json::to_value(ret).unwrap(),
                unsafety: *unsafety,
                recursive: *recursive,
                lines: *lines,
            },
            Block::NoType { def_id, lines , depth} => BlockJson::NoType {
                def_id: hash_id(def_id),
                lines: *lines,
                depth: *depth,
            }
        }
    }
}

pub struct HirVisitor<'tcx> {
    tcx: TyCtxt<'tcx>,
    source_map: &'tcx SourceMap,
    depth: usize,
    fns: HashMap<DefId, Block>,
    loops: Vec<Block>,
    matches: Vec<Block>,
    let_exprs: Vec<Block>,
    iter_mthds: HashMap<OwnerId, Block>,
    calls: HashMap<DefId, HashMap<DefId, u32>>,
    unsafe_blocks: Vec<Block>,
    no_type: Vec<Block>,
}

// json version of visitor for serialization
#[derive(Serialize, Deserialize)]
pub struct VisitorJson {
    pub(crate) fns: HashMap<String, BlockJson>,
    pub(crate) loops: Vec<BlockJson>,
    pub(crate) matches: Vec<BlockJson>,
    pub(crate) let_exprs: Vec<BlockJson>,
    pub(crate) iter_mthds: Vec<BlockJson>,
    pub(crate) calls: HashMap<String, HashMap<String, u32>>,
    pub(crate) unsafe_blocks: Vec<BlockJson>,
    pub(crate) no_type: Vec<BlockJson>,
}

impl<'tcx> HirVisitor<'tcx> {
    pub fn new(tcx: TyCtxt<'tcx>) -> Self {
        Self {
            tcx,
            source_map: tcx.sess.source_map(),
            depth: 0,
            fns: HashMap::new(),
            loops: Vec::new(),
            matches: Vec::new(),
            let_exprs: Vec::new(),
            iter_mthds: HashMap::new(),
            calls: HashMap::new(),
            unsafe_blocks: Vec::new(),
            no_type: Vec::new(),
        }
    }

    pub fn to_json(&self) -> VisitorJson {
        VisitorJson {
            fns: self.fns.iter().map(|(k, v)| (hash_id(k), v.to_json())).collect(),
            loops: self.loops.iter().map(|v| v.to_json()).collect(),
            matches: self.matches.iter().map(|v| v.to_json()).collect(),
            let_exprs: self.let_exprs.iter().map(|v| v.to_json()).collect(),
            iter_mthds: self.iter_mthds.values().map(|v| v.to_json()).collect(),
            calls: self.calls.iter()
                .map(|(k, v)| (hash_id(k), v.iter()
                    .map(|(from, cnt)| (hash_id(from), *cnt))
                    .collect::<HashMap<_, _>>()))
                    .collect(),
            unsafe_blocks: self.unsafe_blocks.iter().map(|v| v.to_json()).collect(),
            no_type: self.no_type.iter().map(|v| v.to_json()).collect(),
        }
    }
}

// - `Visitor::nested_visit_map` becomes `Visitor::maybe_tcx`.
impl<'tcx> Visitor<'tcx> for HirVisitor<'tcx> {
    type NestedFilter = nested_filter::All;
    fn maybe_tcx(&mut self) -> Self::MaybeTyCtxt {
        self.tcx
    }

    // visit functions, including traits and impls which may have nested fns
    fn visit_item(&mut self, item: &'tcx Item<'tcx>) {
        self.depth = 0;
        let def_id = item.owner_id.to_def_id();
        if self.tcx.def_kind(def_id) == DefKind::Fn {
            match item.kind {
                ItemKind::Fn { sig, body, .. } => {  //todo: check for body_id?
                    let unsafety = sig.header.safety == rustc_hir::HeaderSafety::Normal(rustc_hir::Safety::Unsafe);
                    let params = visit_params(self.tcx, body);
                    let ret = visit_return(self.tcx, body);
                    self.fns.insert(def_id, Block::Def {
                        params,
                        ret,
                        unsafety,
                        recursive: false,
                        lines: line_count(self.source_map, item.span),
                    });
                }
                ItemKind::Impl(impl_item) => {
                    for item_id in impl_item.items {
                        let assoc_item = self.tcx.hir().expect_impl_item(item_id.id.owner_id.def_id);
                        self.visit_impl_item(assoc_item);
                    }
                }
                ItemKind::Trait(.., trait_items) => {
                    for item_id in trait_items {
                        let assoc_item = self.tcx.hir().expect_trait_item(item_id.id.owner_id.def_id);
                        self.visit_trait_item(assoc_item);
                    }
                }
                _ => {}
            }
        }
        intravisit::walk_item(self, item);
    }

    // for finding the ImplItemKind::Fn
    fn visit_impl_item(&mut self, item: &'tcx rustc_hir::ImplItem<'tcx>) {
        if let rustc_hir::ImplItemKind::Fn(sig, body_id) = item.kind {
            let unsafety = sig.header.safety == rustc_hir::HeaderSafety::Normal(rustc_hir::Safety::Unsafe);
            let params = visit_params(self.tcx, body_id);
            let ret = visit_return(self.tcx, body_id);
            self.fns.insert(item.owner_id.to_def_id(), Block::Def {
                params,
                ret,
                unsafety,
                recursive: false,
                lines: line_count(self.source_map, item.span),
            });
        }
        intravisit::walk_impl_item(self, item);
    }

    // for finding the TraitItemKind::Fn, but only those that have bodies
    fn visit_trait_item(&mut self, item: &'tcx rustc_hir::TraitItem<'tcx>){
        if let rustc_hir::TraitItemKind::Fn(sig, tf) = item.kind {
            let unsafety = sig.header.safety == rustc_hir::HeaderSafety::Normal(rustc_hir::Safety::Unsafe);
            if let rustc_hir::TraitFn::Provided(body_id) = tf{
                let params = visit_params(self.tcx, body_id);
                let ret = visit_return(self.tcx, body_id);
                self.fns.insert(item.owner_id.to_def_id(), Block::Def {
                    params,
                    ret,
                    unsafety,
                    recursive: false,
                    lines: line_count(self.source_map, item.span),
                });
            }
        }
        intravisit::walk_trait_item(self, item)
    }

    // discovers unsafe blocks and increment/decrements nesting depth
    fn visit_block(&mut self, block: &'tcx rustc_hir::Block<'tcx>) {
        if let rustc_hir::BlockCheckMode::UnsafeBlock(_) = block.rules {
            let def_id = block.hir_id.owner.to_def_id();
            self.unsafe_blocks.push(Block::Unsafe {
                def_id,
                lines: line_count(self.source_map, block.span),
                depth: self.depth,
            });
        }

        let mut desugared = false;
        if !block.stmts.is_empty() {
            if let rustc_hir::StmtKind::Expr(expr) = block.stmts[0].kind {
                if let ExprKind::Match(.., src) = expr.kind{
                    match src {
                        MatchSource::ForLoopDesugar => desugared = true,
                        MatchSource::TryDesugar(_) => desugared = true,
                        MatchSource::AwaitDesugar => desugared = true,
                        _ => ()
                    }
                }
            }
        }
       
        if desugared {
            intravisit::walk_block(self, block);
        }
        else {
            self.depth += 1;
            intravisit::walk_block(self, block);
            self.depth -= 1;
        }
    }

    // analyze loops, matches, let expressions, function calls, and iter method calls
    fn visit_expr(&mut self, expr: &'tcx Expr<'tcx>) {

        let owner = expr.hir_id.owner;
        if !self.tcx.has_typeck_results(owner.def_id) {
            self.no_type.push(Block::NoType {
                def_id: owner.to_def_id(),
                lines: line_count(self.source_map, expr.span),
                depth: self.depth,
            });
            return
        }
        let typeck_results = self.tcx.typeck(owner);

        let hir_id = expr.hir_id;
        let def_id = hir_id.owner.to_def_id();
        match expr.kind {
            ExprKind::Loop(..) => {
                self.loops.push(Block::Loop {
                    def_id,
                    lines: line_count(self.source_map, expr.span),
                    depth: self.depth,
                });
            },
            ExprKind::Match(.., arms, src) => {
                if src == MatchSource::Normal {
                    self.matches.push(Block::Match {
                        def_id,
                        lines: line_count(self.source_map, expr.span),
                        arms: arms.len() as u32,
                        depth: self.depth,
                    });
                }
            },
            ExprKind::Let(_) => {
                self.let_exprs.push(Block::LetExpr {
                    def_id,
                    depth: self.depth,
                });
            },
            ExprKind::Call(func, ..) => {
                if let ExprKind::Path(qpath) = func.kind {
                    if let Some(call_def_id) = typeck_results
                        .qpath_res(&qpath, func.hir_id)
                        .opt_def_id()
                    {
                        //check for recursion
                        if def_id == call_def_id {
                            if let Block::Def { recursive, .. } =  self.fns.get_mut(&call_def_id).unwrap() {
                                *recursive = true;
                            }
                        }
                        // increment local fn calls
                        if call_def_id.is_local() {
                            *self.calls
                                .entry(call_def_id)
                                .or_default()
                                .entry(hir_id.owner.to_def_id())
                                .or_default() += 1;
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
                    let owner = expr.hir_id.owner;
                    if self.iter_mthds.contains_key(&owner) {
                        if let Block::Iter { methods, .. } 
                                = self.iter_mthds.get_mut(&owner).unwrap() {
                            methods.push(method_name);
                        }
                    }
                    else {
                        self.iter_mthds.insert(owner, Block::Iter {
                            def_id,
                            depth: self.depth,
                            methods: vec![method_name],
                        });
                    }
                }
            }
            _ => {}
        }
        intravisit::walk_expr(self, expr);
    }
}

// analyze param tykinds, mutability, and optional closure traits
fn visit_params(tcx: TyCtxt, body_id: BodyId) -> Params {
    let mut closure_traits = Vec::new();
    let mut ty_kinds = Vec::new();

    let typeck_results = tcx.typeck(body_id.hir_id.owner);
    let body = tcx.hir_body(body_id);
    for param in body.params {
        let ty = typeck_results.node_type(param.hir_id);

        if let Some(closure_trait) = is_ty_closure(tcx, &ty, body_id.hir_id.owner.to_def_id()) {
            closure_traits.push(closure_trait);
        }
        
        let is_mut = is_mut(ty.kind(), &param.pat.kind);
        let ty_kind = ty_kind_variant(ty.kind());
        ty_kinds.push((is_mut, ty_kind));
    }
    Params {
        closure_traits,
        ty_kinds,
    }
}

// analyze return tykind, mutability, and optional closure trait
fn visit_return(tcx: TyCtxt, body_id: BodyId) -> Return {
    let body = tcx.hir_body(body_id);
    let ty = tcx.typeck(body_id.hir_id.owner).node_type(body.value.hir_id);

    let ty_kind = if ty.is_unit() {
        "".to_string()
    } else {
        ty_kind_variant(ty.kind())
    };

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
        ty_kind,
    }
}

// checks if ty has type or pattern mutability
fn is_mut(ty_kind: &TyKind, pat_kind: &PatKind) -> bool {
    let mut is_mut = false;
    match ty_kind {
        TyKind::Adt(def, _) => if def.is_unsafe_cell() {
            is_mut = true;
        },
        TyKind::Ref(.., mut_ty) => if mut_ty.is_mut() {
            is_mut = true; 
        },
        TyKind::RawPtr(.., mut_ty) => if mut_ty.is_mut() { 
            is_mut = true; 
        },
        _ => {},
    }
    if let PatKind::Binding(mode, ..) = pat_kind {
        if mode.1.is_mut() { is_mut = true; }
    }
    is_mut
}

// checks if ty has any of the following closure traits: Fn, FnMut, FnOnce
fn is_ty_closure<'tcx>(tcx: TyCtxt<'tcx>, ty: &Ty<'tcx>, def_id: DefId) -> Option<String> {
    let param_env = tcx.param_env(def_id);
    let lang_items = tcx.lang_items();
    
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

// checks if ty is a closure represented as a dyn trait object
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

// checks if ty implements the Iterator trait
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

// calculates the number of lines in a span
fn line_count(source_map: &SourceMap, span: rustc_span::Span) -> usize {
    let start = source_map.lookup_char_pos(span.lo()).line;
    let end = source_map.lookup_char_pos(span.hi()).line;
    end - start + 1
}

// hashes the DefId to an anonymized string
fn hash_id(input: &DefId) -> String {
    if HASH_EN {
        let mut hasher = DefaultHasher::new();
        input.hash(&mut hasher);
        let hash_value = hasher.finish();
        format!("{}", hash_value).to_string()
    }
    else {
        format!("{:?}", input).to_string()
    }
}

// converts TyKind variant to a string
fn ty_kind_variant(ty_kind: &TyKind) -> String {
    match ty_kind {
        TyKind::Bool => "Bool".to_string(),
        TyKind::Char => "Char".to_string(),
        TyKind::Int(..) => "Int".to_string(),
        TyKind::Uint(..) => "Uint".to_string(),
        TyKind::Float(..) => "Float".to_string(),
        TyKind::Adt(..) => "Adt".to_string(),
        TyKind::Foreign(..) => "Foreign".to_string(),
        TyKind::Str => "Str".to_string(),
        TyKind::Array(..) => "Array".to_string(),
        TyKind::Pat(..) => "Pat".to_string(),
        TyKind::Slice(..) => "Slice".to_string(),
        TyKind::RawPtr(..) => "RawPtr".to_string(),
        TyKind::Ref(..) => "Ref".to_string(),
        TyKind::FnDef(..) => "FnDef".to_string(),
        TyKind::FnPtr(..) => "FnPtr".to_string(),
        TyKind::Dynamic(..) => "Dynamic".to_string(),
        TyKind::Closure(..) => "Closure".to_string(),
        TyKind::CoroutineClosure(..) => "CoroutineClosure".to_string(),
        TyKind::Coroutine(..) => "Coroutine".to_string(),
        TyKind::CoroutineWitness(..) => "CoroutineWitness".to_string(),
        TyKind::Never => "Never".to_string(),
        TyKind::Tuple(..) => "Tuple".to_string(),
        TyKind::Alias(..) => "Alias".to_string(),
        TyKind::Param(..) => "Param".to_string(),
        TyKind::Bound(..) => "Bound".to_string(),
        TyKind::Placeholder(..) => "Placeholder".to_string(),
        TyKind::Infer(..) => "Infer".to_string(),
        TyKind::Error(..) => "Error".to_string(),
        _ => "Unknown".to_string(),
    }
}
