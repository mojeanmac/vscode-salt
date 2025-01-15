fn closure_param(f: impl Fn(u64)) {
    f(42);
}