//! Compiler plugin for the SALT VS Code extension.

#![feature(rustc_private)]

extern crate rustc_driver;
extern crate rustc_interface;
extern crate rustc_middle;
extern crate rustc_session;

extern crate rustc_hir;
extern crate rustc_span;

pub mod plugin;