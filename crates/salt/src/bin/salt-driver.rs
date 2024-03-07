fn main() {
  env_logger::init();
  rustc_plugin::driver_main(salt::plugin::print_all_items::PrintAllItemsPlugin);
}
