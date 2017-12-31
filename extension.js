// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');

const handle_onsave = require('./handle-onsave')();

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "much-assembly-required--upload-on-save" is now active!');

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable = vscode.commands.registerCommand('marserver.sayHello', function () {
        // The code you place here will be executed every time your command is executed

        handle_onsave.uploadfile(
            vscode.workspace.getConfiguration('marserver'),
            vscode.window.activeTextEditor.document.uri.fsPath
        );

        // Display a message box to the user
        vscode.window.showInformationMessage('File Uploaded');
    });

    context.subscriptions.push(disposable);

    for (let index = 0; index < 4; index++) {
        let disposable = vscode.commands.registerCommand('marserver.sayHello' +
            (index + 1),
            function () {

                handle_onsave.uploadfile(
                    vscode.workspace.getConfiguration('marserver').get("servers")[index],
                    vscode.window.activeTextEditor.document.uri.fsPath
                );
                vscode.window.showInformationMessage('File Uploaded');
            });
        context.subscriptions.push(disposable);
    }


}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {}
exports.deactivate = deactivate;