// SPDX-License-Identifier: Apache-2.0
/**
 * RuyiSDK VS Code Extension - Helper Functions
 *
 * Responsibilities:
 *  - Provide common utility functions for the extension.
 */
import * as vscode from 'vscode'

import { ConfigKey } from './constants'

/** Get the path of the first workspace folder,
 *  or return an error message if none is open.
 *
 *  @returns The workspace folder path, or an error message string.
 */
export function getWorkspaceFolderPath(): string {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0]
  if (!workspaceFolder) {
    throw new Error('No workspace folder is open in VSCode. A workspace folder is needed to run the command.')
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
    const details = parseDownloadProgressDetails(lastLine)
    const percent = details?.percent ?? parseDownloadProgressPercent(lastLine)
    if (percent !== null) {
      // Clamp percent to 100 to prevent overflow
      const clampedPercent = Math.min(percent, 100)
      if (clampedPercent > lastPercent) {
        const increment = clampedPercent - lastPercent
        lastPercent = clampedPercent
        progress.report({ increment, ...(details && { message: formatDownloadProgress(details) }) })
      }
      else if (details) {
        progress.report({ message: formatDownloadProgress(details) })
      }
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
  return parseDownloadProgressDetails(line)?.percent ?? parseDownloadProgressPercent(line)
}

function parseDownloadProgressPercent(line: string): number | null {
  const match = line.match(/^\s*(\d{1,3})\s+\d+/)
  if (!match) return null

  const percent = Number.parseInt(match[1], 10)
  return percent >= 0 && percent <= 100 ? percent : null
}

interface DownloadProgressDetails {
  percent: number
  totalBytes: number
  downloadedBytes: number
  speedBytesPerSecond: number
  remainingSeconds: number
}

function parseDownloadProgressDetails(line: string): DownloadProgressDetails | null {
  const fields = line.trim().split(/\s+/)
  if (fields.length < 12) return null

  const percent = Number.parseInt(fields[0], 10)
  const totalBytes = parseCurlSize(fields[1])
  const downloadedBytes = parseCurlSize(fields[3])
  const speedBytesPerSecond = parseCurlSize(fields[11])
  const remainingSeconds = parseCurlDuration(fields[10])

  if ([percent, totalBytes, downloadedBytes, speedBytesPerSecond, remainingSeconds].some(Number.isNaN)
    || percent < 0 || percent > 100) {
    return null
  }

  return { percent, totalBytes, downloadedBytes, speedBytesPerSecond, remainingSeconds }
}

function parseCurlSize(value: string): number {
  const match = value.match(/^(\d+(?:\.\d+)?)([kKmMgGtTpP]?)$/)
  if (!match) return Number.NaN

  const units = ['', 'k', 'm', 'g', 't', 'p']
  const unitIndex = units.indexOf(match[2].toLowerCase())
  return Number.parseFloat(match[1]) * Math.pow(1000, unitIndex)
}

function parseCurlDuration(value: string): number {
  const parts = value.split(':').map(Number)
  if (parts.length !== 3 || parts.some(Number.isNaN)) return Number.NaN
  return parts[0] * 3600 + parts[1] * 60 + parts[2]
}

function formatDownloadProgress(details: DownloadProgressDetails): string {
  const remaining = details.remainingSeconds === 0 ? '0s' : formatDuration(details.remainingSeconds)
  return `${vscode.l10n.t(
    'Downloaded {0} of {1} ({2}/s, {3} remaining)',
    formatBytes(details.downloadedBytes),
    formatBytes(details.totalBytes),
    formatBytes(details.speedBytesPerSecond),
    remaining,
  )}`
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'kB', 'MB', 'GB', 'TB', 'PB']
  const unitIndex = Math.min(Math.floor(Math.log10(bytes) / 3), units.length - 1)
  const value = bytes / Math.pow(1000, unitIndex)
  const formatted = Number.isInteger(value) ? value.toString() : value.toFixed(2).replace(/\.?0+$/, '')
  return `${formatted} ${units[unitIndex]}`
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
