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
 *   • ruyi.venv.detect  (./commands/venv/detect)
 *   • ruyi.venv.create  (./commands/venv/create)
 *   • ruyi.venv.clean   (./commands/venv/clean)
 *   • ruyi.venv.switch  (./commands/venv/switch)
 *
 * - Show home page on first activation.
 * - Run an automatic detect on activation.
 * - After detection, let the user select a virtual environment to activate.
 */

import * as vscode from 'vscode'

import registerDetectCommand from './commands/detect'
import registerHomeCommand from './commands/home'
import registerInstallCommand from './commands/installRuyi'
import registerNewsCommands from './commands/news'
import registerPackagesCommands from './commands/packages'
import registerCleanADeactivatedVenvCommand from './commands/venv/clean'
import registerCreateNewVenvCommand from './commands/venv/create'
import registerDetectAllVenvsCommand from './commands/venv/detect'
import registerTerminalHandlerCommand from './commands/venv/manageTerminal'
import registerSwitchFromVenvsCommand from './commands/venv/switch'

export function activate(context: vscode.ExtensionContext) {
  // Register commands
  registerDetectCommand(context)
  registerHomeCommand(context)
  registerInstallCommand(context)
  registerNewsCommands(context)
  registerPackagesCommands(context)

  registerTerminalHandlerCommand(context)
  registerDetectAllVenvsCommand(context)
  registerCreateNewVenvCommand(context)
  registerSwitchFromVenvsCommand(context)
  registerCleanADeactivatedVenvCommand(context)

  // Run initial detection
  setImmediate(async () => {
    const hasShownHome = context.globalState.get<boolean>('ruyi.home.shown') === true

    if (!hasShownHome) {
      await context.globalState.update('ruyi.home.shown', true)
      await vscode.commands.executeCommand('ruyi.home.show')
    }

    await vscode.commands.executeCommand('ruyi.detect')
      .then(() => vscode.commands.executeCommand('ruyi.venv.switch', false))
  })
}

export function deactivate() {}
