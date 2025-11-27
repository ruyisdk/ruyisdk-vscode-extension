// SPDX-License-Identifier: Apache-2.0
/**
 * Manage Ruyi Path Command
 *
 * Provides a command to detect and manage the Ruyi SDK installation path.
 * Find installations in the PATH and ~/.local/bin paths and allow users to select one.
 */

import { exec } from 'child_process'
import * as path from 'path'
import { promisify } from 'util'
import * as vscode from 'vscode'

import { configuration } from '../common/configuration'
import { logger } from '../common/logger'

const execAsync = promisify(exec)

/**
 * Status bar item for managing Ruyi path
 */
let statusBarItem: vscode.StatusBarItem | undefined

/**
 * Detects all Ruyi installations by scanning PATH environment variable and ~/.local/bin
 * @returns Array of absolute paths to ruyi executables
 */
async function detectRuyiInstallations(): Promise<string[]> {
  try {
    logger.info(`Scanning for RuyiSDK installations...`)
    const foundPaths: string[] = []
    const seenPaths = new Set<string>()

    // Helper function to check and add a ruyi path
    const checkAndAddPath = async (dir: string) => {
      try {
        const ruyiPath = path.join(dir, 'ruyi')
        // Skip if already found (deduplicate)
        if (seenPaths.has(ruyiPath)) {
          return
        }
        // Check if file exists and is accessible
        const uri = vscode.Uri.file(ruyiPath)
        const stat = await vscode.workspace.fs.stat(uri)
        // Verify it's a file (not a directory)
        if (stat.type === vscode.FileType.File) {
          foundPaths.push(ruyiPath)
          seenPaths.add(ruyiPath)
          logger.info(`Found RuyiSDK at: ${ruyiPath}`)
        }
      }
      catch {
        // File doesn't exist in this directory, continue
      }
    }

    // First, scan ~/.local/bin directory (common installation location on Linux)
    const homeDir = process.env.HOME
    if (homeDir) {
      const localBinDir = path.join(homeDir, '.local', 'bin')
      await checkAndAddPath(localBinDir)
    }

    // Then scan PATH environment variable
    const pathEnv = process.env.PATH
    if (pathEnv) {
      const pathDirs = pathEnv.split(path.delimiter).filter(dir => dir.trim())
      for (const dir of pathDirs) {
        await checkAndAddPath(dir)
      }
    }
    else {
      logger.warn('PATH environment variable is not set')
    }

    logger.info(`Found ${foundPaths.length} RuyiSDK installation(s)`)
    return foundPaths
  }
  catch (error) {
    logger.error('Failed to scan for RuyiSDK installations', error)
    return []
  }
}

/**
 * Gets the version string for a given ruyi path
 */
async function getRuyiVersion(ruyiPath: string): Promise<string | null> {
  try {
    const result = await execAsync(`"${ruyiPath}" --version`)
    const versionLine = result.stdout.split('\n', 1)[0]?.trim()
    return versionLine || null
  }
  catch (error) {
    logger.warn(`Failed to get version for ${ruyiPath}`, error)
    return null
  }
}

/**
 * Version object for comparison
 */
interface Version {
  major: number
  minor: number
  patch: number
}

/**
 * Parses version string and extracts semantic version for comparison
 * @param versionStr Version string like "Ruyi 0.11.0 (rev 0bc23bd)"
 * @returns Object with major, minor, patch numbers, or null if parsing fails
 */
function parseVersion(versionStr: string): Version | null {
  try {
    // Extract version number from strings like "Ruyi 0.11.0 (rev 0bc23bd)" or "0.11.0"
    const match = versionStr.match(/(\d+)\.(\d+)\.(\d+)/)
    if (match) {
      return {
        major: Number.parseInt(match[1], 10),
        minor: Number.parseInt(match[2], 10),
        patch: Number.parseInt(match[3], 10),
      }
    }
    return null
  }
  catch {
    return null
  }
}

/**
 * Compares two version objects
 * @returns positive if v1 > v2, negative if v1 < v2, 0 if equal
 */
function compareVersions(v1: Version, v2: Version): number {
  if (v1.major !== v2.major) return v1.major - v2.major
  if (v1.minor !== v2.minor) return v1.minor - v2.minor
  return v1.patch - v2.patch
}

