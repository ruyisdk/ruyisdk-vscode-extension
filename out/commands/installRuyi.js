"use strict";
// SPDX-License-Identifier: Apache-2.0
/**
 * RuyiSDK VS Code Extension - Install via PyPI
 *
 * Command: ruyi.install
 * Workflow:
 *   1) Check if Python is available
 *   2) If Python is available → run `python -m pip install -U ruyi`
 *   3) Success → show "Ruyi installation completed."
 *   4) Failure → show error message
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerInstallCommand = registerInstallCommand;
const cp = require("child_process");
const util = require("util");
const vscode = require("vscode");
const constants_1 = require("../common/constants");
const execAsync = util.promisify(cp.exec);
async function resolvePython() {
    for (const cmd of ['python3', 'python']) {
        try {
            await execAsync(`${cmd} --version`, { timeout: constants_1.SHORT_CMD_TIMEOUT_MS });
            return cmd;
        }
        catch {
        }
    }
    return null;
}
function registerInstallCommand(context) {
    const disposable = vscode.commands.registerCommand('ruyi.install', async () => {
        if (process.platform !== 'linux') {
            vscode.window.showErrorMessage('This extension currently supports Linux only.');
            return;
        }
        const py = await resolvePython();
        if (!py) {
            vscode.window.showErrorMessage('Python not detected. Please install Python first.');
            return;
        }
        const choice = await vscode.window.showInformationMessage('Python detected. Install/upgrade Ruyi via PyPI?', 'Install', 'Cancel');
        if (choice !== 'Install')
            return;
        try {
            await execAsync(`${py} -m pip install -U ruyi`, { timeout: constants_1.LONG_CMD_TIMEOUT_MS });
            vscode.window.showInformationMessage('Ruyi installation completed.');
        }
        catch (e) {
            const stderr = typeof e?.stderr === 'string' ? e.stderr.trim() : '';
            const message = (typeof e?.message === 'string' ? e.message : String(e)).trim();
            vscode.window.showErrorMessage(`Ruyi installation failed: ${stderr || message || 'Unknown error.'}`);
        }
    });
    context.subscriptions.push(disposable);
}
//# sourceMappingURL=installRuyi.js.map