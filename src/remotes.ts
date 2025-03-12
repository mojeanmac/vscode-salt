import * as path from "path";
import * as fs from "fs";
import axios from "axios";
import { Octokit } from '@octokit/rest';
import simpleGit from 'simple-git';
import { deflate } from 'zlib';

export { sendPayload, sendBackup, isPrivateRepo, lastFetch };

/**
 * Sends the current log to write-only endpoint
 * @param logPath - path to the log file
 * @param uuid - the unique identifier for the user
 * @param logCount - the current log number
 * @returns true if the log was sent successfully, false otherwise
*/
async function sendPayload(logPath: string, uuid: string, logCount: number): Promise<boolean>{

    const lambdaEndpoint = "https://eszhueee2i.execute-api.us-west-1.amazonaws.com";
    try {
        const data = fs.readFileSync(logPath, 'utf-8');
        const compressedData = await compressData(data);

        const dataToUpdate = {
            table: "SALT-fp-vs-oop",
            uuid: uuid,
            logNum: logCount,
            data: compressedData,
        };
        const response = await axios.put(lambdaEndpoint, dataToUpdate);
        console.log("Log sent: ", response.data);
        return true;
    }
    catch (e) {
        console.log(e);
        console.log("Error sending log");
        return false;
    }
};


/**
 * For recovering logs (artifact of migration from Azure)
 * @param startOn - the log number to start on
 * @param logDir - path to log directory
 * @param uuid - the unique identifier for the user
 * @returns resolves to 0 if all logs were sent successfully, otherwise the log number that failed
 */
async function sendBackup(startOn: number, logDir: string, uuid: string): Promise<number> {
    const logFiles = fs.readdirSync(logDir).filter(f => path.extname(f) === ".json");
    for (let i = startOn; i <= logFiles.length; i++) {
        const logPath = path.join(logDir, `log${i}.json`);
        const result = await sendPayload(logPath, uuid, i);
        if (!result) {
            return i; // Return count of the log that failed to send
        }
    }
    return 0; //0 if all succeeded
}

/**
 * Compress data before sending to server
 * @param data log text to compress
 * @returns compressed data in base64 format
 */
function compressData(data: string): Promise<string> {
    return new Promise((resolve, reject) => {
        deflate(data, (err, buffer) => {
            if (err) {
                reject(err);
            } else {
                resolve(buffer.toString('base64'));
            }
        });
    });
}

/**
 * Checks if the current workspace is a public github repo
 * @param workspacePath path to the workspace
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
            const response = await octokit.repos.get({owner, repo});
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

/**
 * Check when .git/FETCH_HEAD was last updated
 */
async function lastFetch(workspacePath: string): Promise<null | number> {
    const fetchHeadPath = path.join(workspacePath, '.git', 'FETCH_HEAD');
    try {
        const stats = fs.statSync(fetchHeadPath);
        return Math.floor(stats.mtime.getTime() / 1000);
    } catch {
        return null;
    }
}