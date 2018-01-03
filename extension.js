// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode'),
    minimatch = require('minimatch');

const handle_onsave = require('./handle-onsave')();


function activate(context) {



    vscode.workspace.onDidSaveTextDocument(function (document) {
        var onsave = vscode.workspace.getConfiguration('marserver').onsave;
        if (onsave !== true) {
            return;
        }

        let commands = vscode.workspace.getConfiguration('marserver').commands;

        for (command in commands) {

            // code from here;
            // https://github.com/Gruntfuggly/triggertaskonsave/blob/master/out/src/extension.js
            let matched = false;
            // get file relative in the project
            let filePath = vscode.workspace.asRelativePath(document.fileName);

            commands[command].map(function (glob) {

                if (minimatch(filePath, glob, {
                        matchBase: true
                    })) {
                    matched = true;
                    console.log("matched " + filePath)
                }

            });
            console.log("processing " + command)
            if (matched) {
                vscode.commands.executeCommand(command);
            }

        }

    });

    let disposable = vscode.commands.registerCommand('marserver.uploadToServer', function () {

        const config = vscode.workspace.getConfiguration('marserver');
        if (config) {

            // TODO can't seem to require the vscode module in 
            // the handle-onsave module, so passing it in here...
            // FIX..
            handle_onsave.uploadfile(
                config,
                vscode.window.activeTextEditor.document.uri.fsPath,
                vscode
            );

        } else {
            vscode.window.showWarningMessage('no config found for keybinding Ctrl+Alt+U');
        }
    });

    context.subscriptions.push(disposable);

    // create 4 keybindings for Ctrl-Shift-Alt-[1-4]
    for (let index = 0; index < 4; index++) {
        let disposable = vscode.commands.registerCommand('marserver.uploadToServer' +
            (index + 1),
            function () {
                let config = vscode.workspace.getConfiguration('marserver')
                    .get("servers")[index];

                if (config) {


                    // TODO can't seem to require the vscode module in 
                    // the handle-onsave module, so passing it in here...
                    // FIX..
                    handle_onsave.uploadfile(
                        config,
                        vscode.window.activeTextEditor.document.uri.fsPath,
                        vscode
                    );
                } else {
                    vscode.window.showWarningMessage('no config found for keybinding Ctrl+Shift+Alt+' +
                        (index + 1));
                }
            });
        context.subscriptions.push(disposable);
    }


}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {}
exports.deactivate = deactivate;