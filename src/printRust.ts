//file forked from https://github.com/willcrichton/flowistry/blob/master/ide/src/setup.ts
/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from "vscode";
import * as cp from "child_process";
import * as os from "os";
import * as path from "path";
import * as _ from "lodash";

const CRATE_VERSION = "0.1.0";
const CHANNEL = "nightly-2024-12-01";
const COMPONENTS = ["clippy", "rust-src", "rustc-dev", "llvm-tools-preview"];
type Result<T> = { Ok: T } | { Err: String };

/* eslint no-undef: "off" */
const LIBRARY_PATHS: Partial<Record<NodeJS.Platform, string>> = {
  darwin: "DYLD_LIBRARY_PATH",
  win32: "LIB",
};

export const get_opts = async (cwd: string) => {
  const rustc_path = await exec_notify(
    "rustup",
    ["which", "--toolchain", CHANNEL, "rustc"],
    "Waiting for rustc..."
  );
  const target_info = await exec_notify(
    rustc_path,
    ["--print", "target-libdir", "--print", "sysroot"],
    "Waiting for rustc..."
  );

  const [target_libdir, sysroot] = target_info.split("\n");

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

export let cargo_bin = () => {
  let cargo_home = process.env.CARGO_HOME || path.join(os.homedir(), ".cargo");
  return path.join(cargo_home, "bin");
};

export let cargo_command = (): [string, string[]] => {
  let cargo = "cargo";
  let toolchain = `+${CHANNEL}`;
  return [cargo, [toolchain]];
};

let findWorkspaceRoot = async (): Promise<string | null> => {
  let folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    console.log("No folders exist");
    return null;
  }

  let hasCargoToml = async (dir: string) => {
    let manifestPath = path.join(dir, "Cargo.toml");
    let manifestUri = vscode.Uri.file(manifestPath);
    try {
      await vscode.workspace.fs.stat(manifestUri);
      return true;
    } catch (e) {
      return false;
    }
  };

  let folderPath = folders[0].uri.fsPath;
  if (await hasCargoToml(folderPath)) { return folderPath; }

  let activeEditor = vscode.window.activeTextEditor;
  if (!activeEditor) {
    console.log("No active editor exists");
    return null;
  }

  let activeFilePath = activeEditor.document.fileName;
  console.log(`Looking for workspace root between ${folderPath} and ${activeFilePath}`);

  let components = path.relative(folderPath, activeFilePath).split(path.sep);
  let folderSubdirTil = (idx: number) =>
    path.join(folderPath, ...components.slice(0, idx));
  let prefixHasToml = await Promise.all(
    _.range(components.length).map((idx) => ({
      idx,
      has: hasCargoToml(folderSubdirTil(idx)),
    }))
  );
  let entry = prefixHasToml.find(({ has }) => has);
  if (entry === undefined) { return null; }

  return folderSubdirTil(entry.idx);
};

export async function printInfers(context: vscode.ExtensionContext): Promise<object>  {
  let workspace_root = await findWorkspaceRoot();
  if (!workspace_root) {
    console.log("Failed to find workspace root");
    return { error: "Failed to find workspace root" };
  }
  console.log("Workspace root", workspace_root);

  let [cargo, cargo_args] = cargo_command();

  // check if salt_ide is installed/up to date
  let version;
  try {
    version = await exec_notify(
      cargo,
      [...cargo_args, "salt", "-V"],
      "Checking version...",
      { cwd: workspace_root }
    );
  } catch (e) {
    version = "";
  }

  if (version !== CRATE_VERSION) {
    // install latest nightly + binary
    let components = COMPONENTS.map((c) => ["-c", c]).flat();
    try{
      await exec_notify(
        "rustup",
        [
          "toolchain",
          "install",
          CHANNEL,
          "--profile",
          "minimal",
          ...components,
        ],
        "Installing nightly Rust..."
      );
    } catch (e: any) {
      return { error: "Failed to install nightly Rust" };
    }
    try {
      await exec_notify(
        cargo,
        [ ...cargo_args,
          "install",
          "salt_ide",
          "--version", CRATE_VERSION,
          "--force",
          "--locked"],
        "Installing salt_ide..."
      );
      // await exec_notify(
      //   cargo,
      //   [ "install",
      //     "--path", "../crates/salt_ide"
      //   ],
      //   "Installing salt_ide..."
      // );
    } catch (e: any) {
      return { error: "Failed to install salt_ide" };
    }
  }

  let opts = await get_opts(workspace_root);

  let output;
  try {
    output = await exec_notify_binary(
      cargo,
      [...cargo_args, "salt"],
      "Printing all items...", 
      opts
    );
    let output_str = output.toString("utf8");
    console.log(output_str);
    return JSON.parse(output_str);
  } catch (e: any) {
    return { error: "Failed to run salt_ide"};
  }
}