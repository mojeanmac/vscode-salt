import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { consentForm, consentFormPersonal, survey, thankYou, quiz, allOrPublic } from "./forms";
import { initStudy } from './extension';
import { isPrivateRepo } from './telemetry_aws';
export { renderConsentForm, renderpublicOnly, renderSurvey, renderQuiz };

/**
  * Renders the consent form
  */
function renderConsentForm(context: vscode.ExtensionContext, logDir: string){
    if (context.globalState.get("participation") === undefined
        || context.globalState.get("participation") === false){
      const panel = vscode.window.createWebviewPanel(
        'form',
        'SALT Study Consent Form',
        vscode.ViewColumn.One,
        {
          enableScripts: true
        }
      );
      panel.webview.html = consentForm;
    
      panel.webview.onDidReceiveMessage(
        message => {
          if (message.text === "yes"){
            context.globalState.update("participation", true);
            initStudy(context);
            renderpublicOnly(context, logDir);
          }
          else {
            context.globalState.update("participation", false);
          }
          panel.dispose();
        }
      );
    }
    else {
      //if already participating, render personal copy
      const panel = vscode.window.createWebviewPanel(
        'form',
        'SALT Study Consent Form',
        vscode.ViewColumn.One
      );
      panel.webview.html = consentFormPersonal;
    }
  }
  
  /**
   * Renders public repo question
   */
  function renderpublicOnly(context: vscode.ExtensionContext, logDir: string){
    const panel = vscode.window.createWebviewPanel(
      'form',
      'All or Public Only',
      vscode.ViewColumn.One,
      {
        enableScripts: true
      }
    );
  
    panel.webview.html = allOrPublic;
  
    panel.webview.onDidReceiveMessage(
      message => {
        if (message.text === "public") {
          vscode.workspace.getConfiguration("salt").update("publicOnly", true, true);
  
          if (vscode.workspace.workspaceFolders) {
            isPrivateRepo(vscode.workspace.workspaceFolders[0].uri.fsPath).then((isPrivate) => {
              context.workspaceState.update("enabled", !isPrivate);
          });
          }
        }
        renderSurvey(context, logDir);
        panel.dispose();
      }
    );
  }
  
  /**
   * Renders the survey
   */
  function renderSurvey(context: vscode.ExtensionContext, logDir: string){
    const panel = vscode.window.createWebviewPanel(
      'form',
      'SALT Survey',
      vscode.ViewColumn.One,
      {
        enableScripts: true
      }
    );
  
    panel.webview.html = survey;
  
    panel.webview.onDidReceiveMessage(
      message => {
        console.log(message.text);
        context.globalState.update("survey", message.text);
        renderQuiz(context, logDir);
        //write to latest log
        const fileCount = fs.readdirSync(logDir).filter(f => path.extname(f) === ".json").length;
        const logPath = path.join(logDir, `log${fileCount}.json`);
        fs.writeFileSync(logPath, JSON.stringify({survey: message.text}) + '\n', {flag: 'a'});
        panel.dispose();
      }
    );
  }
  
  function renderQuiz(context: vscode.ExtensionContext, logDir: string){
    const panel = vscode.window.createWebviewPanel(
      'form',
      'SALT Quiz',
      vscode.ViewColumn.One,
      {
        enableScripts: true
      }
    );
  
    panel.webview.html = quiz;
    const fileCount = fs.readdirSync(logDir).filter(f => path.extname(f) === ".json").length;
    const logPath = path.join(logDir, `log${fileCount}.json`);
    panel.webview.onDidReceiveMessage(
      message => {
        if (message.command === "submitForm"){
          context.globalState.update("quiz", message.value);
          //write to latest log
          fs.writeFileSync(logPath, JSON.stringify({quizComplete: message.value}) + '\n', {flag: 'a'});
          panel.webview.html = thankYou;
        }
        else if (message.command === "stateChange") {
          fs.writeFileSync(logPath, JSON.stringify({quizUpdate: message.value}) + '\n', {flag: 'a'});
        }
      }
    );
  }