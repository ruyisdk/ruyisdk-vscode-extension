// SPDX-License-Identifier: Apache-2.0
/**
 * RuyiSDK VS Code Extension - Build Module - Command
 *
 * Registers the `ruyi.build.run` command which triggers build-system detection
 * and executes all configured build steps.
 */

import * as vscode from 'vscode'

import { isVirtualWorkspace } from '../common/helpers'

import { BuildService } from './build.service'

export default function registerBuildCommand(ctx: vscode.ExtensionContext): void {
  ctx.subscriptions.push(
    vscode.commands.registerCommand('ruyi.build.run', async () => {
      if (!vscode.workspace.isTrusted) {
        vscode.window.showErrorMessage(vscode.l10n.t('Cannot run build in an untrusted workspace.'))
      }
      if (isVirtualWorkspace()) {
        vscode.window.showErrorMessage(vscode.l10n.t('Building is not supported in virtual workspaces.'))
        return
      }
      await BuildService.instance.build(ctx.extensionUri)
    }),
  )
}
