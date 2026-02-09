// SPDX-License-Identifier: Apache-2.0
import * as path from 'path'
import * as vscode from 'vscode'

import { getWorkspaceFolderPath } from '../common/helpers'

import type { VenvInfo } from './types'
import { VenvService } from './venv.service'

type VenvTreeElement = VenvItem | PlaceholderItem

export class VenvTreeProvider implements vscode.TreeDataProvider<VenvTreeElement> {
  private static _instance: VenvTreeProvider
  private _onDidChangeTreeData = new vscode.EventEmitter<void>()
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event

  private constructor(private service: VenvService) {
    this.service.onDidChangeVenv(() => this.refresh())
  }

  public static getInstance(service: VenvService): VenvTreeProvider {
    if (!VenvTreeProvider._instance) {
      VenvTreeProvider._instance = new VenvTreeProvider(service)
    }
    return VenvTreeProvider._instance
  }

  refresh(): void {
    this._onDidChangeTreeData.fire()
  }

  getTreeItem(element: VenvTreeElement): vscode.TreeItem {
    return element
  }

  async getChildren(element?: VenvTreeElement): Promise<VenvTreeElement[]> {
    if (element) {
      return []
    }

    const venvs = await this.service.listVenvs()
    if (!venvs.length) {
      return [new PlaceholderItem()]
    }

    const current = this.service.getCurrentVenv()
    return venvs.map(venv => new VenvItem(venv, this.isCurrentVenv(venv, current)))
  }

  private isCurrentVenv(venv: VenvInfo, current: VenvInfo | string | null | undefined): boolean {
    if (!current) {
      return false
    }

    let workspaceRoot = ''
    try {
      workspaceRoot = getWorkspaceFolderPath()
    }
    catch {
      return false
    }

    const venvAbsPath = path.isAbsolute(venv.path)
      ? venv.path
      : path.resolve(workspaceRoot, venv.path)

    let currentAbsPath: string
    if (typeof current === 'string') {
      currentAbsPath = current
    }
    else {
      currentAbsPath = path.isAbsolute(current.path)
        ? current.path
        : path.resolve(workspaceRoot, current.path)
    }

    return path.normalize(venvAbsPath) === path.normalize(currentAbsPath)
  }
}

export class VenvItem extends vscode.TreeItem {
  public readonly venvPath: string

  constructor(venv: VenvInfo, isCurrent: boolean) {
    super(venv.name, vscode.TreeItemCollapsibleState.None)
    this.venvPath = venv.path
    this.description = venv.path
    this.tooltip = `${venv.path}${isCurrent ? ' (Active)' : ''}`
    this.contextValue = isCurrent ? 'ruyiVenv.current' : 'ruyiVenv.itemNonCurrent'
    this.iconPath = isCurrent
      ? new vscode.ThemeIcon('check', new vscode.ThemeColor('testing.iconPassed'))
      : new vscode.ThemeIcon('file-directory')
    this.resourceUri = vscode.Uri.file(venv.path)
  }
}

class PlaceholderItem extends vscode.TreeItem {
  constructor() {
    super('No venvs detected', vscode.TreeItemCollapsibleState.None)
    this.iconPath = new vscode.ThemeIcon('info')
    this.contextValue = 'ruyiVenv.placeholder'
  }
}
