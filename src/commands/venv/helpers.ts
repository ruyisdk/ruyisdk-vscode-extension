// SPDX-License-Identifier: Apache-2.0
/**
 * Venv Command Helpers
 *
 * Shared utility functions for venv commands to reduce code duplication.
 */

import * as path from 'path'
import * as vscode from 'vscode'

import { getWorkspaceFolderPath } from '../../common/helpers'
import { venvState } from '../../features/venv/models/VenvState'

/**
 * Convert a venv path to absolute path and check if it matches the current active venv.
 * @param venvPath The venv path (relative or absolute)
 * @returns Object with absolute path and whether it's currently active, or null if no workspace is open
 */
export function checkVenvStatus(venvPath: string): {
  absPath: string
  isActive: boolean
  currentVenv: string | null
} | null {
  try {
    const workspaceRoot = getWorkspaceFolderPath()
    const absPath = path.isAbsolute(venvPath)
      ? venvPath
      : path.resolve(workspaceRoot, venvPath)
    const currentVenv = venvState.getCurrentVenv()
    const isActive = currentVenv !== null && path.normalize(absPath) === path.normalize(currentVenv)

    return { absPath, isActive, currentVenv }
  }
  catch {
    // No workspace folder is open
    return null
  }
}

/**
 * Subscribe to state change and refresh the venv tree view once.
 * This is a one-time event listener that unsubscribes after the first trigger.
 * IMPORTANT: Must be called BEFORE the action that triggers the state change,
 * otherwise the event might be missed.
 */
export function refreshOnStateChange(): void {
  const unsubscribe = venvState.subscribe(async () => {
    // Unsubscribe immediately to prevent multiple triggers
    unsubscribe()

    // Small delay to ensure terminal command has completed
    setTimeout(async () => {
      try {
        await vscode.commands.executeCommand('ruyi.venv.refresh')
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      catch (error) {
        // Silently handle refresh errors to prevent disruption
        // Error will be logged by the command itself if needed
      }
    }, 50)
  })
}
