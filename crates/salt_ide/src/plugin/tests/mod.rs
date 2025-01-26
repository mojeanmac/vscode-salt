// done with hashing disabled

mod test_utils;

#[cfg(test)]
mod test {

use crate::plugin::visit_hir::*;
use std::process::Command;
use crate::plugin::tests::test_utils::*;
use std::collections::{HashSet, HashMap};

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
        println!("{}", serde_json::to_string_pretty(&visit).unwrap());

        let test_json: BlockJson = BlockJson::Def {
            params: serde_json::to_value(Params::default()).unwrap(),
            ret: serde_json::to_value(Return::default()).unwrap(),
            unsafety: false,
            recursive: false,
            lines: 5,
        };

        let test_def = compare_fn("test_1", &test_json, &visit.fns);
        assert!(visit.loops.contains(&BlockJson::Loop{ def_id: test_def.clone(), lines: 3, depth: 1}),
            "Loop block not found in {:?}", visit.loops);
        assert!(visit.calls[&test_def] == HashMap::from([("DefId(0:4 ~ unit_tests[8802]::main)".to_string(), 1)]));

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
            unsafety: false,
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
            unsafety: false,
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
            unsafety: false,
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
            unsafety: false,
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
            unsafety: false,
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
            unsafety: false,
            recursive: false,
            lines: 5,
        };

        compare_fn("unsafe_param", &unsafe_param, &visit.fns);

        let unsafe_fn = BlockJson::Def {
            params: serde_json::to_value(Params {
                closure_traits: HashSet::new(),
                ty_kinds: HashSet::from([(false, "u64".to_string())])
            }).unwrap(),
            ret: serde_json::to_value(Return {
                mutabl: false,
                closure_trait: None,
                ty_kind: "()".to_string()
            }).unwrap(),
            unsafety: true,
            recursive: false,
            lines: 3,
        };

        let unsafe_json = compare_fn("unsafe_fn", &unsafe_fn, &visit.fns);

        let call_unsafe = BlockJson::Def {
            params: serde_json::to_value(Params {
                closure_traits: HashSet::new(),
                ty_kinds: HashSet::from([(false, "u64".to_string())])
            }).unwrap(),
            ret: serde_json::to_value(Return {
                mutabl: false,
                closure_trait: None,
                ty_kind: "()".to_string()
            }).unwrap(),
            unsafety: false,
            recursive: false,
            lines: 5,
        };

        let call_unjson = compare_fn("call_unsafe", &call_unsafe, &visit.fns);
        assert!(visit.calls[&unsafe_json] == HashMap::from([(call_unjson.clone(), 1)]));
        assert!(visit.unsafe_blocks.contains(&BlockJson::Unsafe{ def_id: call_unjson, lines: 3 , depth : 1}),
            "Unsafe block not found in {:?}", visit.unsafe_blocks);

        let loopception = BlockJson::Def {
            params: serde_json::to_value(Params {
                closure_traits: HashSet::new(),
                ty_kinds: HashSet::from([(false, "std::vec::Vec<std::vec::Vec<u64, std::alloc::Global>, std::alloc::Global>".to_string())])
            }).unwrap(),
            ret: serde_json::to_value(Return {
                mutabl: false,
                closure_trait: None,
                ty_kind: "()".to_string()
            }).unwrap(),
            unsafety: false,
            recursive: false,
            lines: 8,
        };

        let loopjson = compare_fn("loopception", &loopception, &visit.fns);
        assert!(visit.loops.contains(&BlockJson::Loop{ def_id: loopjson.clone(), lines: 5, depth: 1}),
            "Loop block not found in {:?}", visit.loops);
        assert!(visit.loops.contains(&BlockJson::Loop{ def_id: loopjson.clone(), lines: 3, depth: 2}),
            "Loop block not found in {:?}", visit.loops);

        let looperoni = BlockJson::Def {
            params: serde_json::to_value(Params {
                closure_traits: HashSet::new(),
                ty_kinds: HashSet::from([(false, "std::vec::Vec<std::vec::Vec<u64, std::alloc::Global>, std::alloc::Global>".to_string())])
            }).unwrap(),
            ret: serde_json::to_value(Return {
                mutabl: false,
                closure_trait: None,
                ty_kind: "()".to_string()
            }).unwrap(),
            unsafety: false,
            recursive: false,
            lines: 11,
        };

        let looperjson = compare_fn("looperoni", &looperoni, &visit.fns);

        assert!(visit.loops.contains(&BlockJson::Loop{ def_id: looperjson.clone(), lines: 9, depth: 1}),
            "Loop block not found in {:?}", visit.loops);
        assert!(visit.loops.contains(&BlockJson::Loop{ def_id: looperjson.clone(), lines: 3, depth: 2}),
            "Loop block not found in {:?}", visit.loops);

    }
}