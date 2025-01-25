// done with hashing disabled

mod test_utils;

#[cfg(test)]
mod test {

use crate::plugin::visit_hir::*;
use std::process::Command;
use crate::plugin::tests::test_utils::*;
use std::collections::HashSet;

const PATH: &str = "src/plugin/tests/unit_tests";
const LONGKIND: &str = "std::boxed::Box<dyn [Binder { value: Trait(std::ops::FnOnce<(i32,)>), bound_vars: [] }, Binder { value: Projection(Output = i32), bound_vars: [] }] + '{erased}, std::alloc::Global>";

    #[test]
    fn reinstall_salt() {
        let _ = Command::new("cargo")
        .args(["uninstall", "salt-ide"])
        .output()
        .expect("Failed to uninstall salt-ide");

        let install_output = Command::new("cargo")
            .args(["install", "--path", "."])
            .output()
            .expect("Failed to install salt-ide");

        assert!(install_output.status.success(), "Installation failed: {:?}", install_output);
    }

    #[test]
    fn test() {
        let visit = run_salt(PATH);

        let test_json: BlockJson = BlockJson::Def {
            params: serde_json::to_value(Params::default()).unwrap(),
            ret: serde_json::to_value(Return::default()).unwrap(),
            recursive: false,
            lines: 5,
        };

        let test_def = compare_fn("test_1", &test_json, &visit.fns);
        assert!(visit.loops.contains_key(&test_def));
        assert!(visit.calls[&test_def] == 1);

        let impl_closure_json = BlockJson::Def {
            params: serde_json::to_value(Params {
                closure_traits: HashSet::from(["Fn".to_string()]),
                ty_kinds: HashSet::from([(false, "impl Fn(u64)/#0".to_string())])
            }).unwrap(),
            ret: serde_json::to_value(Return {
                mutabl: false,
                closure_trait: Some("Fn".to_string()),
                ty_kind: "impl Fn(u64)/#0".to_string()
            }).unwrap(),
            recursive: false,
            lines: 4,
        };

        compare_fn("impl_closure", &impl_closure_json, &visit.fns);
        
        let fn_mut = BlockJson::Def {
            params: serde_json::to_value(Params {
                closure_traits: HashSet::from(["FnMut".to_string()]),
                ty_kinds: HashSet::from([(true, "impl FnMut(u64)/#0".to_string())])
            }).unwrap(),
            ret: serde_json::to_value(Return {
                mutabl: false,
                closure_trait: None,
                ty_kind: "()".to_string()
            }).unwrap(),
            recursive: false,
            lines: 1,
        };

        compare_fn("fn_mut", &fn_mut, &visit.fns);

        let dyna_clos = BlockJson::Def {
            params: serde_json::to_value(Params {
                closure_traits: HashSet::from(["FnOnce".to_string()]),
                ty_kinds: HashSet::from([(false, LONGKIND.to_string()), (false, "i32".to_string())])
            }).unwrap(),
            ret: serde_json::to_value(Return {
                mutabl: false,
                closure_trait: None,
                ty_kind: "i32".to_string()
            }).unwrap(),
            recursive: false,
            lines: 3,
        };

        compare_fn("dyna_clos", &dyna_clos, &visit.fns);

        let mut_ref = BlockJson::Def {
            params: serde_json::to_value(Params {
                closure_traits: HashSet::new(),
                ty_kinds: HashSet::from([(true, "&'{erased} mut u64".to_string())])
            }).unwrap(),
            ret: serde_json::to_value(Return {
                mutabl: true,
                closure_trait: None,
                ty_kind: "&'{erased} mut u64".to_string()
            }).unwrap(),
            recursive: false,
            lines: 4,
        };

        compare_fn("mut_ref", &mut_ref, &visit.fns);

        let mut_val_recurse = BlockJson::Def {
            params: serde_json::to_value(Params {
                closure_traits: HashSet::new(),
                ty_kinds: HashSet::from([(true, "u64".to_string())])
            }).unwrap(),
            ret: serde_json::to_value(Return {
                mutabl: false,
                closure_trait: None,
                ty_kind: "()".to_string()
            }).unwrap(),
            recursive: true,
            lines: 5,
        };

        compare_fn("mut_val_recurse", &mut_val_recurse, &visit.fns);

        let unsafe_param = BlockJson::Def {
            params: serde_json::to_value(Params {
                closure_traits: HashSet::new(),
                ty_kinds: HashSet::from([(true, "std::cell::UnsafeCell<u64>".to_string())])
            }).unwrap(),
            ret: serde_json::to_value(Return {
                mutabl: false,
                closure_trait: None,
                ty_kind: "()".to_string()
            }).unwrap(),
            recursive: false,
            lines: 5,
        };

        compare_fn("unsafe_param", &unsafe_param, &visit.fns);

        println!("{}", serde_json::to_string_pretty(&visit).unwrap());
    }
}