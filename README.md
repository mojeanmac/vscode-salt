# SALT for Rust!

![saltLogo](https://github.com/mojeanmac/vscode-salt/blob/master/assets/salt.png?raw=true)

## Situationally Adaptive Language Tutor (SALT)

[VS Code Extension Marketplace Link](https://marketplace.visualstudio.com/items?itemName=Kale-Lab.salt)

Researchers at the University of California, San Diego are conducting a research study on Rust errors and how we can help make it easier to learn Rust. We have developed a free Visual Studio Code extension, SALT, which includes features that may be helpful while you’re learning Rust, such as REVIS, a borrowing and ownership error visualizer. If you grant permission, the extension can also send us data regarding the errors you’ve experienced while compiling Rust code; we plan to use that information to evaluate the impact of our extension as well as to give you feedback on your progress.

## Current features

### REVIS

REVIS visualizes lifetime-related Rust compiler errors.
This extension focuses on errors with a "timeline" that can be visualized.
![example](https://github.com/mojeanmac/vscode-salt/blob/master/assets/example597.png?raw=true)

### Error Logging

Custom error logs are generated to minimize privacy concern and only start after you provide consent. A live trace of errors being logged can be viewed in the `SALT-logger` Output Channel.

A log entry is created every time a Rust project is built, following the JSON object format of:
```
entry: {
    file: [hashed file name],
    seconds: [time since initialization],
    revis: [boolean if REVIS was toggled on], 
    errors: {
        code: [error code],
        msg: [hashed message],
        source: [rustc or rust-analyzer],
        range: {
            start: [starting line num],
            end: [ending line num]
        }
    }
}
```

Logs are stored locally and are sent in intervals for analysis. After enough data has been gathered, we plan to provide users with evaluations of their progress in encountering and debugging errors!

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

## How to join the study

Anyone age 18 or older at any level of programming experience may participate in this study, however participation is not necessary to use the tools in this extension. The first time you open a Rust project, you will recieve the consent form in a Webview. After agreeing, you'll be asked to complete a short survey about your experience in programming. Both the consent form and the survey can be accessed at any time via the commands `salt.renderConsentForm` and `salt.renderSurvey`.
You may opt-out of the study by going to the extension settings and disabling `salt.errorLogging`. Re-enable it at any time to opt back in!

## How to use REVIS

Right-pointing red triangles will be displayed for supported errors after the source file is saved.
To display/hide the visualization, **move the text cursor to the line** with the red triangle and execute command `salt.toggleVisualization` or use the keyboard shortcut **<kbd>Ctrl+Shift+V</kbd>**.
To clear all visualizations, execute command `salt.clearAllVisualizations`.
To refresh the visualizations, save the current file.

## Note

This extension is still in an early stage. Please file an issue or contact  Molly (mmaclaren@ucsd.edu) if you find any bugs/confusing points.
