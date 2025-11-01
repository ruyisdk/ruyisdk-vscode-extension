// SPDX-License-Identifier: Apache-2.0
/**
 * InstallCommand
 *
 * VS Code command: `ruyi.install`
 *
 * Responsibilities:
 * - Check platform support
 * - Resolve Python interpreter from candidates (python3/python/py)
 * - Ask user for confirmation and show progress
 * - Perform pip install and report result
 */

import * as cp from 'child_process'
import type { ExecException } from 'node:child_process'
import * as vscode from 'vscode'

import ruyi, { resolveRuyi } from '../common/ruyi'
import { promptForTelemetryConfiguration } from '../features/telemetry/TelemetryService'

const output = vscode.window.createOutputChannel('Ruyi')

async function runWithOutput(cmd: string, name: string, timeoutMs = 60_000): Promise<void> {
  output.appendLine(`[Install][${name}] $ ${cmd}`)
  const child = cp.spawn(cmd, { shell: true })
  let killedByTimeout = false
  const timer = setTimeout(() => {
    killedByTimeout = true
    try {
      child.kill()
    }
    catch {
      /* ignore */
    }
  }, timeoutMs)
  child.stdout?.on('data', (d: Buffer | string) => {
    const str = d.toString()
    output.append(str.endsWith('\n') ? str : str + '\n')
  })
  child.stderr?.on('data', (d: Buffer | string) => {
    const str = d.toString()
    output.append(str.endsWith('\n') ? str : str + '\n')
  })
  await new Promise<void>((resolve, reject) => {
    child.on('error', err => reject(err))
    child.on('close', (code) => {
      clearTimeout(timer)
      if (killedByTimeout) {
        output.appendLine(`[Install] Command timed out after ${timeoutMs}ms`)
        reject(new Error('Command timed out'))
        return
      }
      if (code === 0) {
        output.appendLine(`[Install][${name}] Done (exit 0)`)
        resolve()
      }
      else {
        reject(new Error(`[${name}] failed with exit code ${code ?? 'null'}`))
      }
    })
  })
}

async function showInstallSuccess(method: string, version: string): Promise<void> {
  const action = await vscode.window.showInformationMessage(
    `Ruyi installed via ${method}: ${version}`,
    'Reload Window',
    'Later',
  )
  if (action === 'Reload Window') {
    await vscode.commands.executeCommand('workbench.action.reloadWindow')
  }
}

async function showInstallError(method: string, errorMessage: string, continueMessage?: string): Promise<void> {
  console.log(`[RuyiSDK] ${method} install failed: ${errorMessage}`)

  const message = continueMessage
    ? `${method} installation failed: ${errorMessage}. ${continueMessage}`
    : `${method} installation failed: ${errorMessage}`

  await vscode.window.showWarningMessage(`${message} (See OUTPUT: Ruyi)`, 'OK')
}

export default function registerInstallCommand(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('ruyi.install', async () => {
    if (process.platform !== 'linux') {
      const choice = await vscode.window.showWarningMessage(
        'Automatic installation is only supported on Linux. Please install Ruyi manually.',
        'Open Installation Guide',
        'Cancel',
      )
      if (choice === 'Open Installation Guide') {
        vscode.env.openExternal(
          vscode.Uri.parse('https://ruyisdk.org/en/docs/Package-Manager/installation'),
        )
      }
      return
    }

    const existingRuyi = await resolveRuyi()
    if (existingRuyi) {
      const version = await ruyi.version()
      if (version) {
        vscode.window.showInformationMessage(`Ruyi already installed: ${version}`)
        return
      }
    }

    const choice = await vscode.window.showInformationMessage(
      'Ruyi not found. Would you like to install it automatically?',
      'Install',
      'Cancel',
    )
    if (choice !== 'Install') return

    const commands = [
      { name: 'pip', cmd: 'python3 -m pip install --user -U ruyi' },
      { name: 'pipx', cmd: 'python3 -m pipx install ruyi' },
    ]

    for (let i = 0; i < commands.length; i++) {
      const { name, cmd } = commands[i]
      try {
        output.show(true)
        await vscode.window.withProgress({
          location: vscode.ProgressLocation.Notification,
          title: `Installing Ruyi via ${name}...`,
          cancellable: false,
        }, async () => {
          await runWithOutput(cmd, name, 60_000)
        })

        const version = await ruyi.version()
        if (version) {
          await showInstallSuccess(name, version)
          await promptForTelemetryConfiguration()
          return
        }
      }
      catch (e) {
        const error = e as ExecException | Error
        const errorMessage = (error as ExecException)?.stderr || error.message || String(error)
        const isLastCommand = i === commands.length - 1
        const continueMessage = isLastCommand ? 'Will show manual installation options.' : `Trying ${commands[i + 1]?.name} instead...`
        await showInstallError(name, errorMessage, continueMessage)
      }
    }

    const manualChoice = await vscode.window.showErrorMessage(
      'Automatic installation failed. Please install Ruyi manually.',
      'Open Installation Guide',
      'Cancel',
    )

    if (manualChoice === 'Open Installation Guide') {
      vscode.env.openExternal(
        vscode.Uri.parse('https://ruyisdk.org/en/docs/Package-Manager/installation'),
      )
    }
  })
  context.subscriptions.push(disposable)
}
