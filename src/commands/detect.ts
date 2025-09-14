// SPDX-License-Identifier: Apache-2.0
/**
 * Detect Command: checks if `ruyi` is available and shows version or install
 * hint.
 */

import * as cp from 'child_process';
import * as util from 'util';
import * as vscode from 'vscode';

import {SHORT_CMD_TIMEOUT_MS} from '../common/constants';

const execAsync = util.promisify(cp.exec);

export function registerDetectCommand(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
      'ruyi.detect', async (opts?: {silent?: boolean}) => {
        if (process.platform !== 'linux') {
          if (!opts?.silent)
            vscode.window.showErrorMessage(
                'This extension currently supports Linux only.');
          return;
        }
        try {
          const {stdout} = await execAsync(
              'ruyi --version', {timeout: SHORT_CMD_TIMEOUT_MS});
          if (!opts?.silent)
            vscode.window.showInformationMessage(
                `Ruyi detected: ${stdout.trim()}`);
        } catch (e: any) {
          const msg = (e?.stderr || e?.message || String(e)).trim();
          if (!opts?.silent)
            vscode.window.showErrorMessage(`Ruyi not found: ${msg}`);
        }
      });

  context.subscriptions.push(disposable);
}