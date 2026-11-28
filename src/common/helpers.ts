// SPDX-License-Identifier: Apache-2.0
/**
 * RuyiSDK VS Code Extension - Helper Functions
 *
 * Responsibilities:
 *  - Provide common utility functions for the extension.
 */
import * as vscode from 'vscode'

import ruyi from '../ruyi'

import { ConfigKey } from './constants'
import { parseCurlProgressDetails } from './curl.helper'
import { formatSize } from './format.helper'

/** Get the path of the first workspace folder,
 *  or return an error message if none is open.
 *
 *  @returns The workspace folder path, or an error message string.
 */
export function getWorkspaceFolderPath(): string {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0]
  if (!workspaceFolder) {
    throw new Error(vscode.l10n.t(
      'No workspace folder is open in VSCode. A workspace folder is needed to run the command.',
    ))
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
export async function createProgressTracker(
  progress: vscode.Progress<{ message?: string, increment?: number }>,
): Promise<[progressCallback: (lastLine: string) => void, getLastPercent: () => number]> {
  let lastPercent = 0
  const ruyiVersion = await ruyi.version() || '0.0.0'
  const startTime = Date.now()

  const progressCallback = (lastLine: string) => {
    let details = null
    if (ruyiVersionIsAbove(ruyiVersion, '0.56.0')) {
      details = parseRequestsProgress(startTime, lastLine)
    }
    else {
      details = parseCurlProgressDetails(lastLine)
    }
    if (details) {
      // Clamp percent to 100 to prevent overflow
      const percent = Math.min(100, (details.current / details.total) * 100)
      const clampedPercent = Math.min(percent, 100)
      const message = formatProgress(details)
      if (clampedPercent > lastPercent) {
        const increment = clampedPercent - lastPercent
        lastPercent = clampedPercent
        progress.report({ increment, ...(message && { message }) })
      }
      else if (message) {
        progress.report({ message })
      }
    }
  }

  const getLastPercent = () => lastPercent

  return [progressCallback, getLastPercent]
}

export interface DownloadProgress {
  // Bytes downloaded so far
  current: number

  // Total bytes to download
  total: number

  // Download speed in bytes per second
  speed: number
}

function parseRequestsProgress(startTime: number, line: string): DownloadProgress | null {
  const json = JSON.parse(line)
  if (json.ty !== 'downloadprogress-v1') {
    return null
  }
  const speed = json.progress_bytes / ((Date.now() - startTime) / 1000)
  return {
    total: json.total_bytes || 0,
    current: json.progress_bytes || 0,
    speed,
  }
}

function formatProgress(progress: DownloadProgress): string {
  const remaining = formatDuration(Math.ceil(progress.total / progress.speed))
  return vscode.l10n.t(
    'Downloaded {0} of {1} ({2}/s, {3} remaining)',
    formatSize(progress.current),
    formatSize(progress.total),
    formatSize(progress.speed),
    remaining,
  )
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60
  if (hours > 0) return `${hours}h ${minutes}m ${remainingSeconds}s`
  if (minutes > 0) return `${minutes}m ${remainingSeconds}s`
  return `${remainingSeconds}s`
}

export async function isNetworkAvailable(): Promise<boolean> {
  try {
    await fetch('https://detectportal.firefox.com/success.txt', {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
    })
    return true
  }
  catch {
    return false
  }
}

export function isVirtualWorkspace(): boolean {
  const folders = vscode.workspace.workspaceFolders
  return !!folders && folders.every(f => f.uri.scheme !== 'file')
}

export function ruyiVersionIsAbove(current: string, expected: string): boolean {
  if (!current) {
    return false
  }

  const actual = current.split('-')[0].split('+')[0]
  const [actualMajor, actualMinor, actualPatch] = actual.split('.').map(Number)
  const [expectedMajor, expectedMinor, expectedPatch] = expected.split('.').map(Number)

  if (actualMajor > expectedMajor) return true
  if (actualMajor < expectedMajor) return false

  if (actualMinor > expectedMinor) return true
  if (actualMinor < expectedMinor) return false

  return actualPatch >= expectedPatch
}
