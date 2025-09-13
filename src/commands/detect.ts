// SPDX-License-Identifier: Apache-2.0
/**
 * Detect Command: checks if `ruyi` is available and shows version or install
 * hint.
 */

import * as vscode from 'vscode';
import {ERR_NOT_SUPPORTED, ERR_RUYI_NOT_FOUND} from '../common/constants';
import {runRuyi} from '../utils/exec';

export function registerDetectCommand(context: vscode.ExtensionContext) {
  const cmd = vscode.commands.registerCommand(
      'ruyi.detect',
      async (opts?: {silent?: boolean}) => {
        const silent = !!opts?.silent;
        const res = await runRuyi(['--version']);

        if (res.code === ERR_RUYI_NOT_FOUND) {
          if (!silent) {
            const pick = await vscode.window.showWarningMessage(
                'Ruyi SDK was not detected. Do you want to open the installation guide?',
                'Open Guide',
                'Cancel',
            );
            if (pick === 'Open Guide') {
              vscode.env.openExternal(
                  vscode.Uri.parse('https://ruyisdk.org/en/download/'),
              );
            }
          }
          return;
        }

        if (res.code === 0) {
          // Only show the first line of stdout
          const firstLine =
              res.stdout.trim().split(/\r?\n/, 1)[0] || '(no output)';
          if (!silent) {
            vscode.window.showInformationMessage(`Ruyi detected: ${firstLine}`);
          }
        } else if (res.code === ERR_NOT_SUPPORTED) {
          if (!silent) {
            vscode.window.showWarningMessage(
                'This platform is not supported. The Ruyi SDK extension currently supports Linux only.',
            );
          }
        } else {
          if (!silent) {
            vscode.window.showWarningMessage(
                `Ruyi was found but execution failed (code=${
                    res.code}). See Ruyi output for details.`,
            );
          }
        }
      },
  );

  context.subscriptions.push(cmd);
}
