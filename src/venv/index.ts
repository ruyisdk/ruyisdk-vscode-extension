// SPDX-License-Identifier: Apache-2.0
/**
 * RuyiSDK VS Code Extension - Venv Module
 *
 * Barrel file for venv module exports.
 * Provides unified access to commands, providers, services, helpers, and types.
 */

import * as vscode from 'vscode'

import registerActivateCommand from './activate.command'
import registerCleanCommand from './clean.command'
import registerCreateCommand from './create.command'
import registerDeactivateCommand from './deactivate.command'
import registerRefreshCommand from './refresh.command'
import { VenvStatusBarProvider } from './venv-statusbar.provider'
import { VenvTreeProvider } from './venv-tree.provider'
import { VenvService } from './venv.service'

/**
 * Registers all venv module components with VS Code.
 * @param ctx - The extension context
 */
export default function registerVenvModule(ctx: vscode.ExtensionContext): void {
  // Use singleton instance
  const venvService = VenvService.instance

  // Initialize UI Providers (Singletons)
  const treeProvider = VenvTreeProvider.getInstance(venvService)
  const statusBarProvider = VenvStatusBarProvider.getInstance(venvService)

  // Register UI
  vscode.window.registerTreeDataProvider('ruyiVenvsView', treeProvider)
  ctx.subscriptions.push(statusBarProvider)

  // Register commands
  registerCreateCommand(ctx, venvService)
  registerCleanCommand(ctx, venvService)
  registerActivateCommand(ctx, venvService)
  registerDeactivateCommand(ctx, venvService)
  registerRefreshCommand(ctx, treeProvider)
}

// Export commands
export { default as registerActivateCommand } from './activate.command'
export { default as registerCleanCommand } from './clean.command'
export { default as registerCreateCommand } from './create.command'
export { default as registerDeactivateCommand } from './deactivate.command'
export { default as registerRefreshCommand } from './refresh.command'

// Export UI Providers
export { VenvTreeProvider } from './venv-tree.provider'
export { VenvStatusBarProvider } from './venv-statusbar.provider'

// Export Services
export { VenvService } from './venv.service'

// Export Helpers
export { scanWorkspaceForVenvs as detectVenvs } from './detection.helper'
export { getProfilesFromRuyi as getProfiles, type ProfilesMap } from './profile.helper'
export { getToolchainsFromRuyi as getToolchains, type Toolchain } from './venv.helper'
export { getEmulatorsFromRuyi as getEmulators, type EmulatorInfo } from './emulator.helper'

// 类型导出
export type { VenvInfo } from './types'
