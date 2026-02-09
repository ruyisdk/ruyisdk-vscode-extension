// SPDX-License-Identifier: Apache-2.0
/**
 * RuyiSDK VS Code Extension - Venv Module - Service
 *
 * Provides the core business logic for the virtual environment module.
 * Implements the Singleton pattern.
 */

import * as fs from 'fs'
import * as path from 'path'
import * as vscode from 'vscode'

import { getWorkspaceFolderPath, createProgressTracker } from '../common/helpers'
import { logger } from '../common/logger'
import ruyi from '../ruyi'

import { scanWorkspaceForVenvs } from './detection.helper'
import { getEmulatorsFromRuyi } from './emulator.helper'
import { getProfilesFromRuyi } from './profile.helper'
import { getToolchainsFromRuyi } from './toolchain.helper'
import type {
  VenvInfo,
  Toolchain,
  EmulatorResult,
  ProfilesMap,
} from './types'

export interface VenvCreateParams {
  profile: string
  path: string
  toolchains?: string[]
  emulator?: string
  withSysroot?: boolean
  sysrootFrom?: string
  extraCommandsFrom?: string[]
}

export class VenvService implements vscode.Disposable {
  private static _instance: VenvService

  private _currentVenv: string | null = null
  private _onDidChangeVenv = new vscode.EventEmitter<string | null>()
  public readonly onDidChangeVenv = this._onDidChangeVenv.event

  private ruyiTerminal: vscode.Terminal | null = null
  private disposables: vscode.Disposable[] = []

  private constructor() {
  // Register terminal close listener
    this.disposables.push(
      vscode.window.onDidCloseTerminal((closedTerminal) => {
        if (closedTerminal === this.ruyiTerminal) {
          this.ruyiTerminal = null
          this.setCurrentVenv(null)
        }
      }),
    )
  }

  public static get instance(): VenvService {
    if (!VenvService._instance) {
      VenvService._instance = new VenvService()
    }
    return VenvService._instance
  }

  public getCurrentVenv(): string | null {
    return this._currentVenv
  }

  private setCurrentVenv(venvPath: string | null): void {
    const normalizedNew = venvPath ? path.normalize(venvPath) : null
    const normalizedCurrent = this._currentVenv ? path.normalize(this._currentVenv) : null

    if (normalizedCurrent === normalizedNew) {
      return
    }

    this._currentVenv = venvPath
    this._onDidChangeVenv.fire(this._currentVenv)
  }

  /**
   * Lists all detected Ruyi virtual environments in the workspace.
   */
  public async listVenvs(): Promise<VenvInfo[]> {
    return scanWorkspaceForVenvs()
  }

  /**
   * Gets available Ruyi profiles.
   */
  public async getProfiles(): Promise<ProfilesMap> {
    return getProfilesFromRuyi()
  }

  /**
   * Gets available Ruyi toolchains.
   */
  public async getToolchains(): Promise<Toolchain[]> {
    return getToolchainsFromRuyi()
  }

  /**
   * Gets available Ruyi emulators.
   */
  public async getEmulators(): Promise<EmulatorResult> {
    return getEmulatorsFromRuyi()
  }

