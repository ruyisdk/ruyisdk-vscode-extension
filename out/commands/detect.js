"use strict";
// SPDX-License-Identifier: Apache-2.0
/**
 * Detect Command: checks if `ruyi` is available and shows version or install
 * hint.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerDetectCommand = registerDetectCommand;
const cp = require("child_process");
const util = require("util");
const vscode = require("vscode");
const constants_1 = require("../common/constants");
const execAsync = util.promisify(cp.exec);
function registerDetectCommand(context) {
    const disposable = vscode.commands.registerCommand('ruyi.detect', async (opts) => {
        if (process.platform !== 'linux') {
            if (!opts?.silent)
                vscode.window.showErrorMessage('This extension currently supports Linux only.');
            return;
        }
        try {
            const { stdout } = await execAsync('ruyi --version', { timeout: constants_1.SHORT_CMD_TIMEOUT_MS });
            if (!opts?.silent)
                vscode.window.showInformationMessage(`Ruyi detected: ${stdout.trim()}`);
        }
        catch {
            if (!opts?.silent) {
                const choice = await vscode.window.showErrorMessage('Ruyi not found', 'Install Ruyi', 'Open Guide', 'Cancel');
                if (choice === 'Install Ruyi') {
                    vscode.commands.executeCommand('ruyi.install');
                }
                else if (choice === 'Open Guide') {
                    vscode.env.openExternal(vscode.Uri.parse('https://ruyisdk.org/en/docs/Package-Manager/installation'));
                }
            }
        }
    });
    context.subscriptions.push(disposable);
}
//# sourceMappingURL=detect.js.map