/**
 * Automatically selects the latest RuyiSDK installation if no path is configured
 * This runs silently during initialization
 */
async function autoSelectLatestRuyiSDK(): Promise<void> {
  try {
    // Only auto-select if user hasn't manually configured a path
    const currentPath = configuration.ruyiPath
    if (currentPath) {
      logger.info('RuyiSDK path already configured, skipping auto-selection')
      return
    }

    logger.info('Auto-selecting latest RuyiSDK installation...')
    const installations = await detectRuyiInstallations()

    if (installations.length === 0) {
      logger.info('No RuyiSDK installations found for auto-selection')
      return
    }

    // Get version for each installation
    interface InstallationWithVersion {
      path: string
      version: string
      parsedVersion: Version | null
    }

    const installationsWithVersions: InstallationWithVersion[] = []
    for (const installPath of installations) {
      const version = await getRuyiVersion(installPath)
      if (version) {
        const parsedVersion = parseVersion(version)
        installationsWithVersions.push({
          path: installPath,
          version,
          parsedVersion,
        })
      }
    }

    if (installationsWithVersions.length === 0) {
      logger.warn('No RuyiSDK installations with valid versions found')
      return
    }

    // Find the installation with the highest version
    let latestInstallation = installationsWithVersions[0]
    for (const installation of installationsWithVersions) {
      if (
        latestInstallation.parsedVersion
        && installation.parsedVersion
        && compareVersions(installation.parsedVersion, latestInstallation.parsedVersion) > 0
      ) {
        latestInstallation = installation
      }
    }

    // Set the latest installation as the configured path
    // Use skipReload=true to avoid prompting during auto-selection
    await setRuyiPath(latestInstallation.path, true)

    logger.info(
      `Auto-selected latest RuyiSDK: ${latestInstallation.version} at ${latestInstallation.path}`,
    )
  }
  catch (error) {
    logger.error('Failed to auto-select latest RuyiSDK', error)
  }
}

/**
 * Updates the status bar item text based on current configuration
 */
async function updateStatusBarItem() {
  if (!statusBarItem) return
  const currentPath = configuration.ruyiPath
  if (currentPath) {
    const basename = path.basename(currentPath)
    const dirname = path.dirname(currentPath)

    // Try to get version information
    const version = await getRuyiVersion(currentPath)

    if (version) {
      // Extract just the version number if possible
      const versionMatch = version.match(/(\d+\.\d+\.\d+)/)
      const versionStr = versionMatch ? versionMatch[1] : version
      statusBarItem.text = `$(tools) RuyiSDK ${versionStr}`
      statusBarItem.tooltip = `RuyiSDK ${version}\nPath: ${dirname}`
    }
    else {
      statusBarItem.text = `$(tools) ${basename}`
      statusBarItem.tooltip = `RuyiSDK: ${dirname}`
    }
  }
  else {
    statusBarItem.text = '$(tools) <No RuyiSDK>'
    statusBarItem.tooltip = 'Click to select RuyiSDK installation'
  }
}

/**
 * Command handler to manage Ruyi path
 */
