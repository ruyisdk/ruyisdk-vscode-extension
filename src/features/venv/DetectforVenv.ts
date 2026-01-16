// SPDX-License-Identifier: Apache-2.0
/**
 * RuyiSDK VS Code Extension - Venv Module - Venv Detection Utility
 *
 * Provides helpers used by the commands layer:
 * - detectVenv(): Detect Ruyi venvs in the current workspace
 * Iterates through 1st and 2nd level subdirectories to find venvs
 * If a subdirectory contains a "bin" subdirectory
 * which contains a "ruyi-activate" file,
 * it is considered a Ruyi venv.
 * Under this circumstance, we will record the relative path,
 * and use the folder name (basename) as the venv name.
 * We can return multiple venvs if found.
 */

import * as path from 'path'
import * as vscode from 'vscode'

import { getWorkspaceFolderPath } from '../../common/helpers'
import { logger } from '../../common/logger'

export async function detectVenv(): Promise<string[][]> {
  const foundVenvs: string[][] = []

  try {
    const workspacePath = getWorkspaceFolderPath()

    const listDirectories = async (uri: vscode.Uri): Promise<string[]> => {
      const entries = await vscode.workspace.fs.readDirectory(uri)
      return entries
        .filter(([, type]) => type === vscode.FileType.Directory)
        .map(([name]) => name)
    }

    const subdirectories = await listDirectories(vscode.Uri.file(workspacePath))

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

    const allDirsToCheck = [...subdirectories, ...subSubdirectories]

    // Add security check to prevent path traversal
    const isPathSafe = (pathSegment: string): boolean => {
      if (!pathSegment || pathSegment.length === 0) return false
      if (pathSegment.includes('..') || pathSegment.includes('\0')) return false
      if (pathSegment === '.' || pathSegment.startsWith('/')) return false
      return true
    }

    for (const dir of allDirsToCheck) {
      const segments = dir.split('/')
      if (!segments.every(isPathSafe)) {
        logger.warn(`Skipping unsafe path: ${dir}`)
        continue
      }

      const binPath = path.join(workspacePath, dir, 'bin')
      const activatePath = path.join(binPath, 'ruyi-activate')
      try {
        const activateUri = vscode.Uri.file(activatePath)
        await vscode.workspace.fs.stat(activateUri) // ensure the existence of activatePath. not exist -> exception
        // Use the basename of the venv directory as the venv name
        const venvName = path.basename(dir)
        foundVenvs.push([dir, venvName])
      }
      catch {
        // pass
      }
    }
  }
  catch (e) {
    logger.error(`Failed to detect venvs: ${e}`)
  }

  return foundVenvs
}
