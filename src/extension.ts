// SPDX-License-Identifier: Apache-2.0
/**
 * RuyiSDK VS Code Extension - Entry
 *
 * Responsibilities:
 * - Register extension commands:
 *   • ruyi.detect       (./commands/detect)
 *   • ruyi.install      (./commands/installRuyi)
 *   • ruyi.news.read    (./commands/news)
 *   • ruyi.news.showAll (./commands/news)
 *   • ruyi.news.showUnread (./commands/news)
 *
 * - Run an automatic detect on activation.
 */

import * as vscode from 'vscode';
import registerDetectCommand from './commands/detect';
import registerInstallCommand from './commands/installRuyi';
import registerNewsCommands from './commands/news';

export function activate(context: vscode.ExtensionContext) {
  registerDetectCommand(context);
  registerInstallCommand(context);
  registerNewsCommands(context);

  setImmediate(() => {
    void vscode.commands.executeCommand('ruyi.detect');
  });
}

export function deactivate() {}
