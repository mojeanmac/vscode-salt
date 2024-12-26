//! sample print-all-items plugin from rustc_plugin examples

use std::{borrow::Cow, env, process::Command};

use clap::Parser;
use rustc_hir::intravisit::{self, Visitor};
use rustc_hir::{Expr, HirId, ItemKind, TyKind, Body, FnSig, PatKind, ExprKind};
use rustc_utils::TyExt;
use std::collections::HashMap;
use rustc_middle::ty::TyCtxt;
use rustc_plugin::{CrateFilter, RustcPlugin, RustcPluginArgs, Utf8Path};
use serde::{Deserialize, Serialize};
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};

// This struct is the plugin provided to the rustc_plugin framework,
// and it must be exported for use by the CLI/driver binaries.
pub struct PrintExprsPlugin;

// To parse CLI arguments, we use Clap for this example. But that
// detail is up to you.
#[derive(Parser, Serialize, Deserialize)]
pub struct PrintExprsPluginArgs {
  #[arg(short, long)]
  allcaps: bool,

  #[clap(last = true)]
  cargo_args: Vec<String>,
}

impl RustcPlugin for PrintExprsPlugin {
  type Args = PrintExprsPluginArgs;

  fn version(&self) -> Cow<'static, str> {
    env!("CARGO_PKG_VERSION").into()
  }

  fn driver_name(&self) -> Cow<'static, str> {
    "salt-driver".into()
  }

  // In the CLI, we ask Clap to parse arguments and also specify a CrateFilter.
  // If one of the CLI arguments was a specific file to analyze, then you
  // could provide a different filter.
  fn args(&self, _target_dir: &Utf8Path) -> RustcPluginArgs<Self::Args> {
    let args = PrintExprsPluginArgs::parse_from(env::args().skip(1));
    let filter = CrateFilter::AllCrates;
    RustcPluginArgs { args, filter }
  }

  // Pass Cargo arguments (like --feature) from the top-level CLI to Cargo.
  fn modify_cargo(&self, cargo: &mut Command, args: &Self::Args) {
    cargo.args(&args.cargo_args);
  }

  // In the driver, we use the Rustc API to start a compiler session
  // for the arguments given to us by rustc_plugin.
  fn run(
    self,
    compiler_args: Vec<String>,
    plugin_args: Self::Args,
  ) -> rustc_interface::interface::Result<()> {
    let mut callbacks = PrintExprsCallbacks { args: plugin_args };
    let compiler = rustc_driver::RunCompiler::new(&compiler_args, &mut callbacks);
    compiler.run()
  }
}

struct PrintExprsCallbacks {
  args: PrintExprsPluginArgs,
}

impl rustc_driver::Callbacks for PrintExprsCallbacks {
  // At the top-level, the Rustc API uses an event-based interface for
  // accessing the compiler at different stages of compilation. In this callback,
  // all the type-checking has completed.
  fn after_analysis(
    &mut self,
    _compiler: &rustc_interface::interface::Compiler,
    tcx: TyCtxt<'_>,
  ) -> rustc_driver::Compilation {
    // We call our top-level function with access to the type context `tcx` and the CLI arguments.
    print_exprs(tcx);

    // Note that you should generally allow compilation to continue. If
    // your plugin is being invoked on a dependency, then you need to ensure
    // the dependency is type-checked (its .rmeta file is emitted into target/)
    // so that its dependents can read the compiler outputs.
    rustc_driver::Compilation::Continue
  }
}

// The core of our analysis. It doesn't do much, just access some methods on the `TyCtxt`.
// I recommend reading the Rustc Development Guide to better understand which compiler APIs
// are relevant to whatever task you have.
fn print_exprs(tcx: TyCtxt) {
  let hir = tcx.hir();
  let mut visitor = HirVisitor::new(tcx);
  hir.walk_toplevel_module(&mut visitor);
  let function_info = function_defs(tcx);

  let result = PrintResult {
    crate_id: hash_string(&tcx.crate_name(rustc_hir::def_id::LOCAL_CRATE).to_string()),
    loop_count: visitor.loop_count,
    match_count: visitor.match_count,
    exprs: visitor.exprs
      .values() // Ignore the id, iterate only over the values (methods)
      .cloned() // Clone each Vec<String>
      .collect(),
    pure_fns: function_info.pure_fns
      .iter()
      .map(|hir_id| format!("{:?}", hir_id))
      .collect(),
    mut_fns: function_info.mut_fns
      .iter()
      .map(|hir_id| format!("{:?}", hir_id))
      .collect(),
    recursive_fns: visitor.recursive_fns
      .iter()
      .map(|hir_id| format!("{:?}", hir_id))
      .collect(),
  };
  match serde_json::to_string(&result) {
    Ok(json) => println!("{}", json),
    Err(e) => eprintln!("Failed to serialize results: {}", e),
  }
}

#[derive(Serialize, Deserialize)]
struct PrintResult {
  crate_id: String,
  loop_count: usize,
  match_count: usize,
  exprs: Vec<Vec<String>>,
  pure_fns: Vec<String>,
  mut_fns: Vec<String>,
  recursive_fns: Vec<String>,
}

struct FnInfo {
  pure_fns: Vec<HirId>,
  mut_fns: Vec<HirId>,
}

fn function_defs(tcx: TyCtxt) -> FnInfo {
  let hir = tcx.hir();
  let mut info = FnInfo {
    pure_fns: Vec::new(),
    mut_fns: Vec::new(),
  };
  for id in hir.items() {
    let item = hir.item(id);
    if let ItemKind::Fn(sig, _gen, body_id) = item.kind {
      let is_pure = is_pure(&sig, hir.body(body_id));
      if is_pure {
        info.pure_fns.push(id.hir_id());
      } else {
        info.mut_fns.push(id.hir_id());
      }
    }
  }
  info
}

fn is_pure(sig: &FnSig, body: &Body) -> bool {
  let type_immut = sig.decl.inputs.iter()
  .all(|arg| match arg.kind {
    TyKind::Ref(_, mut_ty) => mut_ty.mutbl.is_not(),
    TyKind::Ptr(mut_ty) => mut_ty.mutbl.is_not(),
    _ => true,
  });
  
  let pattern_immut = body.params.iter()
  .all(|param| match param.pat.kind {
    PatKind::Binding(mode, ..) => {
      mode.1.is_not()
    },
    _ => true,
  });

  //TODO: check for body declarations of mut and unsafe blocks

  type_immut && pattern_immut
}

struct HirVisitor<'tcx> {
  tcx: TyCtxt<'tcx>,
  loop_count: usize,
  match_count: usize,
  exprs: HashMap<HirId, Vec<String>>,
  cur_hir_id: Option<HirId>,
  recursive_fns: Vec<HirId>,
}

impl<'tcx> HirVisitor<'tcx> {
  fn new(tcx: TyCtxt<'tcx>) -> Self {
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

  fn visit_expr(&mut self, expr: &'tcx Expr<'tcx>) {
      let typeck_results = self.tcx.typeck(expr.hir_id.owner);
      match expr.kind {
          ExprKind::Loop(..) => {
              self.loop_count += 1;
              //check for iter in the params?
          },
          ExprKind::Match(..) => {
            self.match_count += 1;
          },
          ExprKind::Call(f, _) => { //check for recursion
            if f.hir_id == expr.hir_id {
              self.recursive_fns.push(f.hir_id);
            }
          },
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

fn hash_string(input: &str) -> String {
  let mut hasher = DefaultHasher::new();
  input.hash(&mut hasher);
  let hash_value = hasher.finish();
  format!("{}", hash_value)[..8].to_string()
}