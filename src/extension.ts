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
 *   • ruyi.packages.install    (./commands/packages)
 *   • ruyi.packages.uninstall  (./commands/packages)
 *   • ruyi.packages.refresh    (./commands/packages)
 *
 * - Run an automatic detect on activation.
 */

import * as vscode from 'vscode'

import registerDetectCommand from './commands/detect'
import registerHomeCommand from './commands/home'
import registerInstallCommand from './commands/installRuyi'
import registerNewsCommands from './commands/news'
import registerPackagesCommands from './commands/packages'

export function activate(context: vscode.ExtensionContext) {
  // Register commands
  registerHomeCommand(context)
  registerDetectCommand(context)
  registerInstallCommand(context)
  registerNewsCommands(context)
  registerPackagesCommands(context)

  // Run initial detection
  setImmediate(async () => {
    const hasShownHome = context.globalState.get<boolean>('ruyi.home.shown') === true

    if (!hasShownHome) {
      await context.globalState.update('ruyi.home.shown', true)
      await vscode.commands.executeCommand('ruyi.home.show')
    }

    await vscode.commands.executeCommand('ruyi.detect')
  })
}

export function deactivate() {}
