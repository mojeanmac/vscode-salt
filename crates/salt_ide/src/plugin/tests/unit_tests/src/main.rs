#![allow(warnings)]
use std::cell::UnsafeCell;

fn main() {
    test_1();
}

//basic test
fn test_1() {
    while false {
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

//iterate over 2d vectors
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

//match tests
fn match_test(x: u64) {
    match x {
        0 => println!("zero"),
        1 => println!("one"),
        _ => println!("other"),
    }
}

fn iflet() {
    let x = Some(5);
    if let Some(y) = x {
        println!("{}", y);
    }
}

//struct test
struct Math;

impl Math {
    fn factorial(n: u32) -> u32 {
        if n == 0 {
            1
        } else {
            n * Math::factorial(n - 1)
        }
    }
}

fn input_math(math: Math) {
    return
}

//iter method tests
fn equal_vecs() {
    let vec1 = vec![1, 2, 3, 4, 5, 6];
    let vec2 = vec![9, 8, 3, 4, 5, 6];

    let result = vec1
    .iter()
    .skip(2)
    .eq(vec2
        .iter()
        .skip(2));

    let test: usize = vec2.clone().iter().sum();

    println!("{:?}", result);
}