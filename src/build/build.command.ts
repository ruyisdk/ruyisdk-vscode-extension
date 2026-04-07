// SPDX-License-Identifier: Apache-2.0
/**
 * RuyiSDK VS Code Extension - Build Module - Command
 *
 * Registers the `ruyi.build.run` command which triggers build-system detection
 * and executes all configured build steps.
 */

import * as vscode from 'vscode'

import { BuildService } from './build.service'

export default function registerBuildCommand(ctx: vscode.ExtensionContext): void {
  ctx.subscriptions.push(
    vscode.commands.registerCommand('ruyi.build.run', async () => {
      await BuildService.instance.build(ctx.extensionUri)
    }),
  )
}
