// SPDX-License-Identifier: Apache-2.0
/**
 * RuyiSDK VS Code Extension - Build Module - Status Bar Provider
 *
 * Provides a persistent "Build" button in the status bar.
 * The button tooltip reflects the currently active Ruyi venv (if any) so the
 * user always knows which environment will be used for the build.
 *
 * The context key `ruyi.venv.isActive` is also maintained here so that
 * package.json `when` clauses (e.g. view/title build button) can respond to
 * venv state changes.
 */

import * as path from 'path'
import * as vscode from 'vscode'

import { VenvService } from '../venv/venv.service'

export class BuildStatusBarProvider implements vscode.Disposable {
  private static _instance: BuildStatusBarProvider

  private readonly item: vscode.StatusBarItem
  private readonly disposables: vscode.Disposable[] = []

  private constructor(private readonly venvService: VenvService) {
    // Priority 99: renders just to the right of the venv status bar item (100)
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99)
    this.item.command = 'ruyi.build.run'
    this.disposables.push(this.item)

    this.disposables.push(
      venvService.onDidChangeVenv(() => this.update()),
    )

    this.update()
    this.item.show()
  }

  public static getInstance(venvService: VenvService): BuildStatusBarProvider {
    if (!BuildStatusBarProvider._instance) {
      BuildStatusBarProvider._instance = new BuildStatusBarProvider(venvService)
    }
    return BuildStatusBarProvider._instance
  }

  private update(): void {
    const venvPath = this.venvService.getCurrentVenv()

    this.item.text = '$(play) Build'

    if (venvPath) {
      const venvName = path.basename(path.normalize(venvPath))
      this.item.tooltip = new vscode.MarkdownString(
        `**RuyiSDK Build**\n\nClick to build the project.\n\n`
        + `Venv: \`${venvName}\` — build tools from the virtual environment will be used.`,
      )
    }
    else {
      this.item.tooltip = new vscode.MarkdownString(
        `**RuyiSDK Build**\n\nClick to build the project.\n\n`
        + `_No active venv — system build tools will be used._`,
      )
    }

    // Keep the VS Code context key in sync so package.json when-clauses work
    vscode.commands.executeCommand('setContext', 'ruyi.venv.isActive', venvPath !== null)
  }

  dispose(): void {
    this.disposables.forEach(d => d.dispose())
  }
}
