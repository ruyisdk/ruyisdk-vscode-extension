// SPDX-License-Identifier: Apache-2.0
/**
 * InstallCommand
 *
 * VS Code command: `ruyi.install`
 *
 * Responsibilities:
 * - Check platform support
 * - Resolve Python via features/install service
 * - Ask user for confirmation and show progress
 * - Call features/install service to perform pip install and report result
 */

import * as vscode from 'vscode';

import {isSupportedPlatform} from '../common/utils';
import {installViaPip, resolvePython} from '../features/install/InstallService';

export default function registerInstallCommand(
    context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('ruyi.install', async () => {
    if (!isSupportedPlatform()) {
      vscode.window.showErrorMessage(
          'This extension currently supports Windows, macOS, and Linux.');
      return;
    }

    const py = await resolvePython();
    if (!py) {
      vscode.window.showErrorMessage(
          'No Python interpreter found (python3/python/py).');
      return;
    }

    const choice = await vscode.window.showInformationMessage(
        'Python detected. Install/upgrade Ruyi via PyPI?',
        'Install',
        'Cancel',
    );
    if (choice !== 'Install') return;

    await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Installing/Upgrading Ruyi via pip...',
          cancellable: false,
        },
        async () => {
          const result = await installViaPip(py);

          if (result.errorMsg) {
            vscode.window.showErrorMessage(result.errorMsg);
            return;
          }
          if (result.warnPath) {
            vscode.window.showWarningMessage(
                'Ruyi was installed, but the executable may not be discoverable. Add it to PATH or set RUYI_BIN to the full path.');
            return;
          }
          if (result.version) {
            vscode.window.showInformationMessage(
                `Ruyi installed: ${result.version}`);
          }
        },
    );
  });

  context.subscriptions.push(disposable);
}
