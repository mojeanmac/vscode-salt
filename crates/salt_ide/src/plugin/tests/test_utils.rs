use std::process::Command;
use std::env;
use std::path::Path;
use serde_json::Value;
use crate::plugin::visit_hir::*;
use crate::plugin::print_result::*;
use std::collections::{HashMap, HashSet};

pub(crate) fn run_salt(path: &str) -> VisitorJson {
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

    assert!(parsed_jsons.len() == 1, "Expected one JSON object: {:?}", parsed_jsons);

    let print_result: PrintResult = serde_json::from_value(parsed_jsons[0].clone()).unwrap();
    let visit: VisitorJson = serde_json::from_value(print_result.visit_res).unwrap();
    visit

}

pub(crate) fn compare_fn(name: &str, expected: &BlockJson, functions: &HashMap<String, BlockJson>) ->  String{
    
    //assert that a key in functions contains name as a substring
    let found_key = functions
        .iter()
        .find(|(key, _)| key.contains(name));

    assert!(found_key.is_some(), "Function name not found.");

    let (def_id, actual) = found_key.unwrap();

    assert!(
        expected == actual || 
        // very unfortunate json teardown to determine set equivalencies in param tykinds
        if let (BlockJson::Def{ params: p_a, ret: ret_a, unsafety: u_a, recursive: rec_a, lines: l_a },
                BlockJson::Def{ params: p_e, ret: ret_e, unsafety: u_e, recursive: rec_e, lines: l_e }) = (actual, expected) {
            let eq_tykinds = match (p_a.get("ty_kinds").unwrap(), p_e.get("ty_kinds").unwrap()) {
                (Value::Array(tys_a), Value::Array(tys_e)) => {
                    let set1: HashSet<String> = tys_a.iter()
                        .map(|item| serde_json::to_string(item).unwrap())
                        .collect();
                    let set2: HashSet<String> = tys_e.iter()
                        .map(|item| serde_json::to_string(item).unwrap())
                        .collect();
                    set1 == set2
                },
                _ => false
            };
            eq_tykinds
            && p_a.get("closure_traits") == p_e.get("closure_traits")
            && u_a == u_e && ret_a == ret_e && rec_a == rec_e && l_a == l_e
        } else {
            false
        }
        ,
        "Incorrect output.\n\nActual: {:?},\n\nExpected: {:?}",
        actual,
        expected
    );

    def_id.to_string()
}