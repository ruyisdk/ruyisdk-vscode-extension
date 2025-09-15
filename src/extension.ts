// SPDX-License-Identifier: Apache-2.0
/**
 * RuyiSDK VS Code Extension - Entry
 *
 * - Registers commands:
 *   - ruyi.detect      (see ./commands/detect)
 *   - ruyi.install     (see ./commands/installRuyi)
 * - Triggers a silent detect once on startup.
 */

import * as vscode from 'vscode';
import {registerDetectCommand} from './commands/detect';
import {registerInstallCommand} from './commands/installRuyi';

export function activate(context: vscode.ExtensionContext) {
  registerDetectCommand(context);
  registerInstallCommand(context);

  setImmediate(() => {
    void vscode.commands.executeCommand('ruyi.detect');
  });
}

export function deactivate() {}
