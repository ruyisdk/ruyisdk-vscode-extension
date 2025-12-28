// SPDX-License-Identifier: Apache-2.0
/**
 * Venv Terminal Management Service
 *
 * Manages a dedicated terminal for Ruyi venv activation and deactivation.
 * State management is handled by VenvState (centralized state manager).
 */

import * as path from 'path'
import * as vscode from 'vscode'

import { getWorkspaceFolderPath } from '../../common/helpers'
import { venvState } from '../../features/venv/models/VenvState'

let ruyiTerminal: vscode.Terminal | null

export default function registerTerminalHandlerCommand(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.window.onDidCloseTerminal((closedTerminal) => {
      if (closedTerminal === ruyiTerminal) {
        ruyiTerminal = null
        venvState.setCurrentVenv(null)
      }
    }),
  )
}

/**
 * Manage the Ruyi terminal for venv activation/deactivation.
 *
 * @param venvPath The path to activate (relative or absolute), or null to deactivate.
 */
export function manageRuyiTerminal(venvPath: string | null) {
  let workspaceRoot: string
  try {
    workspaceRoot = getWorkspaceFolderPath()
  }
  catch {
    vscode.window.showWarningMessage('Open a workspace folder before activating a Ruyi venv.')
    return
  }

  const absPath = venvPath
    ? (path.isAbsolute(venvPath) ? venvPath : path.resolve(workspaceRoot, venvPath))
    : null
  const currentVenv = venvState.getCurrentVenv()

  if (!ruyiTerminal) {
    if (absPath) {
      ruyiTerminal = vscode.window.createTerminal({
        name: 'Ruyi Venv Terminal',
        shellPath: '/bin/bash',
        cwd: workspaceRoot,
      })
      ruyiTerminal.show()
    }
    else {
      venvState.setCurrentVenv(null)
      return
    }
  }

  if (absPath === null) {
    if (currentVenv) {
      ruyiTerminal.sendText('ruyi-deactivate')
      venvState.setCurrentVenv(null)
    }
    else {
      venvState.setCurrentVenv(null)
    }
    return
  }

  if (currentVenv && path.normalize(absPath) === path.normalize(currentVenv)) {
    return
  }

  if (currentVenv) {
    // Set state immediately to prevent race conditions with rapid operations
    venvState.setCurrentVenv(absPath)
    ruyiTerminal.sendText('ruyi-deactivate')
    setTimeout(() => {
      if (ruyiTerminal) {
        ruyiTerminal.sendText(`source "${absPath}/bin/ruyi-activate"`)
      }
    }, 100)
  }
  else {
    venvState.setCurrentVenv(absPath)
    ruyiTerminal.sendText(`source "${absPath}/bin/ruyi-activate"`)
  }
}
