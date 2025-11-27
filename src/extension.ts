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
 *   • ruyi.packages.install    (./packages/install.command)
 *   • ruyi.packages.uninstall  (./packages/uninstall.command)
 *   • ruyi.packages.refresh    (./packages/refresh.command)
 *   • ruyi.extract      (./packages/extract.command)
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
import registerHomeCommand from './commands/home'
import registerCleanADeactivatedVenvCommand from './commands/venv/clean'
import registerCreateNewVenvCommand from './commands/venv/create'
import registerDetectAllVenvsCommand from './commands/venv/detect'
import registerTerminalHandlerCommand from './commands/venv/manageCurrentVenv'
import registerSwitchFromVenvsCommand from './commands/venv/switch'
import { logger } from './common/logger'
import { configuration } from './features/configuration/ConfigurationService'
import { registerNewsModule } from './news'
import { registerPackagesModule } from './packages'

export function activate(context: vscode.ExtensionContext) {
  // Register configuration service
  context.subscriptions.push(configuration)

  // Register commands
  registerDetectCommand(context)
  registerPackagesModule(context)
  registerHomeCommand(context)
  registerNewsModule(context)

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
    await vscode.commands.executeCommand('ruyi.venv.refresh')
  })
}

export function deactivate() {
  logger.dispose()
}
