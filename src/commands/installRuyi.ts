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

const execAsync = util.promisify(cp.exec);

async function resolvePython(): Promise<string|null> {
  for (const cmd of ['python3', 'python']) {
    try {
      await execAsync(`${cmd} --version`, {timeout: SHORT_CMD_TIMEOUT_MS});
      return cmd;
    } catch {
    }
  }
  return null;
}

export function registerInstallCommand(context: vscode.ExtensionContext) {
  const disposable =
      vscode.commands.registerCommand('ruyi.install', async () => {
        if (process.platform !== 'linux') {
          vscode.window.showErrorMessage(
              'This extension currently supports Linux only.');
          return;
        }

        const py = await resolvePython();
        if (!py) {
          vscode.window.showErrorMessage(
              'Python not detected. Please install Python first.');
          return;
        }

        const choice = await vscode.window.showInformationMessage(
            'Python detected. Install/upgrade Ruyi via PyPI?', 'Install',
            'Cancel');
        if (choice !== 'Install') return;

        try {
          await execAsync(
              `${py} -m pip install -U ruyi`, {timeout: LONG_CMD_TIMEOUT_MS});
          vscode.window.showInformationMessage('Ruyi installation completed.');
        } catch (e: unknown) {
          let stderr = '';
          let message = '';
          if (typeof e === 'object' && e !== null) {
            if ('stderr' in e && typeof (e as {stderr?: unknown}).stderr === 'string') {
              stderr = ((e as {stderr: string}).stderr).trim();
            }
            if ('message' in e && typeof (e as {message?: unknown}).message === 'string') {
              message = ((e as {message: string}).message).trim();
            }
          }
          if (!message) {
            message = String(e).trim();
          }
          vscode.window.showErrorMessage(`Ruyi installation failed: ${
              stderr || message || 'Unknown error.'}`);
        }
      });

  context.subscriptions.push(disposable);
}
