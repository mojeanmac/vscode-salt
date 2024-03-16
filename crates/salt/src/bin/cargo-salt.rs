fn main() {
  env_logger::init();
  rustc_plugin::cli_main(salt::plugin::print_all_items::PrintAllItemsPlugin);
}
