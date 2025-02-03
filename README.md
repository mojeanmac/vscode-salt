# SALT for Rust!

![saltLogo](https://github.com/mojeanmac/vscode-salt/blob/master/assets/salt.png?raw=true)

## Situationally Adaptive Language Tutor (SALT)

[VS Code Extension Marketplace Link](https://marketplace.visualstudio.com/items?itemName=Kale-Lab.salt)

Researchers at the University of California, San Diego are conducting a study on Rust errors, programming paradigmns, and how we can help make it easier to learn Rust. We have developed a free Visual Studio Code extension, SALT, which includes features that may be helpful while you’re learning Rust, such as REVIS, a borrowing and ownership error visualizer. If you grant permission, the extension can also send us data regarding the programming paradigms you use and the errors you’ve experienced while compiling Rust code; we plan to use that information to evaluate the impact of our extension as well as to give you feedback on your progress.

## How to participate in the study

Anyone age 18 or older at any level of programming experience may participate in this study, however participation is not necessary to use the tools in this extension. The first time you open a Rust project, you will recieve the consent form in a Webview. The consent form can be accessed at any time via the command `salt.renderConsentForm`.
You may opt-out of the study by going to the extension settings and disabling `salt.errorLogging`. Re-enable it at any time to opt back in!

## Log Generation

Custom logs are generated to minimize privacy concern and are enabled after you agree to participate in the study. A live trace of logs can be viewed in the `SALT-logger` Output Channel.
You are given the choice whether you want to allow reporting data for all workspaces or only those belonging to public github repositories.
Logs are stored locally and sent in intervals.

There are three types of inferences we gather that are explained below:

### Compiler Errors

As part of an ongoing study of errors, we observe data about the diagnostics related to your compiler errors.

```json
{
    "file": (hash of file name),
    "workspace": (hash of workspace name),
    "time": (time since initialization),
    "revis": (if revis is activated),
    "errors": {[
        "code": (the rustc error code),
        "msg": (hash of the err msg),
        "source": (from rustc or rust-analyzer),
        "hint": (if matches `consider adding _` pattern),
        "range": (start and end range of errors)
    ]}
}
```

### Programming Paradigms

As of Februrary 2025, we have begun a study of usable programming paradigms in Rust! This involves installing our crate [`salt_ide`](https://crates.io/crates/salt_ide) and running it with the `nightly` toolchain of Rust, which is done automatically.

The output allows us to identify imperative and functional styles of Rust.
A more detailed description can be found at [`crates/salt_ide/README.md`](./crates/salt_ide/README). Function names are hashed and types are identified by their [`TyKind`](https://doc.rust-lang.org/beta/nightly-rustc/rustc_middle/ty/sty/type.TyKind.html).

```json
{
    "file": (hash of file name),
    "lastFetchRel": (if applicable, relative time of last pull/fetch),
    "saveCount": (number of saves this session),
    "numfiles": (number of rs files in workspace),
    "result": {
        "fns": (hashmap of relevant function data),
        "loops": (location and depth of loops),
        "matches": (location and depth of matches),
        "let_exprs": (`if let` patterns),
        "iter_mthds": (methods on iterators),
        "calls": (function calls and contexts),
        "unsafe_blocks": (location of unsafe blocks),
    }
}
```

### Save Actions

Save actions can provide intermediate data about activity when there are no diagnostics or the crate is not active. One of these inferences is whether copilot is installed and enabled in the current workspace.

```json
{
    "file": (hash of file name),
    "savedAt": (time since initialization),
    "saveCount": (number of saves this session),
    "length": (linecount of current file),
    "copilotStatus": (if copilot is enabled),
}
```


## Current features

### REVIS

REVIS visualizes lifetime-related Rust compiler errors.
This extension focuses on errors with a "timeline" that can be visualized.
![example](https://github.com/mojeanmac/vscode-salt/blob/master/assets/example597.png?raw=true)


## Requirements

The extension needs the diagnostics information from rust-analyzer.
Install the VSCode extension [rust-analyzer][] and add the following to `settings.json`:
```
"rust-analyzer.diagnostics.useRustcErrorCode": true
```
The configuration can be automatically set when you use the extension for the first time.
Just click "Allow" when the warning prompt appears.
The configuration will be added to `.vscode/settings.json` under the project root.

[rust-analyzer]: https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer

## How to use REVIS

Right-pointing red triangles will be displayed for supported errors after the source file is saved.
To display/hide the visualization, **move the text cursor to the line** with the red triangle.
To clear all visualizations, execute command `salt.clearAllVisualizations`.
To refresh the visualizations, save the current file.

### Installations Needed
Axios: use `npm install axios`

## Note

This extension is still in an early stage. Please file an issue or contact  Molly (mmaclaren@ucsd.edu) if you find any bugs/confusing points.
