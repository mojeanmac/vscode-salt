//! sample print-all-items plugin from rustc_plugin examples

use std::{borrow::Cow, env, process::Command};
use clap::Parser;
use rustc_middle::ty::TyCtxt;
use rustc_plugin::{CrateFilter, RustcPlugin, RustcPluginArgs, Utf8Path};
use serde::{Deserialize, Serialize};
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};

use crate::plugin::walk_exprs::*;

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

#[derive(Serialize, Deserialize)]
struct PrintResult {
  crate_id: String,
  lines_hir: usize,
  loop_count: usize,
  match_count: usize,
  exprs: Vec<Vec<String>>,
  immut_fns: Vec<String>,
  mut_fns: Vec<String>,
  recursive_fns: Vec<String>,
}

fn print_exprs(tcx: TyCtxt) {
  let hir = tcx.hir();
  let mut visitor = HirVisitor::new(tcx);
  hir.visit_all_item_likes_in_crate(&mut visitor);
  let function_info = function_defs(tcx);

  let result = PrintResult {
    crate_id: hash_string(&tcx.crate_name(rustc_hir::def_id::LOCAL_CRATE).to_string()),
    lines_hir: 0, //TODO: count lines of hir
    loop_count: visitor.loop_count,
    match_count: visitor.match_count,
    exprs: visitor.exprs
      .values()
      .cloned()
      .collect(),
    immut_fns: function_info.immut_fns,
    mut_fns: function_info.mut_fns,
    recursive_fns: visitor.recursive_fns,
  };
  match serde_json::to_string(&result) {
    Ok(json) => println!("{}", json),
    Err(e) => eprintln!("Failed to serialize results: {}", e),
  }
}

fn hash_string(input: &str) -> String {
  let mut hasher = DefaultHasher::new();
  input.hash(&mut hasher);
  let hash_value = hasher.finish();
  format!("{}", hash_value)[..8].to_string()
}