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
import { getSysrootPkgsFromRuyi } from './sysroot.helper'
import type {
  VenvInfo,
  Toolchain,
  EmulatorResult,
  SysrootPkgResult,
  RuyiProfile,
} from './types'
import { getToolchainsFromRuyi } from './venv.helper'

function containsPath(directory: string, target: string): boolean {
  const relative = path.relative(directory, target)
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative)
}

export interface VenvCreateParams {
  profile: string
  path: string
  toolchains?: string[]
  emulator?: string
  withSysroot?: boolean
  copySysrootFromPkg?: string
  copySysrootFromDir?: string
  projectSysrootFromRootfs?: string
  symlinkSysrootFromDir?: string
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
    const normalizedPath = venvPath ? path.normalize(venvPath) : null

    if (this._currentVenv === normalizedPath) {
      return
    }

    this._currentVenv = normalizedPath
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
  public async getProfiles(): Promise<RuyiProfile[]> {
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
   * Gets available Ruyi sysroot packages.
   */
  public async getSysrootPkgs(): Promise<SysrootPkgResult> {
    return getSysrootPkgsFromRuyi()
  }

  /**
   * Activates a virtual environment in the Ruyi terminal.
   * @param venvPath The absolute path to the venv.
   */
  public activateVenv(venvPath: string): void {
    if (!this.ruyiTerminal) {
      this.ruyiTerminal = vscode.window.createTerminal({
        name: 'Ruyi Venv Terminal',
        shellPath: '/bin/bash', // Enforce bash as per requirements/standard
        cwd: vscode.workspace.workspaceFolders?.[0]?.uri,
      })
      this.ruyiTerminal.show()
    }

    if (this._currentVenv) {
      this.ruyiTerminal.sendText('ruyi-deactivate')
    }

    this.setCurrentVenv(venvPath)
    this.ruyiTerminal.sendText(`source "${venvPath}/bin/ruyi-activate"`)
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
    const { profile, path: venvPath, toolchains, emulator, withSysroot, copySysrootFromPkg, copySysrootFromDir, symlinkSysrootFromDir, extraCommandsFrom, projectSysrootFromRootfs } = params

    try {
      let getLastPercent: (() => number) | undefined
      let ruyiInvoker = ruyi
        .timeout(5 * 60 * 1000) // 5 minutes timeout
        .cwd(getWorkspaceFolderPath())

      if (progressReporter) {
        const [onProgress, getProgress] = createProgressTracker(progressReporter)
        getLastPercent = getProgress
        ruyiInvoker = ruyiInvoker.onProgress(onProgress)
      }

      const ruyiResult = await ruyiInvoker.venv(profile, venvPath, {
        toolchain: toolchains,
        emulator,
        withSysroot,
        copySysrootFromPkg,
        copySysrootFromDir,
        symlinkSysrootFromDir,
        projectSysrootFromRootfs,
        extraCommandsFrom,
      })

      if (progressReporter && getLastPercent) {
        const finalIncrement = Math.max(0, 100 - getLastPercent())
        if (finalIncrement > 0) {
          progressReporter.report({
            message: vscode.l10n.t('Venv creation complete'),
            increment: finalIncrement,
          })
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

  /** Resolves a venv directory that can be removed without deleting workspace folders. */
  public async resolveVenvRemovalPath(venvPath: string): Promise<string> {
    const folders = vscode.workspace.workspaceFolders?.filter(folder => folder.uri.scheme === 'file') ?? []
    const invalidTarget = () => new Error(vscode.l10n.t(
      'Cannot delete this directory as a virtual environment: {0}', venvPath,
    ))

    if (!venvPath.trim() || folders.length === 0) {
      throw invalidTarget()
    }

    const [target, roots] = await Promise.all([
      fs.promises.realpath(path.resolve(folders[0].uri.fsPath, venvPath)),
      Promise.all(folders.map(folder => fs.promises.realpath(folder.uri.fsPath))),
    ])

    if (!roots.some(root => containsPath(root, target))
      || roots.some(root => containsPath(target, root))) {
      throw invalidTarget()
    }

    const activateScript = await fs.promises.stat(path.join(target, 'bin', 'ruyi-activate'))
    if (!activateScript.isFile()) {
      throw invalidTarget()
    }

    return target
  }

  /** Removes a validated virtual environment directory. */
  public async removeVenv(venvPath: string): Promise<void> {
    const absPath = await this.resolveVenvRemovalPath(venvPath)
    const currentVenv = this._currentVenv
    const currentPath = currentVenv
      ? await fs.promises.realpath(currentVenv).catch(() => currentVenv)
      : null

    if (currentPath === absPath) {
      await this.deactivateVenv()
    }

    try {
      await fs.promises.rm(absPath, { recursive: true })
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
    this.ruyiTerminal?.dispose()
    this.disposables.forEach(d => d.dispose())
    this._onDidChangeVenv.dispose()
  }
}