async function manageRuyiPath() {
  try {
    // Show progress while detecting installations
    const installations = await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Detecting RuyiSDK installations...',
      cancellable: false,
    }, async () => {
      return await detectRuyiInstallations()
    })
    if (installations.length === 0) {
      const choice = await vscode.window.showInformationMessage(
        'No RuyiSDK installations found. Choose an option:',
        'Install RuyiSDK',
        'Enter Path Manually',
      )
      if (choice === 'Install RuyiSDK') {
        await vscode.commands.executeCommand('ruyi.install')
      }
      else if (choice === 'Enter Path Manually') {
        const manualPath = await vscode.window.showInputBox({
          prompt: 'Enter the full path to the ruyi executable',
          placeHolder: '/path/to/ruyi',
          validateInput: (value) => {
            if (!value || value.trim() === '') {
              return 'Path cannot be empty'
            }
            if (!path.isAbsolute(value)) {
              return 'Please provide an absolute path'
            }
            return null
          },
        })
        if (manualPath) {
          await setRuyiPath(manualPath.trim())
        }
      }
      return
    }

    // Create quick pick items with version information
    interface RuyiPathItem extends vscode.QuickPickItem {
      path: string
    }

    // Get version information for each installation
    const items: RuyiPathItem[] = []
    for (const p of installations) {
      const version = await getRuyiVersion(p)
      const versionStr = version ? ` (${version})` : ''
      items.push({
        label: `$(package) ${path.basename(p)}${versionStr}`,
        description: path.dirname(p),
        detail: version ? `Version: ${version}` : p,
        path: p,
      })
    }

    // Add option to clear the setting
    const currentPath = configuration.ruyiPath
    if (currentPath) {
      items.unshift({
        label: '$(clear-all) Clear Setting (Use Auto-detection)',
        description: 'Remove custom path and use automatic detection',
        detail: '',
        path: '',
      })
    }

    // Add manual input option
    items.push({
      label: '$(edit) Manual Input',
      description: 'Enter a custom path manually',
      detail: '',
      path: '__manual__',
    })

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select RuyiSDK installation',
      matchOnDescription: true,
      matchOnDetail: true,
    })

    if (!selected) {
      return // User cancelled
    }

    if (selected.path === '__manual__') {
      const manualPath = await vscode.window.showInputBox({
        prompt: 'Enter the full path to the ruyi executable',
        placeHolder: '/path/to/ruyi',
        value: currentPath || '',
        validateInput: (value) => {
          if (!value || value.trim() === '') {
            return 'Path cannot be empty'
          }
          if (!path.isAbsolute(value)) {
            return 'Please provide an absolute path'
          }
          return null
        },
      })

      if (manualPath) {
        await setRuyiPath(manualPath.trim())
      }
    }
    else if (selected.path === '') {
      // Clear setting
      await setRuyiPath('')
    }
    else {
      // Set selected path
      await setRuyiPath(selected.path)
    }
  }
  catch (error) {
    logger.error('Failed to manage Ruyi path', error)
    vscode.window.showErrorMessage(`Failed to manage RuyiSDK path: ${error}`)
  }
}

/**
 * Sets the Ruyi path configuration
 * @param path The path to set, or empty string to clear
 * @param skipReload If true, won't automatically reload the window
 */
async function setRuyiPath(path: string, skipReload = false) {
  try {
    const config = vscode.workspace.getConfiguration('ruyi')
    await config.update('ruyiPath', path, vscode.ConfigurationTarget.Global)

    // Update status bar immediately
    await updateStatusBarItem()

    // Only show reload prompt if needed and not skipped
    if (!skipReload) {
      const message = path
        ? `RuyiSDK path set to: ${path}`
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
    else {
      logger.info(path ? `RuyiSDK path set to: ${path}` : 'RuyiSDK path cleared')
    }
  }
  catch (error) {
    logger.error('Failed to update Ruyi path configuration', error)
    vscode.window.showErrorMessage(`Failed to update configuration: ${error}`)
  }
}

/**
 * Registers the manage Ruyi path command and creates status bar item
 */
export default function registerManageRuyiPathCommand(
  context: vscode.ExtensionContext,
): void {
  // Register command
  const command = vscode.commands.registerCommand(
    'ruyi.manageRuyiPath',
    manageRuyiPath,
  )
  context.subscriptions.push(command)

  // Create status bar item
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100, // Priority
  )
  statusBarItem.command = 'ruyi.manageRuyiPath'

  // Initialize status bar text
  updateStatusBarItem()

  // Show status bar item
  statusBarItem.show()
  context.subscriptions.push(statusBarItem)

  // Listen for configuration changes to update status bar
  const configListener = configuration.registerConfigChangeHandler((event) => {
    if (event.affectsConfiguration('ruyi.ruyiPath')) {
      updateStatusBarItem()
    }
  })
  context.subscriptions.push(configListener)

  // Auto-select latest RuyiSDK on first initialization
  // Run asynchronously to not block extension activation
  autoSelectLatestRuyiSDK().catch((error) => {
    logger.error('Failed to auto-select latest RuyiSDK during initialization', error)
  })

  logger.info('Manage Ruyi path command registered')
}
