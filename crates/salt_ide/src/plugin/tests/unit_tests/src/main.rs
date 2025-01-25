use std::cell::UnsafeCell;

fn main() {
    test_1();
}

//basic test
fn test_1() {
    loop {
        println!("Hello, world!");
    }
}

//closure input tests
fn impl_closure(f: impl Fn(u64)) -> impl Fn(u64) {
    f(42);
    f
}

fn fn_mut(mut f: impl FnMut(u64)) {}


fn dyna_clos(a: i32, f: Box<dyn FnOnce(i32) -> i32>) -> i32 {
    f(a)
}

//mutability tests
fn mut_ref(x: &mut u64) -> &mut u64 {
    *x = 42;
    x
}

fn mut_val_recurse(mut x: u64) {
    if x < 42 {
        mut_val_recurse(x + 1);
    }
}

fn unsafe_param(x: UnsafeCell<u64>) {
    unsafe {
        *x.get() = 42;
    }
}