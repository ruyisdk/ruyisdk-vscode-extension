// SPDX-License-Identifier: Apache-2.0
/**
 * RuyiSDK VS Code Extension - Build Module
 *
 * Barrel / registration file.
 *
 * Exported symbols:
 *  - registerBuildModule  (default export used by extension.ts)
 *  - BuildService
 *  - BuildStatusBarProvider
 *  - Rule schema types
 */

import * as vscode from 'vscode'

import { VenvService } from '../venv/venv.service'

import { BuildStatusBarProvider } from './build-statusbar.provider'
import registerBuildCommand from './build.command'
import { BuildService } from './build.service'

export default function registerBuildModule(ctx: vscode.ExtensionContext): void {
  // Use singleton venv service so status bar state tracks active venv changes
  const venvService = VenvService.instance

  // Initialize build status bar provider (singleton)
  const statusBarProvider = BuildStatusBarProvider.getInstance(venvService)

  // Register the build command
  registerBuildCommand(ctx)

  // Register UI provider so it is disposed with the extension context
  ctx.subscriptions.push(statusBarProvider)

  // Register the build service itself so its output channel is cleaned up
  ctx.subscriptions.push(BuildService.instance)
}

export { BuildStatusBarProvider } from './build-statusbar.provider'
export { BuildService } from './build.service'
export type { BuildRule, BuildRulesConfig, BuildStep, DetectedBuildSystem } from './build.service'
