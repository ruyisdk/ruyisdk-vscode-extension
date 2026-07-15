// SPDX-License-Identifier: Apache-2.0
import * as vscode from 'vscode'

import { logger } from '../common/logger.js'
import type { PackageCategory } from '../ruyi'

import { formatSize } from './package.helper.js'
import { RuyiPackage, RuyiPackageVersion, PackageService } from './package.service'

// Define tree node types
type TreeElement = PackageCategoryItem | PackageItem | VersionItem

export class PackagesTreeProvider implements
  vscode.TreeDataProvider<TreeElement> {
  private _onDidChangeTreeData = new vscode.EventEmitter<void>()
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event
  private searchQuery = ''
  private treeView?: vscode.TreeView<TreeElement>
  private categoryCache: Map<string, RuyiPackage[]> = new Map()
  private installingPackages: Set<string> = new Set()

  constructor(private packageService: PackageService) { }

  setTreeView(treeView: vscode.TreeView<TreeElement>): void {
    this.treeView = treeView
  }

  /**
   * Refresh the tree view and force data refresh.
   */
  async shallowRefresh(): Promise<void> {
    try {
      // Clear category cache on refresh
      this.categoryCache.clear()
      // Force a single refresh from CLI and rebuild all caches
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
    this.categoryCache.clear() // Clear cache when search changes
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
    this.setSearchQuery('')
  }

  /**
   * Prepare for search by preloading all packages data.
   * This should be called when user clicks the search button.
   */
  async prepareForSearch(): Promise<void> {
    try {
      // Preload all packages so search is instant
      await this.packageService.getPackages()
    }
    catch (err) {
      logger.error('Failed to prepare for search:', err)
    }
  }

  private updateTreeViewTitle(): void {
    if (!this.treeView) {
      return
    }

    this.treeView.description = this.searchQuery
      ? vscode.l10n.t(`Searching '{0}'`, this.searchQuery)
      : undefined
  }

  getTreeItem(element: TreeElement): vscode.TreeItem {
    return element
  }

  /**
   * Get packages for a specific category (with caching and search filtering).
   */
  private async getPackagesForCategory(category: string): Promise<RuyiPackage[]> {
    const cacheKey = `${category}:${this.searchQuery}`

    // Check cache first
    if (this.categoryCache.has(cacheKey)) {
      return this.categoryCache.get(cacheKey)!
    }

    // If searching, we need all packages to filter
    let packages: RuyiPackage[]
    if (this.searchQuery) {
      packages = await this.packageService.getPackages()
      packages = packages.filter(p =>
        p.category === category && this.matchesSearch(p),
      )
    }
    else {
      // Lazy load only this category's packages
      packages = await this.packageService.getPackagesByCategory(category as PackageCategory)
    }

    // Cache the result
    this.categoryCache.set(cacheKey, packages)
    return packages
  }

  async getChildren(element?: TreeElement): Promise<TreeElement[]> {
    if (!element) {
      // Root node: show categories (lightweight, no full package loading)
      try {
        const categories = await this.packageService.getCategories()

        if (categories.length === 0) {
          return []
        }

        // If searching, filter categories that have matching packages
        if (this.searchQuery) {
          const categoriesWithMatches: typeof categories = []
          for (const catInfo of categories) {
            const packages = await this.getPackagesForCategory(catInfo.category)
            if (packages.length > 0) {
              categoriesWithMatches.push({
                category: catInfo.category,
                count: packages.length,
              })
            }
          }
          return categoriesWithMatches.map(c => new PackageCategoryItem(c.category, c.count))
        }

        return categories.map(c => new PackageCategoryItem(c.category, c.count))
      }
      catch (err) {
        logger.error('Failed to get categories:', err)
        return []
      }
    }

    if (element instanceof PackageCategoryItem) {
      // Category node: lazy load packages for this category
      try {
        const packages = await this.getPackagesForCategory(element.category)
        return packages
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(p => new PackageItem(p))
      }
      catch (err) {
        logger.error(`Failed to get packages for category ${element.category}:`, err)
        return []
      }
    }

    if (element instanceof PackageItem) {
      // Package node: show versions
      return element.pkg.versions.map(v => new VersionItem(element.pkg, v, this.isPackageInstalling(element.pkg.name, v)))
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

  markPackageInstalling(pkg: string, version: string): void {
    this.installingPackages.add(`${pkg}:${version}`)
    this._onDidChangeTreeData.fire()
  }

  unmarkPackageInstalling(pkg: string, version: string): void {
    this.installingPackages.delete(`${pkg}:${version}`)
    this._onDidChangeTreeData.fire()
  }

  isPackageInstalling(pkg: string, version: RuyiPackageVersion): boolean {
    const exactMatch = this.installingPackages.has(`${pkg}:${version.version}`)
    const latestMatch = version.isLatest && this.installingPackages.has(`${pkg}:latest`)
    return exactMatch || latestMatch
  }
}

/**
 * Category node
 */
class PackageCategoryItem extends vscode.TreeItem {
  constructor(
    public readonly category: string,
    private readonly count?: number,
  ) {
    super(category, vscode.TreeItemCollapsibleState.Collapsed)
    this.iconPath = new vscode.ThemeIcon('folder')
    this.contextValue = 'ruyiPackage.category'
    // Show package count in description
    if (count !== undefined) {
      this.description = vscode.l10n.t('{0} package(s)', count)
    }
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
      this.description = vscode.l10n.t('({0}/{1} installed)', installedCount, pkg.versions.length)
    }
    else {
      this.description = vscode.l10n.t('({0} version[s])', pkg.versions.length)
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
    public readonly versionInfo: RuyiPackageVersion,
    public readonly isInstalling: boolean) {
    super(versionInfo.version, vscode.TreeItemCollapsibleState.None)

    // Set different icons and context menus according to the version status
    this.description = this.buildDescription()
    this.tooltip = this.buildTooltip()

    if (versionInfo.isInstalled) {
      this.iconPath = new vscode.ThemeIcon('check', new vscode.ThemeColor('testing.iconPassed'))
      this.contextValue = 'ruyiPackage.installed'
    }
    else if (this.isInstalling) {
      this.iconPath = new vscode.ThemeIcon('loading~spin', new vscode.ThemeColor('testing.iconQueued'))
      this.contextValue = 'ruyiPackage.installing'
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
      tooltip += '✓ ' + vscode.l10n.t('Installed')
      if (this.versionInfo.installSize) {
        tooltip += ` (${formatSize(this.versionInfo.installSize)})`
      }
      tooltip += '\n'
    }
    if (this.versionInfo.isLatest) {
      tooltip += '⭐ ' + vscode.l10n.t('Latest version') + '\n'
    }
    if (this.versionInfo.isPrerelease) {
      tooltip += '🚧 ' + vscode.l10n.t('Prerelease version') + '\n'
    }
    if (!this.versionInfo.isBinaryAvailable) {
      tooltip += '⚠️ ' + vscode.l10n.t('No binary available for current platform') + '\n'
    }
    if (this.versionInfo.downloadSize) {
      tooltip += '⬇️ ' + vscode.l10n.t('Download size: {0}', formatSize(this.versionInfo.downloadSize)) + '\n'
    }
    if (this.isInstalling) {
      tooltip += '🕙 ' + vscode.l10n.t('Installing...') + '\n'
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
