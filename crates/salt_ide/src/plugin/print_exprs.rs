//! sample print-all-items plugin from rustc_plugin examples

use std::{borrow::Cow, env, process::Command};

use clap::Parser;
use rustc_hir::intravisit::{self, Visitor};
use rustc_hir::{Expr, HirId, OwnerId};
use rustc_middle::hir::nested_filter;
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
  let mut visitor = HirPrinter::new(tcx);

  hir.visit_all_item_likes_in_crate(&mut visitor);

  let result = VisitResult {
    crate_id: hash_string(&tcx.crate_name(rustc_hir::def_id::LOCAL_CRATE).to_string()),
    loop_count: visitor.loop_count,
    iter_methods: visitor
      .iter_methods
      .values() // Ignore the id, iterate only over the values (methods)
      .cloned() // Clone each Vec<String>
      .collect(),
    // iter_methods: visitor.iter_methods
    //   .iter()
    //   .map(|(hir_id, methods)| {
    //     let hir_id_str = format!("{:?}", hir_id);
    //     (hir_id_str, methods.clone())
    //   })
    //   .collect()
  };
  match serde_json::to_string(&result) {
    Ok(json) => println!("{}", json),
    Err(e) => eprintln!("Failed to serialize results: {}", e),
  }
}

#[derive(Serialize, Deserialize)]
struct VisitResult {
  crate_id: String,
  loop_count: usize,
  iter_methods: Vec<Vec<String>>,
}

struct HirPrinter<'tcx> {
  tcx: TyCtxt<'tcx>,
  loop_count: usize,
  iter_methods: HashMap<OwnerId, Vec<String>>
}

impl<'tcx> Visitor<'tcx> for HirPrinter<'tcx> {
  type NestedFilter = nested_filter::OnlyBodies;

  fn visit_expr(&mut self, expr: &'tcx Expr<'tcx>) {
      let typeck_results = self.tcx.typeck(expr.hir_id.owner);
      match expr.kind {
          rustc_hir::ExprKind::Loop(..) => {
              self.loop_count += 1;
          }
          rustc_hir::ExprKind::MethodCall(
            segment,
            receiver,
            _params,
            _span) => {
            // get the method name
            let method_name = segment.ident.to_string();
            // get the type of the receiver
            let receiver_type = typeck_results.expr_ty(receiver);

            // does receiver type implement iter trait?
            if self.ty_impls_iter(receiver_type, expr) {
              self.iter_methods
                .entry(expr.hir_id.owner)
                .or_default()
                .push(method_name);
            }
          }
          _ => {}
      }
      intravisit::walk_expr(self, expr);
  }

  fn nested_visit_map(&mut self) -> Self::Map {
    self.tcx.hir()
  }
}

impl<'tcx> HirPrinter<'tcx> {
  fn new(tcx: TyCtxt<'tcx>) -> Self {
      Self {
          tcx,
          loop_count: 0,
          iter_methods: HashMap::new(),
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

fn hash_string(input: &str) -> String {
  let mut hasher = DefaultHasher::new();
  input.hash(&mut hasher);
  let hash_value = hasher.finish();
  format!("{}", hash_value)[..8].to_string()
}