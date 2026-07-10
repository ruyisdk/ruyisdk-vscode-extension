// SPDX-License-Identifier: Apache-2.0
import { execFile } from 'node:child_process'
import { access, constants, realpath } from 'node:fs/promises'
import { promisify } from 'node:util'
import * as path from 'path'
import * as vscode from 'vscode'

import * as semver from 'semver'

import { configuration } from '../common/configuration'
import { CONFIG_KEYS } from '../common/constants'
import { fullKey } from '../common/helpers'
import { logger } from '../common/logger'
import { resolveActiveRuyi } from '../ruyi'

const execFileAsync = promisify(execFile)

/**
 * GitHub Release information
 */
export interface GitHubRelease {
  tag_name: string
  prerelease: boolean
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

interface ListInstallationsOptions {
  includeTags?: boolean
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

    const data = await response.json() as GitHubRelease[]
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
function determineVersionTags(version: string, releases: GitHubRelease[]): string[] {
  const currentVersion = semver.coerce(version)
  if (!currentVersion) {
    return []
  }

  const versionMatch = version.match(/(\d+\.\d+\.\d+[^\s]*)/)
  const fullVersionString = versionMatch ? versionMatch[1] : currentVersion.version
  const matchingRelease = releases.find((release) => {
    const tagWithoutV = release.tag_name.replace(/^v/, '')
    return tagWithoutV === fullVersionString || release.tag_name === fullVersionString
  })

  if (matchingRelease?.prerelease) {
    return ['$(beaker) ' + vscode.l10n.t('Prereleased')]
  }

  const stableVersions = releases
    .filter(release => !release.prerelease)
    .map(release => semver.coerce(release.tag_name.replace(/^v/, '')))
    .filter((version): version is semver.SemVer => version !== null)
    .sort(semver.rcompare)

  const latestThreeStable = stableVersions.slice(0, 3).map(v => v.version)
  const isOutdated = !latestThreeStable.includes(currentVersion.version)
    && (matchingRelease !== undefined
      || (stableVersions[0] !== undefined && semver.lt(currentVersion, stableVersions[0])))

  return isOutdated ? ['$(warning) ' + vscode.l10n.t('Outdated')] : []
}

/**
 * Get version string from a Ruyi executable
 */
async function getRuyiVersion(ruyiPath: string): Promise<string | undefined> {
  try {
    const result = await execFileAsync(ruyiPath, ['--version'])
    const versionLine = result.stdout.split(/\r?\n/, 1)[0]?.trim()
    return versionLine || undefined
  }
  catch (error) {
    logger.warn(`Failed to get version for ${ruyiPath}`, error)
    return undefined
  }
}

async function findRuyiExecutable(directory: string): Promise<string | null> {
  const candidate = path.join(directory, 'ruyi')

  try {
    await access(candidate, constants.X_OK)
    return await realpath(candidate).catch(() => candidate)
  }
  catch {
    return null
  }
}

function getRuyiSearchDirectories(): string[] {
  const directories = process.env.PATH?.split(path.delimiter).filter(Boolean) ?? []
  if (!process.env.PATH) {
    logger.warn('PATH environment variable is not set')
  }

  if (process.env.HOME) {
    directories.unshift(path.join(process.env.HOME, '.local', 'bin'))
  }

  return [...new Set(directories)]
}

/**
 * List all RuyiSDK installations with version information
 * Installations are sorted by version (newest first)
 */
export async function listAllInstallations(options: ListInstallationsOptions = {}): Promise<RuyiInstallation[]> {
  logger.info('Scanning for RuyiSDK installations...')

  const includeTags = options.includeTags ?? true

  const resolvedCandidates = await Promise.all(
    getRuyiSearchDirectories().map(findRuyiExecutable),
  )
  const candidates = [...new Set(
    resolvedCandidates.filter((candidate): candidate is string => candidate !== null),
  )]
  const githubReleasesPromise = includeTags && candidates.length > 0
    ? fetchGitHubReleases()
    : Promise.resolve<GitHubRelease[]>([])

  const [githubReleases, versionedInstallations] = await Promise.all([
    githubReleasesPromise,
    Promise.all(
      candidates.map(async (candidate) => {
        const version = await getRuyiVersion(candidate)
        return {
          path: candidate,
          version,
          parsedVersion: version ? semver.coerce(version) ?? undefined : undefined,
        }
      }),
    ),
  ])

  const installations: RuyiInstallation[] = versionedInstallations.map(installation => ({
    ...installation,
    tags: installation.version && githubReleases.length > 0
      ? determineVersionTags(installation.version, githubReleases)
      : [],
  }))

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
  }
}

export class ManageService implements vscode.Disposable {
  private statusBarItem?: vscode.StatusBarItem
  private readonly disposables: vscode.Disposable[] = []
  private initialized = false

  public initialize(): void {
    if (this.initialized) {
      return
    }

    this.initialized = true
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      1000,
    )
    this.statusBarItem.command = 'ruyi.setup.manage'
    this.statusBarItem.text = '$(tools) ' + vscode.l10n.t('<No RuyiSDK>')
    this.statusBarItem.tooltip = vscode.l10n.t('Click to select RuyiSDK installation')
    this.statusBarItem.show()

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

  public async setRuyiPath(newPath: string): Promise<void> {
    try {
      const config = vscode.workspace.getConfiguration('ruyi')
      // Use undefined to remove the setting, empty string won't work
      await config.update(
        CONFIG_KEYS.RUYI_PATH,
        newPath || undefined,
        vscode.ConfigurationTarget.Global,
      )

      const message = newPath
        ? vscode.l10n.t('RuyiSDK path set to: {0}', newPath)
        : vscode.l10n.t('RuyiSDK path cleared. Using automatic detection.')

      const choice = await vscode.window.showInformationMessage(
        message,
        vscode.l10n.t('Reload Window'),
        vscode.l10n.t('Later'),
      )

      if (choice === vscode.l10n.t('Reload Window')) {
        await vscode.commands.executeCommand('workbench.action.reloadWindow')
      }
    }
    catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      logger.error('Failed to update Ruyi path configuration', error)
      vscode.window.showErrorMessage(vscode.l10n.t('Failed to update configuration: {0}', reason))
    }
  }

  public async updateStatusBarItem(): Promise<void> {
    if (!this.statusBarItem) {
      return
    }

    const configuredPath = configuration.ruyiPath
    const currentPath = configuredPath ?? await resolveActiveRuyi()

    if (!currentPath) {
      this.statusBarItem.text = '$(tools) ' + vscode.l10n.t('<No RuyiSDK>')
      this.statusBarItem.tooltip = vscode.l10n.t('Click to select RuyiSDK installation')
      return
    }

    const version = await getRuyiVersion(currentPath)
    if (version) {
      // Extract full version string including prerelease suffix
      const match = version.match(/(\d+\.\d+\.\d+[^\s]*)/)
      const versionLabel = match ? match[1] : version.replace(/^Ruyi\s+/i, '')
      const pathInfo = configuredPath
        ? vscode.l10n.t('Path: {0}', path.dirname(currentPath))
        : vscode.l10n.t('Auto-detected: {0}', path.dirname(currentPath))
      this.statusBarItem.text = `$(tools) RuyiSDK ${versionLabel}`
      this.statusBarItem.tooltip = `RuyiSDK ${version}\n${pathInfo}`
    }
    else {
      const pathInfo = configuredPath ? 'RuyiSDK' : vscode.l10n.t('RuyiSDK (Auto-detected)')
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
