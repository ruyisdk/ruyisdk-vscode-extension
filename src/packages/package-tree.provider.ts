// SPDX-License-Identifier: Apache-2.0
import * as vscode from 'vscode'

import { logger } from '../common/logger.js'

import { RuyiPackage, RuyiPackageVersion, PackageService } from './package.service'

// Define tree node types
type TreeElement = PackageCategoryItem | PackageItem | VersionItem

export class PackagesTreeProvider implements
  vscode.TreeDataProvider<TreeElement> {
  private _onDidChangeTreeData = new vscode.EventEmitter<void>()
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event
  private searchQuery = ''
  private treeView?: vscode.TreeView<TreeElement>

  constructor(private packageService: PackageService) { }

  setTreeView(treeView: vscode.TreeView<TreeElement>): void {
    this.treeView = treeView
  }

  /**
   * Refresh the tree view and force data refresh.
   */
  async refresh(): Promise<void> {
    try {
      await this.packageService.getPackages(true)
    }
    catch (err) {
      logger.error('Failed to refresh packages:', err)
    }
    finally {
      this._onDidChangeTreeData.fire()
    }
  }

  /**
   * Set search query and refresh the tree view.
   */
  setSearchQuery(query: string): void {
    this.searchQuery = query.trim().toLowerCase()
    this.updateTreeViewTitle()
    this._onDidChangeTreeData.fire()
  }

  /**
   * Get current search query.
   */
  getSearchQuery(): string {
    return this.searchQuery
  }

  /**
   * Clear search query and refresh the tree view.
   */
  clearSearch(): void {
    this.searchQuery = ''
    this.updateTreeViewTitle()
    this._onDidChangeTreeData.fire()
  }

  private updateTreeViewTitle(): void {
    if (this.treeView) {
      if (this.searchQuery) {
        this.treeView.description = `Searching '${this.searchQuery}'`
      }
      else {
        this.treeView.description = undefined
      }
    }
  }

  getTreeItem(element: TreeElement): vscode.TreeItem {
    return element
  }

  private async getFilteredPackages(): Promise<RuyiPackage[]> {
    let packages = await this.packageService.getPackages()

    if (this.searchQuery) {
      packages = packages.filter(p => this.matchesSearch(p))
    }

    return packages
  }

  async getChildren(element?: TreeElement): Promise<TreeElement[]> {
    if (!element) {
      // Root node: show categories
      const packages = await this.getFilteredPackages()
      if (packages.length === 0) {
        return []
      }

      const categories = new Set(packages.map(p => p.category))
      return Array.from(categories).sort().map(c => new PackageCategoryItem(c))
    }

    if (element instanceof PackageCategoryItem) {
      // Category node: display the packages under this category
      const packages = await this.getFilteredPackages()

      return packages
        .filter(p => p.category === element.category)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(p => new PackageItem(p))
    }

    if (element instanceof PackageItem) {
      // Package node: show versions
      return element.pkg.versions.map(v => new VersionItem(element.pkg, v))
    }

    return []
  }

  /**
   * Check if a package matches the current search query.
   */
  private matchesSearch(pkg: RuyiPackage): boolean {
    if (!this.searchQuery) {
      return true
    }

    const query = this.searchQuery.toLowerCase()
    const name = pkg.name.toLowerCase()
    const category = pkg.category.toLowerCase()

    return name.includes(query) || category.includes(query)
  }
}

/**
 * Category node
 */
class PackageCategoryItem extends vscode.TreeItem {
  constructor(public readonly category: string) {
    super(category, vscode.TreeItemCollapsibleState.Collapsed)
    this.iconPath = new vscode.ThemeIcon('folder')
    this.contextValue = 'ruyiPackage.category'
  }
}

/**
 * Package node
 */
class PackageItem extends vscode.TreeItem {
  constructor(public readonly pkg: RuyiPackage) {
    const displayName = pkg.name.split('/').slice(1).join('/') || pkg.name
    super(displayName, vscode.TreeItemCollapsibleState.Collapsed)

    const installedCount
      = pkg.versions.filter(v => v.isInstalled).length
    if (installedCount > 0) {
      this.description = `(${installedCount}/${pkg.versions.length} installed)`
    }
    else {
      this.description = `(${pkg.versions.length} versions)`
    }

    this.iconPath = new vscode.ThemeIcon('package')
    this.contextValue = 'ruyiPackage.package'
    this.tooltip = pkg.name
  }
}

/**
 * Version node
 */
export class VersionItem extends vscode.TreeItem {
  constructor(
    public readonly pkg: RuyiPackage,
    public readonly versionInfo: RuyiPackageVersion) {
    super(versionInfo.version, vscode.TreeItemCollapsibleState.None)

    // Set different icons and context menus according to the version status
    this.description = this.buildDescription()
    this.tooltip = this.buildTooltip()

    if (versionInfo.isInstalled) {
      this.iconPath = new vscode.ThemeIcon('check', new vscode.ThemeColor('testing.iconPassed'))
      this.contextValue = 'ruyiPackage.installed'
    }
    else if (!versionInfo.isBinaryAvailable) {
      this.iconPath = new vscode.ThemeIcon('warning', new vscode.ThemeColor('problemsWarningIcon.foreground'))
      this.contextValue = 'ruyiPackage.unavailable'
    }
    else {
      this.iconPath = new vscode.ThemeIcon('cloud-download')
      this.contextValue = 'ruyiPackage.available'
    }
  }

  private buildDescription(): string {
    const tags: string[] = []
    if (this.versionInfo.isLatest) {
      tags.push('latest')
    }
    if (this.versionInfo.isPrerelease) {
      tags.push('prerelease')
    }
    if (this.versionInfo.isLatestPrerelease) {
      tags.push('latest-prerelease')
    }
    if (!this.versionInfo.isBinaryAvailable) {
      tags.push('no binary')
    }
    if (this.versionInfo.slug) {
      tags.push(`slug: ${this.versionInfo.slug}`)
    }
    return tags.join(', ')
  }

  private buildTooltip(): string {
    let tooltip = `${this.pkg.name}@${this.versionInfo.version}\n`

    if (this.versionInfo.isInstalled) {
      tooltip += '✓ Installed\n'
    }
    if (this.versionInfo.isLatest) {
      tooltip += '⭐ Latest version\n'
    }
    if (this.versionInfo.isPrerelease) {
      tooltip += '🚧 Prerelease version\n'
    }
    if (!this.versionInfo.isBinaryAvailable) {
      tooltip += '⚠️ No binary available for current platform\n'
    }

    return tooltip.trim()
  }

  /**
   * Get the unique package identifier for install/uninstall commands.
   */
  getPackageId(): string {
    return `${this.pkg.name}(${this.versionInfo.version})`
  }
}
