// SPDX-License-Identifier: Apache-2.0
/**
 * Detect Command: checks if `ruyi` is available and shows version or install
 * hint.
 */

import * as cp from 'child_process';
import * as util from 'util';
import * as vscode from 'vscode';
import {SHORT_CMD_TIMEOUT_MS} from '../common/constants';
import {isSupportedPlatform, pythonCandidates} from '../common/utils';

const execAsync = util.promisify(cp.exec);

/** Try `python -m ruyi --version` with several interpreter candidates. */
async function detectRuyiVersion(): Promise<string|null> {
  for (const py of pythonCandidates()) {
    try {
      const {stdout} = await execAsync(`${py} -m ruyi --version`, {
        timeout: SHORT_CMD_TIMEOUT_MS,
      });
      const v = stdout.trim();
      if (v) return v;
    } catch {
      // ignore and try next candidate
    }
  }
  return null;
}

export default function registerDetectCommand(
    context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
      'ruyi.detect',
      async (opts?: {silent?: boolean}) => {
        if (!isSupportedPlatform()) {
          if (!opts?.silent) {
            vscode.window.showErrorMessage(
                'This extension currently supports Linux only.');
          }
          return;
        }

        const version = await detectRuyiVersion();

        if (version) {
          if (!opts?.silent) {
            vscode.window.showInformationMessage(`Ruyi detected: ${version}`);
          }
          return;
        }

        if (!opts?.silent) {
          const choice = await vscode.window.showErrorMessage(
              'Ruyi not found. If you installed with pip --user, ensure ~/.local/bin is in PATH.',
              'Install Ruyi',
              'Open Guide',
              'Cancel',
          );
          if (choice === 'Install Ruyi') {
            void vscode.commands.executeCommand('ruyi.install');
          } else if (choice === 'Open Guide') {
            void vscode.env.openExternal(
                vscode.Uri.parse(
                    'https://ruyisdk.org/en/docs/Package-Manager/installation'),
            );
          }
        }
      },
  );

  context.subscriptions.push(disposable);
}