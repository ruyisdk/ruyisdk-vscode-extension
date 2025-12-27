// SPDX-License-Identifier: Apache-2.0
/**
 * VenvTreeProvider
 *
 * Displays detected Ruyi virtual environments in a tree view.
 * Updates when ruyi.venv.refresh command is executed.
 *
 * Each venv item shows:
 * - Venv name
 * - Venv path relative to workspace
 */

import * as paths from 'path'
import * as vscode from 'vscode'

export interface VenvInfo {
  name: string
  path: string // absolute path
}

export class VenvTreeProvider implements
  vscode.TreeDataProvider<VenvTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<void>()
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event

  private _venvs: VenvInfo[] = []
  private _currentVenvPath: string | null = null
  private _currentVenvName: string | null = null
  private _statusBarItem: vscode.StatusBarItem | null = null
  private _workspaceRoot: string | null = null

  /**
   * Set the status bar item to update when current venv changes
   */
  setStatusBarItem(statusBarItem: vscode.StatusBarItem): void {
    this._statusBarItem = statusBarItem
    this.updateStatusBar()
  }

  /**
   * Set the currently active venv.
   */
  setCurrentVenv(venvPath: string | null, venvName: string | null): void {
    this._currentVenvPath = venvPath
    this._currentVenvName = venvName || null
    this._onDidChangeTreeData.fire()
    this.updateStatusBar()
  }

  /**
   * Update status bar text based on current venv
   */
  private updateStatusBar(): void {
    if (!this._statusBarItem) {
      return
    }

    if (this._currentVenvPath && this._currentVenvName) {
      this._statusBarItem.text = `$(check) ${this._currentVenvName}`
      this._statusBarItem.tooltip = `Active Ruyi Venv: ${this._currentVenvName}\nPath: ${this._currentVenvPath}`
    }
    else {
      this._statusBarItem.text = '$(circle-slash) No Active Venv'
      this._statusBarItem.tooltip = 'No Ruyi virtual environment is currently active'
    }
  }

  /**
   * Update the venv list and refresh the tree view.
   */
  updateVenvs(venvs: VenvInfo[], workspaceRoot?: string): void {
    this._venvs = venvs
    this._workspaceRoot = workspaceRoot ?? this._workspaceRoot
    this._onDidChangeTreeData.fire()
  }

  /**
   * Get the currently active venv path.
   */
  getCurrentVenv(): string | null {
    return this._currentVenvPath
  }

  /**
   * Necessary interface methods for TreeDataProvider.
   */
  getTreeItem(element: VenvTreeItem): vscode.TreeItem {
    return element
  }

  getChildren(element?: VenvTreeItem): VenvTreeItem[] {
    if (element) {
      return []
    }

    if (this._venvs.length === 0) {
      return [new VenvTreeItem('No venvs detected', '', true, false)]
    }

    return this._venvs.map((v) => {
      const displayPath = this._workspaceRoot
        ? paths.relative(this._workspaceRoot, v.path)
        : v.path

      const isCurrent = this._currentVenvPath
        ? (paths.normalize(v.path) === paths.normalize(this._currentVenvPath))
        : false

      return new VenvTreeItem(
        v.name,
        displayPath,
        false,
        isCurrent,
      )
    })
  }

  /**
   * Clear the venv list.
   */
  clear(): void {
    this._venvs = []
    this._onDidChangeTreeData.fire()
  }
}

export class VenvTreeItem extends vscode.TreeItem {
  constructor(
    public readonly name: string,
    public readonly venvPath: string,
    private readonly isPlaceholder: boolean,
    private readonly isCurrentVenv: boolean,
  ) {
    super(name, vscode.TreeItemCollapsibleState.None)

    if (isPlaceholder) {
      this.iconPath = new vscode.ThemeIcon('info')
      this.contextValue = 'ruyiVenv.placeholder'
    }
    else {
      this.description = `at ./${venvPath}`
      this.tooltip = isCurrentVenv
        ? `${name}\nPath: ${venvPath}\n✓ Currently Active`
        : `${name}\nPath: ${venvPath}`
      if (isCurrentVenv) {
        this.iconPath = new vscode.ThemeIcon('check', new vscode.ThemeColor('testing.iconPassed'))
        this.contextValue = 'ruyiVenv.current'
      }
      else {
        this.iconPath = new vscode.ThemeIcon('file-directory')
        this.contextValue = 'ruyiVenv.itemNonCurrent'
      }

      // Add command of activating or deactivating venv on click
      this.command = {
        command: 'ruyi.venv.switch',
        title: 'Activate or Deactivate Venv',
        arguments: [this],
      }
    }
  }
}
