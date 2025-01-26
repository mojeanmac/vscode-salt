#![allow(warnings)]
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

//unsafe tests
unsafe fn unsafe_fn(y: u64) {
    println!("unsafe");
}

fn call_unsafe(y: u64) {
    unsafe {
        unsafe_fn(42);
    }
}

fn susafe() {
    unsafe {
        unsafe {
            
        }
    }
}

//iterate over 2d vector
fn loopception(v: Vec<Vec<u64>>) {
    for i in v.iter() {
        for j in i.iter() {
            //
        }
    }
    loop{loop{loop{}}}
}

fn looperoni(v: Vec<Vec<u64>>) {
    for i in v.iter() {
        let mut x = 0;
        for j in i.iter() {
            x += 1;
        }
        for j in i.iter() {
            x -= 1;
        }
    }
}