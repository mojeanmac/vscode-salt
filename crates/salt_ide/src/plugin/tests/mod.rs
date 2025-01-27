// done with hashing disabled

mod test_utils;

#[cfg(test)]
mod test {
use crate::plugin::visit_hir::*;
use std::process::Command;
use crate::plugin::tests::test_utils::*;
use std::collections::HashMap;

const PATH: &str = "src/plugin/tests/unit_tests";

    #[test]
    fn reinstall_salt() {
        let _ = Command::new("cargo")
        .args(["uninstall", "salt_ide"])
        .output()
        .expect("Failed to uninstall salt_ide");

        let install_output = Command::new("cargo")
            .args(["install", "--path", "."])
            .output()
            .expect("Failed to install salt_ide");

        assert!(install_output.status.success(), "Installation failed: {:?}", install_output);
    }

    #[test]
    fn test() {
        let visit = run_salt(PATH);
        println!("{}", serde_json::to_string_pretty(&visit).unwrap());

        let main = BlockJson::Def {
            params: serde_json::to_value(Params::default()).unwrap(),
            ret: serde_json::to_value(Return::default()).unwrap(),
            unsafety: false,
            recursive: false,
            lines: 4,
        };

        let main_json = compare_fn("main", &main, &visit.fns);

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

        let impl_closure_json = BlockJson::Def {
            params: serde_json::to_value(Params {
                closure_traits: vec!["Fn".to_string()],
                ty_kinds: vec![(false, "Param".to_string())]
            }).unwrap(),
            ret: serde_json::to_value(Return {
                mutabl: false,
                closure_trait: Some("Fn".to_string()),
                ty_kind: "Param".to_string()
            }).unwrap(),
            unsafety: false,
            recursive: false,
            lines: 4,
        };

        compare_fn("impl_closure", &impl_closure_json, &visit.fns);
        
        let fn_mut = BlockJson::Def {
            params: serde_json::to_value(Params {
                closure_traits: vec!["FnMut".to_string()],
                ty_kinds: vec![(true, "Param".to_string())]
            }).unwrap(),
            ret: serde_json::to_value(Return::default()).unwrap(),
            unsafety: false,
            recursive: false,
            lines: 1,
        };

        compare_fn("fn_mut", &fn_mut, &visit.fns);

        let dyna_clos = BlockJson::Def {
            params: serde_json::to_value(Params {
                closure_traits: vec!["FnOnce".to_string()],
                ty_kinds: vec![(false, "Adt".to_string()), (false, "Int".to_string())]
            }).unwrap(),
            ret: serde_json::to_value(Return {
                mutabl: false,
                closure_trait: None,
                ty_kind: "Int".to_string()
            }).unwrap(),
            unsafety: false,
            recursive: false,
            lines: 3,
        };

        compare_fn("dyna_clos", &dyna_clos, &visit.fns);

        let mut_ref = BlockJson::Def {
            params: serde_json::to_value(Params {
                closure_traits: Vec::new(),
                ty_kinds: vec![(true, "Ref".to_string())]
            }).unwrap(),
            ret: serde_json::to_value(Return {
                mutabl: true,
                closure_trait: None,
                ty_kind: "Ref".to_string()
            }).unwrap(),
            unsafety: false,
            recursive: false,
            lines: 4,
        };

        compare_fn("mut_ref", &mut_ref, &visit.fns);

        let mut_val_recurse = BlockJson::Def {
            params: serde_json::to_value(Params {
                closure_traits: Vec::new(),
                ty_kinds: vec![(true, "Uint".to_string())]
            }).unwrap(),
            ret: serde_json::to_value(Return::default()).unwrap(),
            unsafety: false,
            recursive: true,
            lines: 5,
        };

        compare_fn("mut_val_recurse", &mut_val_recurse, &visit.fns);

        let unsafe_param = BlockJson::Def {
            params: serde_json::to_value(Params {
                closure_traits: Vec::new(),
                ty_kinds: vec![(true, "Adt".to_string())]
            }).unwrap(),
            ret: serde_json::to_value(Return::default()).unwrap(),
            unsafety: false,
            recursive: false,
            lines: 5,
        };

        compare_fn("unsafe_param", &unsafe_param, &visit.fns);

        let unsafe_fn = BlockJson::Def {
            params: serde_json::to_value(Params {
                closure_traits: Vec::new(),
                ty_kinds: vec![(false, "Uint".to_string())]
            }).unwrap(),
            ret: serde_json::to_value(Return::default()).unwrap(),
            unsafety: true,
            recursive: false,
            lines: 3,
        };

        let unsafe_json = compare_fn("unsafe_fn", &unsafe_fn, &visit.fns);

        let call_unsafe = BlockJson::Def {
            params: serde_json::to_value(Params {
                closure_traits: Vec::new(),
                ty_kinds: vec![(false, "Uint".to_string())]
            }).unwrap(),
            ret: serde_json::to_value(Return::default()).unwrap(),
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
                closure_traits: Vec::new(),
                ty_kinds: vec![(false, "Adt".to_string())]
            }).unwrap(),
            ret: serde_json::to_value(Return::default()).unwrap(),
            unsafety: false,
            recursive: false,
            lines: 8,
        };

        let loopjson = compare_fn("loopception", &loopception, &visit.fns);
        assert!(visit.loops.contains(&BlockJson::Loop{ def_id: loopjson.clone(), lines: 5, depth: 1}),
            "Loop block not found in {:?}", visit.loops);
        assert!(visit.loops.contains(&BlockJson::Loop{ def_id: loopjson.clone(), lines: 3, depth: 2}),
            "Loop block not found in {:?}", visit.loops);
        assert!(visit.calls[&test_def] == HashMap::from([
            (main_json, 2),
            (loopjson, 1)
        ]));

        let looperoni = BlockJson::Def {
            params: serde_json::to_value(Params {
                closure_traits: Vec::new(),
                ty_kinds: vec![(false, "Adt".to_string())]
            }).unwrap(),
            ret: serde_json::to_value(Return::default()).unwrap(),
            unsafety: false,
            recursive: false,
            lines: 11,
        };

        let looperjson = compare_fn("looperoni", &looperoni, &visit.fns);

        assert!(visit.loops.contains(&BlockJson::Loop{ def_id: looperjson.clone(), lines: 9, depth: 1}),
            "Loop block not found in {:?}", visit.loops);
        assert!(visit.loops.contains(&BlockJson::Loop{ def_id: looperjson.clone(), lines: 3, depth: 2}),
            "Loop block not found in {:?}", visit.loops);

        
        let match_test = BlockJson::Def {
            params: serde_json::to_value(Params {
                closure_traits: Vec::new(),
                ty_kinds: vec![(false, "Uint".to_string())]
            }).unwrap(),
            ret: serde_json::to_value(Return::default()).unwrap(),
            unsafety: false,
            recursive: false,
            lines: 7,
        };

        let match_json = compare_fn("match_test", &match_test, &visit.fns);
        assert!(visit.matches.contains(&BlockJson::Match{ def_id: match_json.clone(), lines: 5, arms: 3, depth: 1}),
            "Match block not found in {:?}", visit.matches);

        let match_point = BlockJson::Def { 
            params: serde_json::to_value(Params {
                closure_traits: Vec::new(),
                ty_kinds: vec![(false, "Adt".to_string())]
            }).unwrap(),
            ret: serde_json::to_value(Return::default()).unwrap(),
            unsafety: false,
            recursive: false,
            lines: 8,
        };

        let pt_json = compare_fn("match_point", &match_point, &visit.fns);
        assert!(visit.loops.contains(&BlockJson::Loop{ def_id: pt_json.clone(), lines: 6, depth: 1}),
            "Loop block not found in {:?}", visit.loops);
        assert!(visit.matches.contains(&BlockJson::Match{ def_id: pt_json, lines: 4, arms: 2, depth: 2}),
            "Match block not found in {:?}", visit.matches);

        let iflet = BlockJson::Def {
            params: serde_json::to_value(Params::default()).unwrap(),
            ret: serde_json::to_value(Return::default()).unwrap(),
            unsafety: false,
            recursive: false,
            lines: 6,
        };

        let iflet_json = compare_fn("iflet", &iflet, &visit.fns);
        assert!(visit.let_exprs.contains(&BlockJson::LetExpr { def_id: iflet_json.clone(), depth: 1 }),
            "Match block not found in {:?}", visit.let_exprs);

        let factorial = BlockJson::Def {
            params: serde_json::to_value(Params {
                closure_traits: Vec::new(),
                ty_kinds: vec![(false, "Uint".to_string())]
            }).unwrap(),
            ret: serde_json::to_value(Return {
                mutabl: false,
                closure_trait: None,
                ty_kind: "Uint".to_string()
            }).unwrap(),
            unsafety: false,
            recursive: true,
            lines: 7,
        };

        compare_fn("factorial", &factorial, &visit.fns);

        let input_math = BlockJson::Def {
            params: serde_json::to_value(Params {
                closure_traits: Vec::new(),
                ty_kinds: vec![(false, "Adt".to_string())]
            }).unwrap(),
            ret: serde_json::to_value(Return::default()).unwrap(),
            unsafety: false,
            recursive: false,
            lines: 3,
        };

        compare_fn("input_math", &input_math, &visit.fns);

        let equal_vecs = BlockJson::Def {
            params: serde_json::to_value(Params::default()).unwrap(),
            ret: serde_json::to_value(Return::default()).unwrap(),
            unsafety: false,
            recursive: false,
            lines: 15,
        };

        let ev_json = compare_fn("equal_vecs", &equal_vecs, &visit.fns);
        assert!(visit.iter_mthds.contains(&BlockJson::Iter { def_id: ev_json.clone(), depth: 1,
            methods: vec!["eq".to_string(), "skip".to_string(), "skip".to_string(), "sum".to_string()]}),
            "Iter block not found in {:?}", visit.iter_mthds);

        let nested_ifs = BlockJson::Def {
            params: serde_json::to_value(Params {
                closure_traits: Vec::new(),
                ty_kinds: vec![(false, "Bool".to_string()), (false, "Bool".to_string())]
            }).unwrap(),
            ret: serde_json::to_value(Return::default()).unwrap(),
            unsafety: false,
            recursive: false,
            lines: 23,
        };

        let nested_json = compare_fn("nested_ifs", &nested_ifs, &visit.fns);
        assert!(visit.let_exprs.contains(&BlockJson::LetExpr { def_id: nested_json.clone(), depth: 3 }));
        assert!(visit.loops.contains(&BlockJson::Loop{ def_id: nested_json.clone(), lines: 6, depth: 2}));
        assert!(visit.iter_mthds.contains(&BlockJson::Iter { def_id: nested_json.clone(), depth: 3, methods: vec!["for_each".to_string()]}));

        let sample_empty = BlockJson::Def {
            params: serde_json::to_value(Params::default()).unwrap(),
            ret: serde_json::to_value(Return::default()).unwrap(),
            unsafety: false,
            recursive: false,
            lines: 1,
        };
        
        compare_fn("mod_test", &sample_empty, &visit.fns);
        compare_fn("other_test", &sample_empty, &visit.fns);
        compare_fn("const_function", &sample_empty, &visit.fns);
        compare_fn("trait_fn", &sample_empty, &visit.fns);

        let async_fn = BlockJson::Def {
            params: serde_json::to_value(Params::default()).unwrap(),
            ret: serde_json::to_value(Return {
                mutabl: false,
                closure_trait: None,
                ty_kind: "Coroutine".to_string()
            }
            ).unwrap(),
            unsafety: false,
            recursive: false,
            lines: 1,
        };
        
        compare_fn("async_function", &async_fn, &visit.fns);
    }
}