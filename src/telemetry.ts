import * as path from "path";
import TelemetryReporter from '@vscode/extension-telemetry';
import * as fs from "fs";

export { openNewLog, openExistingLog, sendTelemetry, newReporter };
const key = "cdf9fbe6-bfd3-438a-a2f6-9eed10994c4e"; //use this key for development
//const key = "0cddc2d3-b3f6-4be5-ba35-dcadf125535c";
  
//launches a telemetry reporter
function newReporter(): TelemetryReporter{
    return new TelemetryReporter(key);
}

/**
 * Opens an existing log file
 * @returns path of current log, line count, and the stream
 */
function openExistingLog(logDir: string, enableExt: boolean, timeSinceStart: number): [string, number, fs.WriteStream]{
    //find how many json files are in folder to determine current log #
    let fileCount = fs.readdirSync(logDir)
        .filter(f => path.extname(f) === ".json").length;
    const logPath = path.join(logDir, `log${fileCount}.json`);

    //timesincestart = (initialStamp - startDate)
    fs.writeFileSync(logPath, JSON.stringify({extensionReload: {studyEnabled: enableExt, timeSinceStart: timeSinceStart}}) + '\n', {flag: 'a'});
    let linecnt = fs.readFileSync(logPath, 'utf-8').split('\n').length;
    //create new stream
    const stream = fs.createWriteStream(logPath, {flags: 'a'});

    return [logPath, linecnt, stream];
}

/**
 * Creates a new log file
 * @returns path of current log, line count, and the stream
 */
function openNewLog(logDir: string, enableExt: boolean, uuid: string): [string, number, fs.WriteStream]{
    let fileCount = fs.readdirSync(logDir)
        .filter(f => path.extname(f) === ".json").length;

    fileCount++; //we are creating a new file, so increment the count
    const logPath = path.join(logDir, `log${fileCount}.json`);

    fs.writeFileSync(logPath, JSON.stringify({uuid: uuid, logCount: fileCount, studyEnabled: enableExt}) + '\n', {flag: 'a'});
    let linecnt = 0;

    const stream = fs.createWriteStream(logPath, {flags: 'a'});
    return [logPath, linecnt, stream];
}

/**
 * Sends the log file to the server
 * @param logPath path of log file
 * @param reporter telemetry reporter
 */
function sendTelemetry(logPath: string, reporter: TelemetryReporter){
    const data = fs.readFileSync(logPath, 'utf-8');
    reporter.sendTelemetryEvent('errorLog', {'data': data});
}