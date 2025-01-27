# SALT IDE Plugin

This crate currently provides data for a study of functional and imperial styles in Rust. It is intended to be used internally for the [SALT extension for VS Code](https://marketplace.visualstudio.com/items?itemName=Kale-Lab.salt).

This crate also utilizes `rustc_plugin` for code analysis. The execution in `print_result` is forked from the `print-all-items` example plugin in the `rustc_plugin` repo.

## Output Format

Upon calling this crate on a Rust project, an `HirVisitor` produces the following output.

```rust
struct VisitorJson {
    fns: HashMap<String, BlockJson>,
    loops: Vec<BlockJson>,
    matches: Vec<BlockJson>,
    let_exprs: Vec<BlockJson>,
    iter_mthds: Vec<BlockJson>,
    calls: HashMap<String, HashMap<String, u32>>,
    unsafe_blocks: Vec<BlockJson>,
}
```

## Analysis Breakdown

The `BlockJson` enum serializes data represented gathered by `HirVisitor` to be printed. Most variants contain the following fields:

- `def_id` is a hashed `DefId` of the item/function the block belongs to using `DefaultHasher`.
- `depth` is the number of nested blocks the expression is in (eg. Function level is `depth`=1).
- `lines` is simply the line count of the block.

See `visit_hir.rs` for the implementation.

### Function Definitions

From the input parameters and return values, we observe the `TyKind` variants (eg. Int, Adt, Ref), mutability, and any trait implementations that indicate an anonymous closures (`Fn`, `FnOnce`, and `FnMut`).

Usage of closures in the function interface is a functional paradigm, while `mut` inputs and outputs are more imperative in style.

### Loops

Loops are an imperative style.

### Iter Methods

Iterator methods are functional in style as they replace the need for loops.

### Matches

Pattern matching is a functional paradigm.

### LetExprs

Semantically equivalent to a one-armed match-- specifically, the `if let ... = x` expression, not to be confused with `LetStmt` (eg. `let x = ...` )

### Unsafe Blocks

An unsafe block. Functions do not need to be `unsafe` in their function signature to contain these.

### Calls

A collection of `DefIds` each representing a crate-local function call mapped to a collection of callers location `DefIds` and the count for how many times it was called.

## Installation + Example

Run the example crate like this:

```bash
# assuming working directory is <repo_root>/crates/salt

# install the print-all-items binaries
cargo install --path . 

# run the binaries on an example crate
cd example-crate
cargo salt
```

You should see the output:

```text
{"crate_id":"11573503235230656294","visit_res":{"calls":{},"fns":{"18270091135093349626":{"Def":{"lines":4,"params":{"closure_traits":[],"ty_kinds":[[true,"Uint"],[false,"Uint"]]},"recursive":false,"ret":{"closure_trait":null,"mutabl":false,"ty_kind":"Uint"},"unsafety":false}}},"iter_mthds":[],"let_exprs":[],"loops":[],"matches":[],"unsafe_blocks":[]}}
```