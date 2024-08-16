// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { helloWorldCommand } from './commands/helloWorld';
import { enableRecommendedExtensionsCommand } from './commands/enableRecommendedExtensions';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(helloWorldCommand());
	context.subscriptions.push(enableRecommendedExtensionsCommand());
}

// This method is called when your extension is deactivated
export function deactivate() {}
