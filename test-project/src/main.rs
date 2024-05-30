// Tests using a combination of pattern features has the expected borrow checking behavior
#![feature(box_patterns)]
#![allow(warnings)]
#![feature(rustc_attrs)]

mod easy;
mod region_point;
mod rust;

// ==== E373: add move to closure (all) ====
fn e373() -> Box<dyn Fn(u32) -> u32> {
    let x = 0u32;
    let z = 1u32;
    let yy = "warning";
    Box::new(|y| x + y + z)
}

fn e373_thread() {
    let x = 0u32;
    let y = 1u32;

    let _thr = std::thread::spawn(|| x + y);
}

// ==== E382: used after move (done) ====
fn e382() {
    struct MyStruct {
        s: u32,
    }
    let mut x = MyStruct { s: 5u32 };
    let _y = x;
    x.s = 6;
    //println!("{}", x.s);

    let mut arr = vec![1, 3, 4];
    let _brr = arr;
    arr[0] = 2;
    println!("{}", arr[1]);
}

// ==== E507: borrowed value moved out ====
use std::cell::RefCell;
struct TheDarkKnight;
impl TheDarkKnight {
    fn nothing_is_true(self) {}
}

fn e507() {
    let x = RefCell::new(TheDarkKnight);
    x.borrow().nothing_is_true();
}

// ==== E508: move out of array ====
fn e508() {
    struct NonCopy;
    let array = [NonCopy; 1];
    let _value = array[0];
}

// ==== E597: dropped while borrowed (started) ====
struct Foo<'a> {
    x: Option<&'a u32>,
}

fn e597() {
    let mut x = Foo { x: None };
    {
        let y = 0;
        x.x = Some(&y);
    }
    println!("{:?}", x.x);
}

// ==== E713: drop ====
pub struct S<'a> {
    data: &'a mut String,
}
impl<'a> Drop for S<'a> {
    fn drop(&mut self) {
        self.data.push_str("being dropped");
    }
}

fn e713<'a>(s: S<'a>) -> &'a mut String {
    let p = &mut *s.data;
    p
}

// ==== E716: temp value dropped ====
fn e716() {
    fn foo() -> i32 {
        22
    }
    fn bar(x: &i32) -> &i32 {
        x
    }
    let p = bar(&foo());
    let _q = *p;
}

fn autoderef(asdf: &mut i32) {
    asdf = 0i32.wrapping_add(1);
    let a = 1;
}

// ==========
fn main() {}
