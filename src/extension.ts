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
import registerExtractCommand from './commands/extract'
import registerHomeCommand from './commands/home'
import registerInstallCommand from './commands/installRuyi'
import registerNewsCommands from './commands/news'
import registerPackagesCommands from './commands/packages'
import registerCleanADeactivatedVenvCommand from './commands/venv/clean'
import registerCreateNewVenvCommand from './commands/venv/create'
import registerDetectAllVenvsCommand from './commands/venv/detect'
import registerTerminalHandlerCommand from './commands/venv/manageTerminal'
import registerSwitchFromVenvsCommand from './commands/venv/switch'
import { CONFIG_KEYS } from './common/constants'
import { configuration } from './features/configuration/ConfigurationService'

export function activate(context: vscode.ExtensionContext) {
  // Register configuration service
  context.subscriptions.push(configuration)

  // Listen for configuration changes
  context.subscriptions.push(
    configuration.onConfigChange((event) => {
      // Handle Ruyi path changes
      if (event.affectsConfiguration(CONFIG_KEYS.RUYI_PATH)) {
        vscode.window.showInformationMessage(
          'Ruyi path has been changed. Please reload the window for it to take effect.',
          'Reload Now',
          'Later',
        ).then((selection) => {
          if (selection === 'Reload Now') {
            vscode.commands.executeCommand('workbench.action.reloadWindow')
          }
        })
      }
    }),
  )

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

  // Create status bar entry for Ruyi News Cards
  const newsStatusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    1000,
  )
  newsStatusBarItem.text = '$(info) Read RuyiNews'
  newsStatusBarItem.tooltip = 'Open Ruyi News Cards'
  newsStatusBarItem.command = 'ruyi.news.showCards'
  newsStatusBarItem.show()
  context.subscriptions.push(newsStatusBarItem)

  // Run initial detection
  setTimeout(async () => {
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
