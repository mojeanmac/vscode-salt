use std::process::Command;
use serde_json::Value;
use crate::plugin::visit_hir::*;
use crate::Plugin::print_result::*;

fn test_file_output(path: &str, expected: Value) -> Value {
    let output = Command::new("cargo")
        .args(&["salt", path])
        .output()
        .expect("Failed to execute cargo salt");

    assert!(output.status.success(), "Command failed: {:?}", output);

    let json_output: Value = serde_json::from_slice(&output.stdout)
        .expect("Failed to parse JSON output");

    json_output
}


#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn impl_closure() {
        let path = "tests/unit_tests/impl_closure.rs";

        let actual = test_file_output(path, expected);
        assert_eq!(actual, expected);
    }
}