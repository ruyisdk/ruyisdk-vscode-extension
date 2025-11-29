// SPDX-License-Identifier: Apache-2.0
/**
 * RuyiSDK VS Code Extension - Entry
 *
 * Responsibilities:
 * - Register extension commands:
 *   • ruyi.setup.detect (./setup/detect.command)
 *   • ruyi.setup        (./setup/setup.command)
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
 *   • ruyi.setup.manage (./setup/manage.command)
 *   • ruyi.venv.switch  (./commands/venv/switch)
 *
 * - Show home page on first activation.
 * - Run an automatic detect on activation.
 * - After detection, let the user select a virtual environment to activate.
 */

import * as vscode from 'vscode'

import registerCleanADeactivatedVenvCommand from './commands/venv/clean'
import registerCreateNewVenvCommand from './commands/venv/create'
import registerDetectAllVenvsCommand from './commands/venv/detect'
import registerTerminalHandlerCommand from './commands/venv/manageCurrentVenv'
import registerSwitchFromVenvsCommand from './commands/venv/switch'
import { configuration } from './common/configuration'
import { logger } from './common/logger'
import registerHomeModule from './home'
import registerNewsModule from './news'
import registerPackagesModule from './packages'
import registerSetupModule from './setup'
import registerTelemetryModule from './telemetry'

export function activate(context: vscode.ExtensionContext) {
  // Register configuration service
  context.subscriptions.push(configuration)

  // Register commands
  registerPackagesModule(context)
  registerHomeModule(context)
  registerSetupModule(context)
  registerNewsModule(context)
  registerTelemetryModule(context)

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

    await vscode.commands.executeCommand('ruyi.setup.detect')
    await vscode.commands.executeCommand('ruyi.venv.refresh')
  })
}

export function deactivate() {
  logger.dispose()
}
