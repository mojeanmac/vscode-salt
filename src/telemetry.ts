import * as path from "path";
import TelemetryReporter from '@vscode/extension-telemetry';
import * as fs from "fs";
import axios from "axios";
import { error } from "console";
import * as crypto from 'crypto';

export { openNewLog, openExistingLog, sendTelemetry, newReporter, sendPayload};
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
    //sendPayload();
}

/**
 * EXAMPLE REQUEST PAYLOAD
 {
  "routeKey": "PUT",

  "requestContext": {
    "apiId": "<urlid>",
    "authentication": null,
    "domainName": "<url-id>.lambda-url.us-west-2.on.aws",
    "domainPrefix": "<url-id>",
    "requestId": "id",
    "routeKey": "PUT",
    "time": "12/Mar/2020:19:03:58 +0000",
    "timeEpoch": 1583348638390
  },
  "body": "{\"PID\": 1, \"file\": \"fileName\", \"seconds\": 20, \"revis\": true, \"errors\": {\"error1\": \"bad\", \"error2\": \"also bad\"}}"
}
 */

// declares payload type for setupPayload

interface Request {
    routeKey: string;
    requestContext: RequestContext;
    body: string;
}

interface RequestContext {
    apiId: string;
    authentication: null;
    domainName: string;
    domainPrefix: string;
    requestId: string;
    routeKey: string;
    time: string;
    timeEpoch: string;

};

interface Payload {
    /**
    routeKey: string;
    requestContext: RequestContext;
    body: string;
    */
   UID: string;
   time: number;
   file: string;
   //seconds: number;
   //revis: Boolean;
   //errors: string[];

};
// setup payload for lamdba request
function setupRequest(logPath: string){
    /*
    const newPayload: Payload = {
        file: "hello",
        seconds: 3,
        revis: true,
        errors: ["1", "2"],
    };
    */
    const newPayload: Payload = {
        UID: crypto.randomBytes(16).toString('hex'),
        time: Date.now(),
        file: fs.readFileSync(logPath, 'utf-8'),
    };

    const newRequestContext: RequestContext = {
        apiId: "apId",
        authentication: null,
        domainName: "domainName",
        domainPrefix: "domainPrefix",
        requestId: "requestId",
        routeKey: "routeKey",
        time: "time",
        timeEpoch: "timeEpoch",
    };

    const newRequest: Request = {
        routeKey: "PUT",
        requestContext: newRequestContext,
        body: JSON.stringify(newPayload),
    };

    return newRequest;
    /*
    //TODO: fill these all in
    const newRequestContext: RequestContext{
        apiId: string;
        authentication: null;
        domainName: string;
        domainPrefix: string;
        requestId: string;
        routeKey: string;
        time: string;
        timeEpoch: string;
        body: string;
    }
    const newPayload: Payload{
        routeKey: string;
        requestContext: newRequestContext;
        body: string;
    }
    */
};

// call payload function and invoke function url for lambda
async function sendPayload(logPath: string){
    //https://7delql7euqyrarlrvweg7lvj6q0inckj.lambda-url.us-west-1.on.aws/
    /*
    const functionURL = "https://7delql7euqyrarlrvweg7lvj6q0inckj.lambda-url.us-west-1.on.aws/";
    /*
    fetch(functionURL, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    
    const data = setupRequest();
    
    axios.put(functionURL, data)
        .then(response => {
            console.log('Response Data:', response.data);
        })
        .catch(error => {
            console.error('Error:', error);
        });
    */

    const lambdaEndpoint = "https://7delql7euqyrarlrvweg7lvj6q0inckj.lambda-url.us-west-1.on.aws/";
    const dataToUpdate = setupRequest(logPath);
    try {
        const response = await axios.put(lambdaEndpoint, dataToUpdate);
        console.log("response yay it worked: ", response.data);
    }
    catch (error) {
        console.error("there's an error:", error);
        throw error;
    }
};