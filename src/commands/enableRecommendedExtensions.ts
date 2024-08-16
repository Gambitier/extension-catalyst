import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Command } from '../types/command.enum';

async function findWorkspaceFiles(): Promise<string[]> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage('No workspace folder found.');
        return [];
    }

    const workspaceFiles: string[] = [];
    for (const folder of workspaceFolders) {
        const folderPath = folder.uri.fsPath;
        const files = await vscode.workspace.findFiles(new vscode.RelativePattern(folderPath, '**/*.code-workspace'), '**/node_modules/**');
        files.forEach(file => workspaceFiles.push(file.fsPath));
    }

    return workspaceFiles;
}

async function getRecommendedExtensionsFromWorkspaceFile(workspaceFile: string): Promise<string[]> {
    try {
        const workspaceContent = fs.readFileSync(workspaceFile, 'utf-8');
        const workspaceConfig = JSON.parse(workspaceContent);
        return workspaceConfig?.extensions?.recommendations || [];
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to read workspace file: ${workspaceFile}`);
        return [];
    }
}

async function getRecommendedExtensionsFromJson(): Promise<string[]> {
    const configFile = path.join(vscode.workspace.rootPath || '', '.vscode', 'extensions.json');
    try {
        const configContent = fs.readFileSync(configFile, 'utf-8');
        const config = JSON.parse(configContent);
        return config.recommendations || [];
    } catch (error) {
        vscode.window.showErrorMessage('Failed to read extensions.json file.');
        return [];
    }
}

async function enableRecommendedExtensions() {
    const choices = ['Workspace Recommendations', 'extensions.json'];
    const choice = await vscode.window.showQuickPick(choices, {
        placeHolder: 'Choose where to get recommended extensions from'
    });

    if (!choice) {
        return;
    }

    let recommendedExtensions: string[] = [];

    if (choice === 'Workspace Recommendations') {
        const workspaceFiles = await findWorkspaceFiles();

        if (workspaceFiles.length === 0) {
            vscode.window.showInformationMessage('No workspace files found.');
            return;
        }

        const selectedFile = await vscode.window.showQuickPick(workspaceFiles.map(file => path.basename(file)), {
            placeHolder: 'Select a workspace file'
        });

        if (!selectedFile) {
            return;
        }

        const selectedFilePath = workspaceFiles.find(file => path.basename(file) === selectedFile);
        if (selectedFilePath) {
            recommendedExtensions = await getRecommendedExtensionsFromWorkspaceFile(selectedFilePath);
        }
    } else if (choice === 'extensions.json') {
        recommendedExtensions = await getRecommendedExtensionsFromJson();
    }

    if (recommendedExtensions.length === 0) {
        vscode.window.showInformationMessage('No recommended extensions found.');
        return;
    }

    for (const extensionId of recommendedExtensions) {
        let extension = vscode.extensions.getExtension(extensionId);
        if (!extension) {
            // why reinstall? 
            // extension.activate did not work as expected
            // and https://github.com/microsoft/vscode/issues/201672#issuecomment-1980063707
            try {
                console.log(`Extensions: uninstalling ${extensionId}`)
                await vscode.commands.executeCommand('workbench.extensions.uninstallExtension', extensionId);
            } catch (error) {
                // ignore, since it's already installed
            }
            console.log(`Extensions: installing ${extensionId}`)
            await vscode.commands.executeCommand('workbench.extensions.installExtension', extensionId);
        }

        // workbench.extensions.enableExtension command is not available :( 
        // there's closed issue for this: https://github.com/microsoft/vscode/issues/201672
        // if (!extension.isActive) {
        //     await vscode.commands.executeCommand('workbench.extensions.enableExtension', extensionId);
        //     vscode.window.showInformationMessage(`Enabled extension: ${extensionId}`);
        // }
        // Alternatively following also did not work, extension.isActive is `false` even when it's already `enabled`
        // extension = vscode.extensions.getExtension(extensionId); // fetch again after installation
        // if (extension && !extension.isActive) {
        //     await extension.activate();
        // }
    }

    vscode.window.showInformationMessage('Recommended extensions enabled.');
}

export function enableRecommendedExtensionsCommand() {
    return vscode.commands.registerCommand(
        Command.enableRecommendedExtensions,
        enableRecommendedExtensions
    );
}
