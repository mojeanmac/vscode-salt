
#[cfg(test)]
mod test {
    use std::process::Command;
    use std::env;
    use std::path::Path;
    use serde_json::Value;
    use crate::plugin::visit_hir::*;
    use crate::plugin::print_result::*;
    use std::collections::HashMap;

    fn run_salt(path: &str) -> Vec<Value> {
        let project_dir = Path::new(path);
        env::set_current_dir(project_dir).expect("Failed to change directory");
        
        let output = Command::new("cargo")
            .args(["salt"])
            .output()
            .expect("Failed to execute cargo salt");

        assert!(output.status.success(), "Command failed: {:?}", output);

        let output_str = String::from_utf8_lossy(&output.stdout);

        let json_objects: Vec<&str> = output_str
        .split('\n')
        .filter(|line| !line.trim().is_empty())
        .collect();

        let parsed_jsons: Vec<Value> = json_objects
            .into_iter()
            .map(|json_str| {
                serde_json::from_str(json_str)
                    .expect("Failed to parse JSON output")
            })
            .collect();

        parsed_jsons
    }

    fn compare_fn(name: &str, expected: &BlockJson, functions: &HashMap<String, BlockJson>,) {
        
        //assert that a key in functions contains name as a substring
        let found_key = functions
            .iter()
            .find(|(key, _)| key.contains(name));

        assert!(found_key.is_some(), "Function name not found.");

        let actual = found_key.unwrap().1;

        assert!(
            expected == actual,
            "Incorrect output.\n\nActual: {:?},\n\nExpected: {:?}",
            actual,
            expected
        );
    }

    #[test]
    fn reinstall_salt() {
        let _ = Command::new("cargo")
         .args(["uninstall", "salt-ide"])
         .output()
         .expect("Failed to uninstall salt-ide");

        let install_output = Command::new("cargo")
            .args(["install", "--path", "../../crates/salt_ide"])
            .output()
            .expect("Failed to install salt-ide");

        assert!(install_output.status.success(), "Installation failed: {:?}", install_output);
    }
    
    #[test]
    fn test() {
        let path = "src/plugin/tests/unit_tests";
        let jsons = run_salt(path);
        for val in jsons {

            let print_result: PrintResult = serde_json::from_value(val).unwrap();
            let visit: VisitorJson = serde_json::from_value(print_result.visit_res).unwrap();

            let test: BlockJson = BlockJson::Def {
                params: serde_json::to_value(Params::default()).unwrap(),
                ret: serde_json::to_value(Return::default()).unwrap(),
                recursive: false,
                lines: 5,
            };

            compare_fn("test_1", &test, &visit.fns);

            let impl_closure = BlockJson::Def {
                params: serde_json::to_value(Params {
                    total: 1,
                    mut_count: 0,
                    closure_traits: vec!["Fn".to_string()],
                    ty_kinds: vec!["impl Fn(u64)/#0".to_string()]
                }).unwrap(),
                ret: serde_json::to_value(Return {
                    mutabl: false,
                    closure_trait: Some("Fn".to_string()),
                    ty_kind: "impl Fn(u64)/#0".to_string()
                }).unwrap(),
                recursive: false,
                lines: 4,
            };

            compare_fn("impl_closure", &impl_closure, &visit.fns);
            
            assert!(visit.calls.len() == 1);
            
            println!("{}", serde_json::to_string_pretty(&visit).unwrap());
        }
    }
}