  /**
   * Activates a virtual environment in the Ruyi terminal.
   * @param item The TreeItem, path string, or null representing the venv to activate.
   */
  public async activateVenv(item: vscode.TreeItem | string | null): Promise<void> {
  // Handle null case
    if (!item) {
      vscode.window.showWarningMessage('No virtual environment selected.')
      return
    }

    let venvPath: string

    // Handle different input types
    if (typeof item === 'string') {
      venvPath = item
    }
    else if (item instanceof vscode.TreeItem) {
    // Extract path from TreeItem - try resourceUri first, then label
      if (item.resourceUri) {
        venvPath = item.resourceUri.fsPath
      }
      else if (item.label) {
        // label can be string or TreeItemLabel
        venvPath = typeof item.label === 'string' ? item.label : item.label.label
      }
      else {
        vscode.window.showErrorMessage('Invalid virtual environment item: no path found.')
        return
      }
    }
    else {
      vscode.window.showErrorMessage('Invalid virtual environment item type.')
      return
    }

    // Validate that we have a non-empty path
    if (!venvPath || venvPath.trim() === '') {
      vscode.window.showErrorMessage('Invalid virtual environment path.')
      return
    }

    let workspaceRoot: string
    try {
      workspaceRoot = getWorkspaceFolderPath()
    }
    catch {
      vscode.window.showWarningMessage('Open a workspace folder before activating a Ruyi venv.')
      return
    }

    const absPath = path.isAbsolute(venvPath) ? venvPath : path.resolve(workspaceRoot, venvPath)

    // Ensure terminal exists
    if (!this.ruyiTerminal) {
      this.ruyiTerminal = vscode.window.createTerminal({
        name: 'Ruyi Venv Terminal',
        shellPath: '/bin/bash', // Enforce bash as per requirements/standard
        cwd: workspaceRoot,
      })
      this.ruyiTerminal.show()
    }

    // If switching from another venv, deactivate first (conceptually)
    // But since we are sourcing, we might want to just deactivate current if active
    // Actually, the manageRuyiTerminal logic suggests just sourcing the new one
    // effectively switches it if we handle it right, but a clean deactivate is better.

    if (this._currentVenv) {
      this.ruyiTerminal.sendText('ruyi-deactivate')
    // Small delay to allow deactivate to process if needed, though shell commands are queued
    }

    this.setCurrentVenv(absPath)

    // Wait a tiny bit or just send the command.
    // The original logic had a setTimeout, but terminal.sendText queues commands.
    // However, if we want to be safe with the state update visual feedback:
    this.ruyiTerminal.sendText(`source "${absPath}/bin/ruyi-activate"`)
  }

  /**
   * Deactivates the current virtual environment.
   */
  public async deactivateVenv(): Promise<void> {
    if (this.ruyiTerminal && this._currentVenv) {
      this.ruyiTerminal.sendText('ruyi-deactivate')
    }
    this.setCurrentVenv(null)
  }

  /**
   * Creates a new virtual environment.
   */
  public async createVenv(params: VenvCreateParams, progressReporter?: vscode.Progress<{ message?: string, increment?: number }>): Promise<boolean> {
    const { profile, path: venvPath, toolchains, emulator, withSysroot, sysrootFrom, extraCommandsFrom } = params

    try {
    // Use provided reporter or create a dummy one if not provided (though usually called with one)
    // But here we might just want to wrap the ruyi call.

      // If we are calling this from a command that already sets up progress, we might pass the reporter.
      // If not, we might need to rely on the caller to handle UI feedback.
      // For this service method, let's assume we return success/failure and let caller handle UI unless passed.

      let onProgress: ((lastLine: string) => void) | undefined
      let getLastPercent: (() => number) | undefined

      if (progressReporter) {
        const tracker = createProgressTracker(progressReporter)
        onProgress = tracker[0]
        getLastPercent = tracker[1]
      }

      const ruyiResult = await ruyi
        .timeout(5 * 60 * 1000) // 5 minutes timeout
        .cwd(getWorkspaceFolderPath())
        .onProgress(onProgress || (() => {}))
        .venv(profile, venvPath, {
          toolchain: toolchains,
          emulator: emulator,
          withSysroot,
          sysrootFrom,
          extraCommandsFrom,
        })

      if (progressReporter && getLastPercent) {
        const finalIncrement = Math.max(0, 100 - getLastPercent())
        if (finalIncrement > 0) {
          progressReporter.report({ message: 'Venv creation complete', increment: finalIncrement })
        }
      }

      if (ruyiResult.code !== 0) {
        throw new Error(ruyiResult.stderr || 'Unknown error during venv creation')
      }

      return true
    }
    catch (error) {
      logger.error('Failed to create venv:', error)
      throw error
    }
  }

  /**
   * Removes a virtual environment by deleting its directory.
   */
  public async removeVenv(venvPath: string): Promise<void> {
    const absPath = path.isAbsolute(venvPath)
      ? venvPath
      : path.resolve(getWorkspaceFolderPath(), venvPath)

    if (this._currentVenv && path.normalize(this._currentVenv) === path.normalize(absPath)) {
      await this.deactivateVenv()
    }

    try {
      await fs.promises.rm(absPath, { recursive: true, force: true })
      logger.info(`Removed venv at ${absPath}`)
      // Notify UI to refresh the venv list
      this._onDidChangeVenv.fire(this._currentVenv)
    }
    catch (error) {
      logger.error(`Failed to remove venv at ${absPath}:`, error)
      throw error
    }
  }

  public dispose() {
    this.disposables.forEach(d => d.dispose())
    this._onDidChangeVenv.dispose()
  }
}
