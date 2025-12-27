// SPDX-License-Identifier: Apache-2.0
/**
 * Venv Terminal Management Helper
 * Not a command by itself
 *
 * Manages a dedicated terminal for Ruyi venv activation and deactivation.
 * Keeps track of the current active venv and ensures proper cleanup on terminal closure.
 * Also detects when the user manually runs 'ruyi-deactivate' or 'source mypath/ruyi-activate' in the terminal.
 */

import * as path from 'path'
import * as vscode from 'vscode'

import { getWorkspaceFolderPath } from '../../common/helpers'

import { venvTree } from './detect'

let ruyiTerminal: vscode.Terminal | null
export let currentVenv: string | null = null // absolute path

// Watch for terminal close event to reset currentVenv and ruyiTerminal
export default function registerTerminalHandlerCommand(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.window.onDidCloseTerminal((closedTerminal) => {
      if (closedTerminal === ruyiTerminal) {
        ruyiTerminal = null
        currentVenv = null
        venvTree.setCurrentVenv(null, null)
        vscode.window.showInformationMessage('Ruyi Venv Terminal closed, venv deactivated.')
      }
    }),
  )

  // Monitor terminal shell execution (requires Shell Integration, VS Code 1.72+)
  // This detects when user manually runs commands in the terminal
  context.subscriptions.push(
    vscode.window.onDidEndTerminalShellExecution((event) => {
      if (event.terminal === ruyiTerminal && event.execution.commandLine) {
        const commandLine = event.execution.commandLine.value.trim()

        if (commandLine === 'ruyi-deactivate') {
          currentVenv = null
          venvTree.setCurrentVenv(null, null)
          vscode.window.showInformationMessage('Ruyi venv deactivated.')
        }
        else if (commandLine.startsWith('source ') && commandLine.includes('/bin/ruyi-activate')) {
          const match = commandLine.match(/source\s+(.+?)\/bin\/ruyi-activate/)
          if (match) {
            try {
              const workspaceRoot = getWorkspaceFolderPath()
              const abs = path.isAbsolute(match[1])
                ? match[1]
                : path.resolve(workspaceRoot, match[1])
              currentVenv = abs
              venvTree.setCurrentVenv(currentVenv, path.basename(abs))
              vscode.window.showInformationMessage(`Ruyi venv activated: ${currentVenv}`)
            }
            catch {
              // Ignore if workspace is not available
            }
          }
        }
      }
    }),
  )
}

// Get or create the Ruyi terminal for venv activation, assigning a venv path to it.
export function manageRuyiTerminal(venvPath: string | null, venvName?: string) {
  let workspaceRoot: string
  try {
    workspaceRoot = getWorkspaceFolderPath()
  }
  catch {
    vscode.window.showWarningMessage('Open a workspace folder before activating a Ruyi venv.')
    return
  }

  const absPath = venvPath ? path.resolve(workspaceRoot, venvPath) : null

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
      currentVenv = null
      venvTree.setCurrentVenv(null, null)
      vscode.window.showInformationMessage('No Ruyi venv is currently active.')
      return
    }
  }

  if (absPath === null) {
    // Deactivate current venv
    ruyiTerminal.sendText('ruyi-deactivate')
    currentVenv = null
    venvTree.setCurrentVenv(null, null)
    return
  }

  if (currentVenv && path.normalize(absPath) === path.normalize(currentVenv)) {
    // Toggle: deactivate same venv
    ruyiTerminal.sendText('ruyi-deactivate')
    currentVenv = null
    venvTree.setCurrentVenv(null, null)
    return
  }

  // Activate new venv
  if (currentVenv) {
    ruyiTerminal.sendText('ruyi-deactivate')
    setTimeout(() => {
      ruyiTerminal?.sendText(`source "${absPath}/bin/ruyi-activate"`)
    }, 100)
  }
  else {
    ruyiTerminal.sendText(`source "${absPath}/bin/ruyi-activate"`)
  }

  currentVenv = absPath
  venvTree.setCurrentVenv(absPath, venvName ?? path.basename(absPath))
}
