#![feature(rustc_private)]
fn main() {
  env_logger::init();
  rustc_plugin::driver_main(salt_ide::plugin::print_result::SaltPlugin);
}
