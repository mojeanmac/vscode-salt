
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

fn fn_mut(mut f: impl FnMut(u64)) {
    
}


fn dyna_clos(a: i32, f: Box<dyn Fn(i32) -> i32>) -> i32 {
    f(a)
}