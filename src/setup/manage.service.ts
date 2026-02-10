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
 * GitHub Release information
 */
export interface GitHubRelease {
  tag_name: string
  prerelease: boolean
}

/**
 * Raw GitHub API release response
 */
interface GitHubReleaseResponse {
  tag_name: string
  prerelease: boolean
  [key: string]: unknown
}

/**
 * Represents a RuyiSDK installation
 */
export interface RuyiInstallation {
  path: string
  version?: string
  parsedVersion?: semver.SemVer
  tags?: string[]
}

/**
 * Fetch all releases from GitHub
 */
export async function fetchGitHubReleases(): Promise<GitHubRelease[]> {
  try {
    const response = await fetch('https://api.github.com/repos/ruyisdk/ruyi/releases', {
      headers: { 'User-Agent': 'ruyisdk-vscode-extension' },
    })

    if (!response.ok) {
      logger.warn(`Failed to fetch GitHub releases: ${response.statusText}`)
      return []
    }

    const data = await response.json() as GitHubReleaseResponse[]
    const releases: GitHubRelease[] = data.map(release => ({
      tag_name: release.tag_name,
      prerelease: release.prerelease,
    }))

    logger.info(`Fetched ${releases.length} releases from GitHub`)

    return releases
  }
  catch (error) {
    logger.error('Failed to fetch GitHub releases:', error)
    return []
  }
}

/**
 * Determine version tags based on GitHub releases
 * @param version The version string to check
 * @param releases All GitHub releases
 * @returns Array of tags for the version
 */
export function determineVersionTags(version: string, releases: GitHubRelease[]): string[] {
  const tags: string[] = []

  // Parse the current version
  const currentVersion = semver.coerce(version)
  if (!currentVersion) {
    return tags
  }

  // Extract version number from the original version string (e.g., "Ruyi 0.46.0-beta.20260206" -> "0.46.0-beta.20260206")
  const versionMatch = version.match(/(\d+\.\d+\.\d+[^\s]*)/)
  const fullVersionString = versionMatch ? versionMatch[1] : currentVersion.version

  // Extract and sort all stable (non-prerelease) versions
  const stableVersions = releases
    .filter(release => !release.prerelease)
    .map(release => ({
      tag: release.tag_name,
      parsed: semver.coerce(release.tag_name.replace(/^v/, '')),
    }))
    .filter(v => v.parsed !== null)
    .sort((a, b) => semver.rcompare(a.parsed!, b.parsed!))

  // Get the top 3 latest stable versions
  const latestThreeStable = stableVersions.slice(0, 3).map(v => v.parsed!.version)

  // Check if current version matches any release (compare full version string with tag_name)
  const matchingRelease = releases.find((release) => {
    const tagWithoutV = release.tag_name.replace(/^v/, '')
    return tagWithoutV === fullVersionString || release.tag_name === fullVersionString
  })

  if (matchingRelease) {
    // Found matching release
    if (matchingRelease.prerelease) {
      tags.push('$(beaker) Prereleased')
    }
    else if (!latestThreeStable.includes(currentVersion.version)) {
      // It's a stable release but not in the latest 3
      tags.push('$(warning) Outdated')
    }
  }
  else {
    // No matching release found, check if it's older than latest stable
    const latestStableVersion = stableVersions[0]?.parsed
    if (latestStableVersion && semver.lt(currentVersion, latestStableVersion)) {
      // Version is older than the latest stable
      if (!latestThreeStable.includes(currentVersion.version)) {
        tags.push('$(warning) Outdated')
      }
    }
  }

  return tags
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

  // Fetch GitHub releases for version tagging
  const githubReleases = await fetchGitHubReleases()

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
      const parsedVersion = version ? semver.coerce(version) ?? undefined : undefined
      const tags = version && githubReleases.length > 0 ? determineVersionTags(version, githubReleases) : []
      return {
        path: candidate,
        version,
        parsedVersion,
        tags,
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
  const parsedVersion = version ? semver.coerce(version) ?? undefined : undefined

  // Fetch GitHub releases to determine tags
  const githubReleases = await fetchGitHubReleases()
  const tags = version && githubReleases.length > 0 ? determineVersionTags(version, githubReleases) : []

  return {
    path: ruyiPath,
    version,
    parsedVersion,
    tags,
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
  }

  public async setRuyiPath(newPath: string, skipReload?: boolean): Promise<void> {
    try {
      const config = vscode.workspace.getConfiguration('ruyi')
      // Use undefined to remove the setting, empty string won't work
      const valueToSet = newPath || undefined
      await config.update(CONFIG_KEYS.RUYI_PATH, valueToSet, vscode.ConfigurationTarget.Global)

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

    // Try configured path first, then auto-detect
    let currentPath = configuration.ruyiPath
    if (!currentPath) {
      currentPath = await resolveActiveRuyi() ?? undefined
    }

    if (!currentPath) {
      this.statusBarItem.text = '$(tools) <No RuyiSDK>'
      this.statusBarItem.tooltip = 'Click to select RuyiSDK installation'
      return
    }

    const version = await getRuyiVersion(currentPath)
    if (version) {
      // Extract full version string including prerelease suffix
      const match = version.match(/(\d+\.\d+\.\d+[^\s]*)/)
      const versionLabel = match ? match[1] : version.replace(/^Ruyi\s+/i, '')
      const pathInfo = configuration.ruyiPath ? `Path: ${path.dirname(currentPath)}` : `Auto-detected: ${path.dirname(currentPath)}`
      this.statusBarItem.text = `$(tools) RuyiSDK ${versionLabel}`
      this.statusBarItem.tooltip = `RuyiSDK ${version}\n${pathInfo}`
    }
    else {
      const pathInfo = configuration.ruyiPath ? 'RuyiSDK' : 'RuyiSDK (Auto-detected)'
      this.statusBarItem.text = `$(tools) ${path.basename(currentPath)}`
      this.statusBarItem.tooltip = `${pathInfo}: ${path.dirname(currentPath)}`
    }
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
