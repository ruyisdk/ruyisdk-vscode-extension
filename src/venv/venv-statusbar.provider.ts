// SPDX-License-Identifier: Apache-2.0
import * as path from 'path'
import * as vscode from 'vscode'

import { VenvService } from './venv.service'

/**
 * Provides the Status Bar Item for Ruyi Venv.
 * Separated from the TreeProvider to adhere to SRP.
 * Implements Singleton pattern.
 */
export class VenvStatusBarProvider implements vscode.Disposable {
  private static _instance: VenvStatusBarProvider
  private statusBarItem: vscode.StatusBarItem
  private disposables: vscode.Disposable[] = []

  private constructor(private service: VenvService) {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100,
    )
    this.disposables.push(this.statusBarItem)

    // Listen to venv changes
    this.disposables.push(
      service.onDidChangeVenv(() => this.update()),
    )

    // Bind click command globally
    // The command itself handles the logic of checking if venv exists
    this.statusBarItem.command = 'ruyi.venv.deactivate'

    // Initial update
    this.update()
    this.statusBarItem.show()
  }

  public static getInstance(service: VenvService): VenvStatusBarProvider {
    if (!VenvStatusBarProvider._instance) {
      VenvStatusBarProvider._instance = new VenvStatusBarProvider(service)
    }
    return VenvStatusBarProvider._instance
  }

  private update(): void {
    const current = this.service.getCurrentVenv()
    if (current) {
      const displayName = path.basename(path.normalize(current)) || 'Unknown Venv'
      this.statusBarItem.text = `$(check) ${displayName}`
      this.statusBarItem.tooltip = `Active Ruyi Venv: ${displayName}`
    }
    else {
      this.statusBarItem.text = '$(circle-slash) No Active Venv'
      this.statusBarItem.tooltip = 'No Ruyi virtual environment is currently active'
    }
  }

  dispose(): void {
    this.disposables.forEach(d => d.dispose())
  }
}
