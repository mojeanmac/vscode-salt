/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from "vscode";
import * as cp from "child_process";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";

// declare const TOOLCHAIN: {
//   channel: string;
//   components: string[];
// };
const TOOLCHAINCHANNEL = "nightly-2024-01-24";
type Result<T> = { Ok: T } | { Err: String };

/* eslint no-undef: "off" */
const LIBRARY_PATHS: Partial<Record<NodeJS.Platform, string>> = {
  darwin: "DYLD_LIBRARY_PATH",
  win32: "LIB",
};

// from flowistry
export let cargo_bin = () => {
  let cargo_home = process.env.CARGO_HOME || path.join(os.homedir(), ".cargo");
  return path.join(cargo_home, "bin");
};

export const get_opts = async (cwd: string) => {
  const rustc_path = await exec_notify(
    "rustup",
    ["which", "--toolchain", TOOLCHAINCHANNEL, "rustc"],
    "Waiting for rustc..."
  );
  const target_info = await exec_notify(
    rustc_path,
    ["--print", "target-libdir", "--print", "sysroot"],
    "Waiting for rustc..."
  );

  const [target_libdir, sysroot] = target_info.split("\n");
  // console.log("Target libdir:", target_libdir);
  // console.log("Sysroot: ", sysroot);

  const library_path = LIBRARY_PATHS[process.platform] || "LD_LIBRARY_PATH";

  const PATH = cargo_bin() + ";" + process.env.PATH;

  return {
    cwd,
    [library_path]: target_libdir,
    SYSROOT: sysroot,
    RUST_BACKTRACE: "1",
    PATH,
  };
};

let exec_notify_binary = async (
  cmd: string,
  args: string[],
  title: string,
  opts?: any
): Promise<Buffer> => {
  console.log("Running command: ", [cmd, ...args].join(" "));

  let proc = cp.spawn(cmd, args, opts);

  let stdoutChunks: Buffer[] = [];
  proc.stdout.on("data", (data) => {
    stdoutChunks.push(data);
  });

  let stderrChunks: string[] = [];
  proc.stderr.setEncoding("utf8");
  proc.stderr.on("data", (data) => {
    console.log(data);
    stderrChunks.push(data);
  });

  //globals.status_bar.set_state("loading", title);

  return new Promise<Buffer>((resolve, reject) => {
    proc.addListener("close", (_) => {
      //globals.status_bar.set_state("idle");
      if (proc.exitCode !== 0) {
        reject(stderrChunks.join(""));
      } else {
        resolve(Buffer.concat(stdoutChunks));
      }
    });
    proc.addListener("error", (e) => {
      //globals.status_bar.set_state("idle");
      reject(e.toString());
    });
  });
};

export let exec_notify = async (
  cmd: string,
  args: string[],
  title: string,
  opts?: any
): Promise<string> => {
  let buffer = await exec_notify_binary(cmd, args, title, opts);
  let text = buffer.toString("utf8");
  return text.trimEnd();
};

export async function printAllItems(context: vscode.ExtensionContext) {
  // get current project directory
  let folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    console.log("No folders exist");
    return null;
  }

  // want to replace with a func like findWorkspaceRoot
  let projectPath = folders[0].uri.fsPath;

  //check if binary is installed first!
  if(!fs.existsSync(path.join(cargo_bin(), "cargo-salt"))){
    // install binary
    exec_notify(  // flowistry actually downloads the crate from crates.io!!
      "cargo",
      ["install","--path", "./crates/salt"],
      "Installing crates...");
  }

  let opts = await get_opts(projectPath);

    let output;
    try {
      output = await exec_notify(
        "cargo",
        ["salt"],
        "Printing all items...",
        opts
      );
      console.log(output);
      return output;
    } catch (e: any) {
      console.log(e);
      return e;
    }
}
//TODO:
//locate cargo.toml, can't assume it's in project root
//improve error handling