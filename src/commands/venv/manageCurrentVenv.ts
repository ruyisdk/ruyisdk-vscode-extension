// SPDX-License-Identifier: Apache-2.0
/**
 * Venv Terminal Management Helper
 * Not a command by itself
 *
 * Manages a dedicated terminal for Ruyi venv activation and deactivation.
 * Keeps track of the current active venv and ensures proper cleanup on terminal closure.
 * Also detects when the user manually runs 'ruyi-deactivate' or 'source mypath/ruyi-activate' in the terminal.
 */

import * as vscode from 'vscode'

import { venvTree } from './detect'

let ruyiTerminal: vscode.Terminal | null
export let currentVenv: string | null = null

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
            currentVenv = match[1]
            venvTree.setCurrentVenv(currentVenv, null)
            vscode.window.showInformationMessage(`Ruyi venv activated: ${currentVenv}`)
          }
        }
      }
    }),
  )
}

// Get or create the Ruyi terminal for venv activation, assigning a venv path to it.
export function manageRuyiTerminal(venvPath: string | null) {
  if (!ruyiTerminal) {
    if (venvPath) {
      ruyiTerminal = vscode.window.createTerminal({ name: 'Ruyi Venv Terminal', shellPath: '/bin/bash' })
      ruyiTerminal.show()
    }
    else {
      currentVenv = null
      venvTree.setCurrentVenv(null, null)
      vscode.window.showInformationMessage('No Ruyi venv is currently active.')
      return
    }
  }
  if (venvPath === null) {
    // Deactivate current venv
    ruyiTerminal.sendText('ruyi-deactivate')
  }
  else if (venvPath !== currentVenv) {
    // Activate new venv
    if (currentVenv) {
      ruyiTerminal.sendText('ruyi-deactivate')
      // Sleep for a short moment to ensure deactivation completes
      setTimeout(() => {
        ruyiTerminal!.sendText(`source ${venvPath}/bin/ruyi-activate`)
      }, 100)
    }
    else {
      ruyiTerminal.sendText(`source ${venvPath}/bin/ruyi-activate`)
    }
  }
  // Trying to activate the same venv, although shouldn't reach here due to earlier check.
  else {
    vscode.window.showInformationMessage(`Ruyi venv already active: ${venvPath}`)
  }
}
