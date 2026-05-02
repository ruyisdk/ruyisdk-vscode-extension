// SPDX-License-Identifier: Apache-2.0
/**
 * RuyiSDK VS Code Extension - Helper Functions
 *
 * Responsibilities:
 *  - Provide common utility functions for the extension.
 */
import path from 'path'
import * as vscode from 'vscode'

import { ConfigKey } from './constants'

/**
 * Options for the pickFile function.
 */
export type PickFileOptions = {
  initPath?: string
  absolute?: boolean
}

/** Get the path of the first workspace folder,
 *  or return an error message if none is open.
 *
 *  @returns The workspace folder path, or an error message string.
 */
export function getWorkspaceFolderPath(): string {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0]
  if (!workspaceFolder) {
    throw `Exception: No workspace folder is open in VSCode.
      We need a workspace folder to run the command in context.`
  }
  const workspacePath = workspaceFolder.uri.fsPath
  return workspacePath
}

/**
 * Helper function to get the full configuration key string.
 * @param key A key from CONFIG_KEYS
 * @returns The full key, e.g., "ruyi.checkForUpdates"
 */

export function fullKey(key: ConfigKey): `ruyi.${string}` {
  return `ruyi.${key}`
}

/**
 * Parse NDJSON (Newline Delimited JSON) output.
 *
 * This is a common pattern for parsing ruyi CLI output with --porcelain flag.
 * Each line is a separate JSON object. Invalid lines are skipped silently.
 *
 * @param output The NDJSON string to parse
 * @returns Array of parsed JSON objects (null for invalid lines are filtered out)
 *
 * @example
 * ```typescript
 * interface Package {
 *   ty: string
 *   name: string
 * }
 *
 * const items = parseNDJSON<Package>(output)
 *   .filter(item => item.ty === 'pkglistoutput-v1')
 *   .map(item => item.name)
 * ```
 */
export function parseNDJSON<T>(output: string): T[] {
  return output
    .split('\n')
    .map((line) => {
      try {
        return JSON.parse(line)
      }
      catch {
        // Skip non-JSON lines
        return null
      }
    })
    .filter(item => item !== null)
}

/**
 * Create a progress tracker for download operations.
 *
 * Returns a callback function that parses download progress and updates the progress bar,
 * along with a getter function to retrieve the last recorded percentage.
 *
 * @param progress The VS Code progress object to report to
 * @returns A tuple of [progressCallback, getLastPercent]
 *
 * @example
 * ```typescript
 * const [onProgress, getLastPercent] = createProgressTracker(progress)
 *
 * await ruyi.onProgress(onProgress).install(packageId)
 *
 * // Complete the progress bar if needed
 * const remaining = 100 - getLastPercent()
 * if (remaining > 0) {
 *   progress.report({ increment: remaining })
 * }
 * ```
 */
export function createProgressTracker(
  progress: vscode.Progress<{ message?: string, increment?: number }>,
): [progressCallback: (lastLine: string) => void, getLastPercent: () => number] {
  let lastPercent = 0

  const progressCallback = (lastLine: string) => {
    const percent = parseDownloadProgress(lastLine)
    if (percent !== null && percent > lastPercent) {
      // Clamp percent to 100 to prevent overflow
      const clampedPercent = Math.min(percent, 100)
      const increment = clampedPercent - lastPercent
      lastPercent = clampedPercent
      progress.report({ increment })
    }
  }

  const getLastPercent = () => lastPercent

  return [progressCallback, getLastPercent]
}

/**
 * Parse download progress percentage from curl/ruyi output.
 *
 * Extracts the percentage from curl progress output lines like:
 * "  5  123M    5 6789k    0     0  1234k      0  0:01:40  0:00:05  0:01:35 1234k"
 * The first number (5 in this example) is the download percentage.
 *
 * @param line The output line to parse
 * @returns The percentage (0-100) or null if not found
 *
 * @example
 * ```typescript
 * const percent = parseDownloadProgress("  15  123M   15  18M...")
 * // Returns: 15
 * ```
 */
export function parseDownloadProgress(line: string): number | null {
  const pattern = /^\s*(\d{1,3})\s+\d+/
  const match = line.match(pattern)
  if (match) {
    const percent = Number.parseInt(match[1], 10)
    if (percent >= 0 && percent <= 100) {
      return percent
    }
  }
  return null
}

/**
 * Prompt the user to pick a file or folder from the filesystem using QuickPick.
 *
 * Different from vscode.window.showOpenDialog, this function uses QuickPick to allow the user to copy the path,
 * making it easier to select hidden files or from '/'.
 *
 * @returns The selected file or folder path, or undefined if the user cancels the selection.
 */
export function pickFile(options?: PickFileOptions): Promise<string | undefined> {
  return new Promise((resolve) => {
    const quickPick = vscode.window.createQuickPick()
    let usingFilter = false

    options = options || { absolute: false }
    if (options.absolute) {
      quickPick.value = '/'
    }
    else {
      quickPick.value = './'
    }
    if (options.initPath) {
      quickPick.value = options.initPath
    }

    quickPick.onDidChangeValue(async (value) => {
      let dir: string
      let filter: string | undefined
      const fileType = await getFileType(value)
      if (fileType === vscode.FileType.Directory) {
        dir = value
        usingFilter = false
      }
      else {
        dir = path.dirname(value)
        filter = path.basename(value)
        usingFilter = true
      }
      let children: [string, vscode.FileType][]
      try {
        children = await vscode.workspace.fs.readDirectory(vscode.Uri.file(dir))
      }
      catch {
        children = []
      }
      children = children.sort()
      children.unshift(['..', vscode.FileType.Directory])
      if (filter) {
        children = children.filter(([name]) => name.startsWith(filter))
      }
      quickPick.items = children.map(([name]) => {
        return {
          label: name,
          picked: false,
          alwaysShow: true,
        }
      })
    })

    quickPick.onDidAccept(async () => {
      if (quickPick.selectedItems.length === 0) {
        return
      }
      const sel = quickPick.selectedItems[0]

      if (sel.label === '..') {
        quickPick.value = path.dirname(quickPick.value)
      }
      else {
        const basePath = usingFilter ? path.dirname(quickPick.value) : quickPick.value
        const newPath = path.join(basePath, sel.label)
        const fileType = await getFileType(newPath)
        if (fileType === vscode.FileType.File) {
          resolve(newPath)
          quickPick.hide()
          return
        }
        quickPick.value = newPath
      }
    })

    quickPick.onDidHide(() => {
      resolve(undefined)
      quickPick.dispose()
    })

    quickPick.show()
  })
}

async function getFileType(path: string): Promise<vscode.FileType | undefined> {
  try {
    const stat = await vscode.workspace.fs.stat(vscode.Uri.file(path))
    return stat.type
  }
  catch {
    return undefined
  }
}
