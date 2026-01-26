// SPDX-License-Identifier: Apache-2.0
import { exec } from 'child_process'
import { access, constants, realpath } from 'fs/promises'
import * as path from 'path'
import { promisify } from 'util'
import * as vscode from 'vscode'

import * as semver from 'semver'

import { configuration } from '../common/configuration'
import { CONFIG_KEYS } from '../common/constants'
import { fullKey } from '../common/helpers'
import { logger } from '../common/logger'
import { resolveActiveRuyi } from '../ruyi'

const execAsync = promisify(exec)

/**
 * Represents a RuyiSDK installation
 */
export interface RuyiInstallation {
  path: string
  version?: string
  parsedVersion?: semver.SemVer
}

/**
 * Get version string from a Ruyi executable
 */
export async function getRuyiVersion(ruyiPath: string): Promise<string | undefined> {
  try {
    const result = await execAsync(`"${ruyiPath}" --version`)
    const versionLine = result.stdout.split(/\r?\n/, 1)[0]?.trim()
    return versionLine || undefined
  }
  catch (error) {
    logger.warn(`Failed to get version for ${ruyiPath}`, error)
    return undefined
  }
}

/**
 * List all RuyiSDK installations with version information
 * Installations are sorted by version (newest first)
 */
export async function listAllInstallations(): Promise<RuyiInstallation[]> {
  logger.info('Scanning for RuyiSDK installations...')

  // Find all Ruyi executables
  const candidates: string[] = []
  const seen = new Set<string>()

  const addCandidate = async (dir: string) => {
    const candidate = path.join(dir, 'ruyi')

    try {
      await access(candidate, constants.X_OK)
      const resolved = await realpath(candidate).catch(() => candidate)
      if (seen.has(resolved)) return
      candidates.push(resolved)
      seen.add(resolved)
    }
    catch {
      // Skip non-executable or non-existent files
    }
  }

  // Check ~/.local/bin first (most common location)
  const homeDir = process.env.HOME
  if (homeDir) {
    await addCandidate(path.join(homeDir, '.local', 'bin'))
  }

  // Check all PATH directories
  const pathEnv = process.env.PATH
  if (pathEnv) {
    const pathDirs = pathEnv.split(path.delimiter).filter(Boolean)
    for (const dir of pathDirs) {
      await addCandidate(dir)
    }
  }
  else {
    logger.warn('PATH environment variable is not set')
  }

  // Get versions for all candidates
  const installations: RuyiInstallation[] = await Promise.all(
    candidates.map(async (candidate) => {
      const version = await getRuyiVersion(candidate)
      return {
        path: candidate,
        version,
        parsedVersion: version ? semver.coerce(version) ?? undefined : undefined,
      }
    }),
  )

  // Sort by version (newest first), then by path
  installations.sort((a, b) => {
    if (a.parsedVersion && b.parsedVersion) {
      return semver.rcompare(a.parsedVersion, b.parsedVersion)
    }
    if (a.parsedVersion) return -1
    if (b.parsedVersion) return 1
    return a.path.localeCompare(b.path)
  })

  logger.info(`Found ${installations.length} RuyiSDK installation(s)`)
  return installations
}

/**
 * Check if RuyiSDK is installed
 * @returns Installation info or null if not found
 */
export async function detectRuyiInstallation(): Promise<RuyiInstallation | null> {
  const ruyiPath = await resolveActiveRuyi()
  if (!ruyiPath) {
    return null
  }

  const version = await getRuyiVersion(ruyiPath)
  return {
    path: ruyiPath,
    version,
    parsedVersion: version ? semver.coerce(version) ?? undefined : undefined,
  }
}

export class ManageService implements vscode.Disposable {
  private statusBarItem?: vscode.StatusBarItem
  private readonly disposables: vscode.Disposable[] = []
  private initialized = false

  public initialize(context: vscode.ExtensionContext): void {
    if (this.initialized) {
      return
    }

    this.initialized = true
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      1000,
    )
    this.statusBarItem.command = 'ruyi.setup.manage'
    this.statusBarItem.text = '$(tools) <No RuyiSDK>'
    this.statusBarItem.tooltip = 'Click to select RuyiSDK installation'
    this.statusBarItem.show()
    context.subscriptions.push(this.statusBarItem)

    const configListener = configuration.registerConfigChangeHandler((event) => {
      if (event.affectsConfiguration(fullKey(CONFIG_KEYS.RUYI_PATH))) {
        this.updateStatusBarItem().catch((error) => {
          logger.error('Failed to update Ruyi status bar item', error)
        })
      }
    })
    this.disposables.push(configListener)

    this.updateStatusBarItem().catch((error) => {
      logger.error('Failed to initialize Ruyi status bar item', error)
    })

    this.autoSelectLatest().catch((error) => {
      logger.error('Failed to auto-select latest RuyiSDK', error)
    })
  }

  public async setRuyiPath(newPath: string, skipReload?: boolean): Promise<void> {
    try {
      const config = vscode.workspace.getConfiguration('ruyi')
      await config.update(CONFIG_KEYS.RUYI_PATH, newPath, vscode.ConfigurationTarget.Global)

      await this.updateStatusBarItem()

      if (skipReload) {
        logger.info(newPath ? `RuyiSDK path set to: ${newPath}` : 'RuyiSDK path cleared')
        return
      }

      const message = newPath
        ? `RuyiSDK path set to: ${newPath}`
        : 'RuyiSDK path cleared. Using automatic detection.'

      const choice = await vscode.window.showInformationMessage(
        message,
        'Reload Window',
        'Later',
      )

      if (choice === 'Reload Window') {
        await vscode.commands.executeCommand('workbench.action.reloadWindow')
      }
    }
    catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      logger.error('Failed to update Ruyi path configuration', error)
      vscode.window.showErrorMessage(`Failed to update configuration: ${reason}`)
    }
  }

  public async updateStatusBarItem(): Promise<void> {
    if (!this.statusBarItem) {
      return
    }

    const currentPath = configuration.ruyiPath
    if (!currentPath) {
      this.statusBarItem.text = '$(tools) <No RuyiSDK>'
      this.statusBarItem.tooltip = 'Click to select RuyiSDK installation'
      return
    }

    const version = await getRuyiVersion(currentPath)
    if (version) {
      const match = version.match(/(\d+\.\d+\.\d+)/)
      const versionLabel = match ? match[1] : version
      this.statusBarItem.text = `$(tools) RuyiSDK ${versionLabel}`
      this.statusBarItem.tooltip = `RuyiSDK ${version}\nPath: ${path.dirname(currentPath)}`
    }
    else {
      this.statusBarItem.text = `$(tools) ${path.basename(currentPath)}`
      this.statusBarItem.tooltip = `RuyiSDK: ${path.dirname(currentPath)}`
    }
  }

  private async autoSelectLatest(): Promise<void> {
    if (configuration.ruyiPath) {
      logger.info('RuyiSDK path already configured, skipping auto-selection')
      return
    }

    const installations = await listAllInstallations()
    const latest = installations.find(installation => installation.parsedVersion)
    if (!latest) {
      logger.warn('No RuyiSDK installations with valid versions found')
      return
    }

    await this.setRuyiPath(latest.path, true)
    logger.info(`Auto-selected latest RuyiSDK: ${latest.version} at ${latest.path}`)
  }

  public dispose(): void {
    this.disposables.forEach(disposable => disposable.dispose())
    this.disposables.length = 0
    this.statusBarItem?.dispose()
    this.statusBarItem = undefined
    this.initialized = false
  }
}

export const manageService = new ManageService()
