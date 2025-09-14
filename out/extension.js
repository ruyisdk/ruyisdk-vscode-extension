"use strict";
// SPDX-License-Identifier: Apache-2.0
/**
 * RuyiSDK VS Code Extension - Entry
 *
 * - Registers commands:
 *   - ruyi.detect      (see ./commands/detect)
 *   - ruyi.install     (see ./commands/installRuyi)
 * - Triggers a silent detect once on startup.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const detect_1 = require("./commands/detect");
const installRuyi_1 = require("./commands/installRuyi");
function activate(context) {
    (0, detect_1.registerDetectCommand)(context);
    (0, installRuyi_1.registerInstallCommand)(context);
    setTimeout(() => {
        void vscode.commands.executeCommand('ruyi.detect');
    }, 0);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map