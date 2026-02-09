// SPDX-License-Identifier: Apache-2.0
/**
 * RuyiSDK VS Code Extension - Venv Module - Venv Detection Helper
 *
 * Provides stateless helper functions for detecting Ruyi virtual environments
 * in the workspace. These functions return data only and do NOT update global
 * state or UI.
 */

import * as path from 'path'
import * as vscode from 'vscode'

import { getWorkspaceFolderPath } from '../common/helpers'
import { logger } from '../common/logger'

import type { VenvInfo } from './types'

/**
 * Lists all directories in the given URI.
 * @param uri - The directory URI to scan
 * @returns Array of directory names
 */
export async function listDirectories(uri: vscode.Uri): Promise<string[]> {
  const entries = await vscode.workspace.fs.readDirectory(uri)
  return entries
    .filter(([, type]) => type === vscode.FileType.Directory)
    .map(([name]) => name)
}

/**
 * Checks if a path segment is safe (prevents path traversal attacks).
 * @param pathSegment - The path segment to validate
 * @returns True if the path is safe, false otherwise
 */
export function isPathSafe(pathSegment: string): boolean {
  if (!pathSegment || pathSegment.length === 0) return false
  if (pathSegment.includes('..') || pathSegment.includes('\0')) return false
  if (pathSegment === '.' || pathSegment.startsWith('/')) return false
  return true
}

/**
 * Checks if a directory is a valid Ruyi venv by looking for bin/ruyi-activate.
 * @param workspacePath - The workspace root path
 * @param dir - The directory path relative to workspace
 * @returns VenvInfo if valid venv, null otherwise
 */
export async function checkIsVenv(
  workspacePath: string,
  dir: string,
): Promise<VenvInfo | null> {
  const segments = dir.split('/')
  if (!segments.every(isPathSafe)) {
    logger.warn(`Skipping unsafe path: ${dir}`)
    return null
  }

  const binPath = path.join(workspacePath, dir, 'bin')
  const activatePath = path.join(binPath, 'ruyi-activate')

  try {
    const activateUri = vscode.Uri.file(activatePath)
    await vscode.workspace.fs.stat(activateUri)
    // Use the basename of the venv directory as the venv name
    const venvName = path.basename(dir)
    return { path: dir, name: venvName }
  }
  catch {
    return null
  }
}

/**
 * Scans the workspace for Ruyi virtual environments.
 * Iterates through 1st and 2nd level subdirectories to find venvs.
 * A directory is considered a Ruyi venv if it contains a "bin" subdirectory
 * which contains a "ruyi-activate" file.
 *
 * @returns Array of VenvInfo objects for detected venvs
 */
export async function scanWorkspaceForVenvs(): Promise<VenvInfo[]> {
  const foundVenvs: VenvInfo[] = []

  try {
    const workspacePath = getWorkspaceFolderPath()

    // Get first-level subdirectories
    const subdirectories = await listDirectories(vscode.Uri.file(workspacePath))

    // Get second-level subdirectories
    const subSubDirArrays = await Promise.all(
      subdirectories.map(async (subdir) => {
        try {
          const subdirUri = vscode.Uri.file(path.join(workspacePath, subdir))
          const names = await listDirectories(subdirUri)
          return names.map(name => `${subdir}/${name}`)
        }
        catch (e) {
          logger.warn(`Failed to read ${subdir}: ${e}`)
          return []
        }
      }),
    )
    const subSubdirectories = subSubDirArrays.flat()

    // Combine first and second level directories
    const allDirsToCheck = [...subdirectories, ...subSubdirectories]

    // Check each directory for venv
    const venvChecks = await Promise.all(
      allDirsToCheck.map(dir => checkIsVenv(workspacePath, dir)),
    )

    // Filter out null results
    for (const venv of venvChecks) {
      if (venv) {
        foundVenvs.push(venv)
      }
    }
  }
  catch (e) {
    logger.error(`Failed to detect venvs: ${e}`)
  }

  return foundVenvs
}
