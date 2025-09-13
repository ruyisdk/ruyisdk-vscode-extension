// SPDX-License-Identifier: Apache-2.0
/**
 * RuyiSDK VS Code Extension - Install via PyPI
 *
 * Command: ruyi.install
 * Workflow:
 *   1) Check if Python (>=3.8) is available
 *   2) If Python is available → run `pip install -U ruyi`
 *   3) If not → prompt the user to install Python first
 */

import * as cp from 'child_process';
import * as util from 'util';
import * as vscode from 'vscode';

import {runRuyi} from '../utils/exec';

const execAsync = util.promisify(cp.exec);

async function hasPython(): Promise<boolean> {
  try {
    const {stdout} = await execAsync('python3 --version', {timeout: 5000});
    return /^Python\s+3\.(\d+)/.test(stdout);
  } catch {
    return false;
  }
}

export function registerInstallCommand(context: vscode.ExtensionContext) {
  const cmd = vscode.commands.registerCommand('ruyi.install', async () => {
    if (process.platform !== 'linux') {
      vscode.window.showErrorMessage(
          'Ruyi installation is only supported on Linux.');
      return;
    }

    const ok = await hasPython();
    if (!ok) {
      vscode.window.showErrorMessage(
          'Python (>=3.8) not detected. Please install Python first, then rerun this command.');
      return;
    }

    const proceed = await vscode.window.showInformationMessage(
        'Python environment detected. Do you want to install/upgrade Ruyi via PyPI?',
        'Install', 'Cancel');
    if (proceed !== 'Install') return;

    try {
      const {stdout, stderr} = await execAsync('pip3 install -U ruyi', {
        timeout: 60_000,
      });
      const msg = stdout.trim() || stderr.trim();
      vscode.window.showInformationMessage('Ruyi installation completed.');
      if (msg) console.log(msg);
    } catch (e: any) {
      vscode.window.showErrorMessage(
          `Ruyi installation failed: ${e.message || e}`);
      return;
    }

    const probe = await runRuyi(['--version']);
    if (probe.code === 0) {
      vscode.window.showInformationMessage(
          `Ruyi installed: ${probe.stdout.trim()}`);
    } else {
      vscode.window.showWarningMessage(
          'Installation finished, but Ruyi was not detected. Please check your PATH.');
    }
  });

  context.subscriptions.push(cmd);
}
