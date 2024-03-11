/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from "vscode";
import * as cp from "child_process";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";

// from flowistry
export let cargo_bin = () => {
  let cargo_home = process.env.CARGO_HOME || path.join(os.homedir(), ".cargo");
  return path.join(cargo_home, "bin");
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
  let output;
  try {
    // cargo print-all-items on current project
    exec_notify(
      "cargo",
      ["salt",
      "-- --manifest-path",
      path.join(projectPath, "Cargo.toml")],
      "Printing all items...");
      console.log(output);

  } catch (e: any) {
    context.workspaceState.update("err_log", e);

    return {
      type: "BuildError",
      error: e,
    };
  }

  //   if (no_output) {
  //     return {
  //       type: "output",
  //       value: undefined as any,
  //     };
  //   }

  //   let output_typed: String;
  //   try {
  //     let output_bytes = Buffer.from(output.toString("utf8"), "base64");
  //     //let output_decompressed = zlib.gunzipSync(output_bytes);
  //     let output_str = output_bytes.toString("utf8");
  //     let output_typed = JSON.parse(output_str);
  //   } catch (e: any) {
  //     return {
  //       type: "AnalysisError",
  //       error: e.toString()
  //     };
  //   }

  //     return {
  //       type: "output",
  //       value: output_typed
  //     };
}