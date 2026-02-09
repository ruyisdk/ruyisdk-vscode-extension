// SPDX-License-Identifier: Apache-2.0
/**
 * RuyiSDK VS Code Extension - Entry
 *
 * Responsibilities:
 * - Register extension commands:
 *   • ruyi.setup.detect   (./setup/detect.command)
 *   • ruyi.setup.install  (./setup/install.command)
 *   • ruyi.setup.update   (./setup/update.command)
 *   • ruyi.setup.manage   (./setup/manage.command)
 *   • ruyi.news.search       (./commands/news)
 *   • ruyi.news.clearSearch  (./commands/news)
 *   • ruyi.news.showCards    (./commands/news)
 *   • ruyi.packages.install    (./packages/install.command)
 *   • ruyi.packages.uninstall  (./packages/uninstall.command)
 *   • ruyi.packages.refresh    (./packages/refresh.command)
 *   • ruyi.extract      (./packages/extract.command)
 *   • ruyi.venv.refresh  (./venv/create.command)
 *   • ruyi.venv.create  (./venv/create.command)
 *   • ruyi.venv.clean   (./venv/clean.command)
 *   • ruyi.venv.switch  (./venv/switch.command)
 *
 * - Show home page on first activation.
 * - Run an automatic detect on activation.
 * - After detection, let the user select a virtual environment to activate.
 */

import * as vscode from 'vscode'

import { configuration } from './common/configuration'
import { logger } from './common/logger'
import registerHomeModule from './home'
import registerNewsModule from './news'
import registerPackagesModule from './packages'
import registerSetupModule from './setup'
import registerVenvModule from './venv'

export function activate(context: vscode.ExtensionContext) {
  // Register configuration service
  context.subscriptions.push(configuration)

  // Register modules
  registerPackagesModule(context)
  registerHomeModule(context)
  registerSetupModule(context)
  registerNewsModule(context)
  registerVenvModule(context)

  // Initialize logger
  logger.initialize('RuyiSDK')

  // Run initial detection with error handling
  setTimeout(async () => {
    try {
      const hasShownHome = context.globalState.get<boolean>('ruyi.home.shown') === true

      if (!hasShownHome) {
        await context.globalState.update('ruyi.home.shown', true)
        await vscode.commands.executeCommand('ruyi.home.show')
      }

      await vscode.commands.executeCommand('ruyi.setup.detect')
      await vscode.commands.executeCommand('ruyi.venv.refresh')
    }
    catch (error) {
      logger.error('Extension initialization failed:', error)
      vscode.window.showErrorMessage(
        'RuyiSDK extension initialization failed. Some features may not work correctly.',
      )
    }
  })
}

export function deactivate() {
  logger.dispose()
}
