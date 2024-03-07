# rustc plugin

This is the rustc plugin for code analysis.

currently it just largely is the `print-all-items` example plugin in the `rustc_plugin` repo, for basic testing.

run the example like this:

```bash
# assuming working directory is <repo_root>/crates/salt

# install the print-all-items binaries
cargo install --path . 

# run the binaries on an example crate
cd test-crate
cargo salt
```

You should see the output:

```text
[{"name":"","ty":"`use` import"},{"name":"std","ty":"extern crate"},{"name":"add","ty":"function"}]
```