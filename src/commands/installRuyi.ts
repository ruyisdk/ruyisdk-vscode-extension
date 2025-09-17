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

import * as cp from 'child_process';
import * as util from 'util';
import * as vscode from 'vscode';

import {LONG_CMD_TIMEOUT_MS, SHORT_CMD_TIMEOUT_MS} from '../common/constants';
import {formatExecError, isSupportedPlatform, pythonCandidates} from '../common/utils';

const execAsync = util.promisify(cp.exec);

async function resolvePython(): Promise<string|null> {
  for (const cmd of pythonCandidates()) {
    try {
      await execAsync(`${cmd} --version`, {timeout: SHORT_CMD_TIMEOUT_MS});
      return cmd;
    } catch {
      // try next candidate
    }
  }
  return null;
}

export default function registerInstallCommand(
    context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('ruyi.install', async () => {
    if (!isSupportedPlatform()) {
      vscode.window.showErrorMessage(
          'This extension currently supports Linux only.');
      return;
    }

    const py = await resolvePython();
    if (!py) {
      vscode.window.showErrorMessage(
          'No Python interpreter found (python3/python/py).');
      return;
    }

    const choice = await vscode.window.showInformationMessage(
        'Python detected. Install/upgrade Ruyi via PyPI?', 'Install', 'Cancel');
    if (choice !== 'Install') return;

    await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Installing/Upgrading Ruyi via pip...',
          cancellable: false,
        },
        async () => {
          try {
            await execAsync(
                `${py} -m pip install --user -U ruyi`,
                {timeout: LONG_CMD_TIMEOUT_MS});

            try {
              const {stdout} = await execAsync(`${py} -m ruyi --version`, {
                timeout: SHORT_CMD_TIMEOUT_MS,
              });
              const version = stdout.trim();
              vscode.window.showInformationMessage(
                  `Ruyi installed: ${version}`);
            } catch {
              vscode.window.showWarningMessage(
                  'Ruyi was installed, but the executable may not be in your PATH. ' +
                  'If you used pip --user, add ~/.local/bin to PATH (e.g., export PATH="$HOME/.local/bin:$PATH").');
            }
          } catch (e: unknown) {
            vscode.window.showErrorMessage(
                `Failed to install Ruyi: ${formatExecError(e)}`);
          }
        });
  });

  context.subscriptions.push(disposable);
}
