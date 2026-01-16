// SPDX-License-Identifier: Apache-2.0
/**
 * VenvTreeProvider
 *
 * Displays detected Ruyi virtual environments in a tree view.
 * Automatically updates when venv state changes via event subscription.
 *
 * Each venv item shows:
 * - Venv name
 */

import * as paths from 'path'
import * as vscode from 'vscode'

import type { VenvInfo } from './models/types'
import { venvState } from './models/VenvState'

export class VenvTreeProvider implements
  vscode.TreeDataProvider<VenvTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<void>()
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event

  private _venvs: VenvInfo[] = []
  private _currentVenvPath: string | null = null
  private _currentVenvName: string | null = null
  private _statusBarItem: vscode.StatusBarItem | null = null
  private _workspaceRoot: string | null = null
  private _unsubscribeStateListener: (() => void) | null = null

  constructor() {
    // Subscribe to venv state changes to automatically update UI
    this._unsubscribeStateListener = venvState.subscribe((venvPath) => {
      // Find the venv name from the path
      if (venvPath) {
        const matchingVenv = this._venvs.find(v =>
          paths.normalize(v.path) === paths.normalize(venvPath),
        )
        // If we can't find the venv in the list, use the basename as fallback
        // Normalize path to handle trailing slashes before extracting basename
        const normalizedPath = paths.normalize(venvPath)
        const venvName = matchingVenv?.name || paths.basename(normalizedPath) || 'Unknown Venv'
        this.setCurrentVenv(venvPath, venvName)
      }
      else {
        this.setCurrentVenv(null, null)
      }
    })
  }

  /**
   * Clean up subscriptions when the provider is disposed.
   */
  dispose(): void {
    if (this._unsubscribeStateListener) {
      this._unsubscribeStateListener()
      this._unsubscribeStateListener = null
    }
    this._onDidChangeTreeData.dispose()
  }

  /**
   * Set the status bar item to update when current venv changes
   */
  setStatusBarItem(statusBarItem: vscode.StatusBarItem): void {
    this._statusBarItem = statusBarItem
    this.updateStatusBar()
  }

  /**
   * Set the currently active venv (private - only called by state subscription).
   */
  private setCurrentVenv(venvPath: string | null, venvName: string | null): void {
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

    if (this._currentVenvPath) {
      // Show active venv even if name is not available (use path basename)
      // Normalize path to handle trailing slashes before extracting basename
      const normalizedPath = paths.normalize(this._currentVenvPath)
      const displayName = this._currentVenvName || paths.basename(normalizedPath) || 'Unknown Venv'
      this._statusBarItem.text = `$(check) ${displayName}`
      this._statusBarItem.tooltip = `Active Ruyi Venv: ${displayName}`
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
      if (isCurrentVenv) {
        this.iconPath = new vscode.ThemeIcon('check', new vscode.ThemeColor('testing.iconPassed'))
        this.contextValue = 'ruyiVenv.current'
      }
      else {
        this.iconPath = new vscode.ThemeIcon('file-directory')
        this.contextValue = 'ruyiVenv.itemNonCurrent'
      }

      // No default click action - use inline buttons instead
    }
  }
}
