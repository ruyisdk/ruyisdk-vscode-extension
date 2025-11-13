// SPDX-License-Identifier: Apache-2.0
/**
 * RuyiSDK VS Code Extension - Entry
 *
 * Responsibilities:
 * - Register extension commands:
 *   • ruyi.detect       (./commands/detect)
 *   • ruyi.install      (./commands/installRuyi)
 *   • ruyi.news.search       (./commands/news)
 *   • ruyi.news.clearSearch  (./commands/news)
 *   • ruyi.news.showCards    (./commands/news)
 *   • ruyi.packages.install    (./commands/packages)
 *   • ruyi.packages.uninstall  (./commands/packages)
 *   • ruyi.packages.refresh    (./commands/packages)
 *   • ruyi.extract      (./commands/extract)
 *   • ruyi.venv.refresh  (./commands/venv/detect)
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
import registerExtractCommand from './commands/extract'
import registerHomeCommand from './commands/home'
import registerInstallCommand from './commands/installRuyi'
import registerNewsCommands from './commands/news'
import registerPackagesCommands from './commands/packages'
import registerCleanADeactivatedVenvCommand from './commands/venv/clean'
import registerCreateNewVenvCommand from './commands/venv/create'
import registerDetectAllVenvsCommand from './commands/venv/detect'
import registerTerminalHandlerCommand from './commands/venv/manageCurrentVenv'
import registerSwitchFromVenvsCommand from './commands/venv/switch'
import { logger } from './common/logger'
import { configuration } from './features/configuration/ConfigurationService'

export function activate(context: vscode.ExtensionContext) {
  // Register configuration service
  context.subscriptions.push(configuration)

  // Register commands
  registerDetectCommand(context)
  registerExtractCommand(context)
  registerHomeCommand(context)
  registerInstallCommand(context)
  registerNewsCommands(context)
  registerPackagesCommands(context)

  registerTerminalHandlerCommand(context)
  registerDetectAllVenvsCommand(context)
  registerCreateNewVenvCommand(context)
  registerSwitchFromVenvsCommand(context)
  registerCleanADeactivatedVenvCommand(context)

  // Initialize logger
  logger.initialize('RuyiSDK')

  // Run initial detection
  setTimeout(async () => {
    const hasShownHome = context.globalState.get<boolean>('ruyi.home.shown') === true

    if (!hasShownHome) {
      await context.globalState.update('ruyi.home.shown', true)
      await vscode.commands.executeCommand('ruyi.home.show')
    }

    await vscode.commands.executeCommand('ruyi.detect')
    await vscode.commands.executeCommand('ruyi.venv.refresh', false)
  })
}

export function deactivate() {
  logger.dispose()
}
