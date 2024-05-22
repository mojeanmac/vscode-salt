import * as path from "path";
import * as fs from "fs";
import axios from "axios";
import { Octokit } from '@octokit/rest';
import simpleGit from 'simple-git';

export { openNewLog, openExistingLog, sendPayload, sendBackup, isPrivateRepo};

/**
 * Opens an existing log file
 * @param logDir - directory to store logs
 * @param enableExt - whether the extension is enabled
 * @param timeSinceStart - the time since the extension was enabled
 * @returns path of current log, line count, and the stream
 */
function openExistingLog(logDir: string, enableExt: boolean, timeSinceStart: number): [string, number, number, fs.WriteStream]{
    //find how many json files are in folder to determine current log #
    let fileCount = fs.readdirSync(logDir)
        .filter(f => path.extname(f) === ".json").length;
    const logPath = path.join(logDir, `log${fileCount}.json`);

    //timesincestart = (initialStamp - startDate)
    fs.writeFileSync(logPath, JSON.stringify({extensionReload: {studyEnabled: enableExt, timeSinceStart: timeSinceStart}}) + '\n', {flag: 'a'});
    let linecnt = fs.readFileSync(logPath, 'utf-8').split('\n').length;
    //create new stream
    const stream = fs.createWriteStream(logPath, {flags: 'a'});

    return [logPath, fileCount, linecnt, stream];
}

/**
 * Creates a new log file
 * @param logDir - directory to store logs
 * @param enableExt - whether the extension is enabled
 * @param uuid - the unique identifier for the user
 * @returns path of current log, line count, and the stream
 */
function openNewLog(logDir: string, enableExt: boolean, uuid: string): [string, number, number, fs.WriteStream]{
    let fileCount = fs.readdirSync(logDir)
        .filter(f => path.extname(f) === ".json").length;

    fileCount++; //we are creating a new file, so increment the count
    const logPath = path.join(logDir, `log${fileCount}.json`);

    fs.writeFileSync(logPath, JSON.stringify({logCount: fileCount, uuid: uuid, studyEnabled: enableExt}) + '\n', {flag: 'a'});
    let linecnt = 0;

    const stream = fs.createWriteStream(logPath, {flags: 'a'});
    return [logPath, fileCount, linecnt, stream];
}

/**
 * Sends the current log to the server
 * @param logPath - path to the log file
 * @param uuid - the unique identifier for the user
 * @param logCount - the current log number
 * @returns true if the log was sent successfully, false otherwise
*/
async function sendPayload(logPath: string, uuid: string, logCount: number): Promise<boolean>{

    const lambdaEndpoint = "https://eszhueee2i.execute-api.us-west-1.amazonaws.com";
    const dataToUpdate = {
        uuid: uuid,
        logNum: logCount,
        data: fs.readFileSync(logPath, 'utf-8'),
    };
    try {
        const response = await axios.put(lambdaEndpoint, dataToUpdate);
        console.log("Log sent: ", response.data);
        return true;
    }
    catch {
        console.log("Error sending log");
        return false;
    }
};


/**
 * One time function to send all logs in the log directory
 * @param logDir - path to log directory
 * @param uuid - the unique identifier for the user
 * @returns promise that resolves to true if all logs were sent successfully, false otherwise
 */
async function sendBackup(logDir: string, uuid: string): Promise<boolean> {
    const lambdaEndpoint = "https://eszhueee2i.execute-api.us-west-1.amazonaws.com";
    for (let i = 1; i <= fs.readdirSync(logDir).length; i++) {
        const logPath = path.join(logDir, `log${i}.json`);
        try {
            sendPayload(logPath, uuid, i);
        }
        catch {
            return false;
        }
    }
    return true;
}

/**
 * Checks if the current workspace is a public github repo
 * @param workspacePath - path to the workspace
 * @returns true if the workspace is verified to be public, false otherwise
 */
async function isPrivateRepo(workspacePath: string): Promise<boolean> {
    const git = simpleGit(workspacePath);
    try {
        const remote = await git.getRemotes(true);
        if (remote.length === 0 || remote === null) { //no git remotes
            console.log("No remotes");
            return true;
        }
        const owner = remote[0].refs.fetch.split('/')[3];
        const repo = remote[0].refs.fetch.split('/')[4].replace(".git", "");
        const octokit = new Octokit();
        try {
            const response = await octokit.repos.get({owner: owner , repo: repo});
            console.log("isPrivate:", response.data.private);
            return response.data.private;
        }
        catch {
            console.log("isPrivate:", true);
            return true;
        }
    }
    catch {
        console.log("isPrivate:", true);
        return true;
    }
}