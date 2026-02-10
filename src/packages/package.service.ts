// SPDX-License-Identifier: Apache-2.0
import * as semver from 'semver'

import { parseNDJSON } from '../common/helpers'
import { logger } from '../common/logger'
import ruyi, { PACKAGE_CATEGORIES, type PackageCategory } from '../ruyi'
import type { RuyiListOutput } from '../ruyi/types'

export interface RuyiPackageVersion {
  version: string
  isLatest: boolean
  isPrerelease: boolean
  isLatestPrerelease: boolean
  isInstalled: boolean
  isBinaryAvailable: boolean
  isOutdated: boolean
  slug?: string
}

export interface RuyiPackage {
  name: string
  category: PackageCategory
  versions: RuyiPackageVersion[]
}

export class PackageService {
  private packages: RuyiPackage[] = []
  private categories: PackageCategory[] = []
  private categoryCounts: Map<PackageCategory, number> = new Map()
  private rawListOutput: string = ''

  /**
   * Get all available categories with package counts (lightweight).
   * @param forceRefresh If true, force refresh data from CLI.
   */
  public async getCategories(forceRefresh: boolean = false):
  Promise<{ category: PackageCategory, count: number }[]> {
    if (!forceRefresh && this.categories.length > 0) {
      return this.categories.map(cat => ({
        category: cat,
        count: this.categoryCounts.get(cat) || 0,
      }))
    }

    try {
      const listResult = await ruyi.list()
      if (listResult.code !== 0) {
        logger.error('Failed to list packages:', listResult.stderr)
        return []
      }

      this.rawListOutput = listResult.stdout
      this.extractCategoriesFromOutput(listResult.stdout)

      return this.categories.map(cat => ({
        category: cat,
        count: this.categoryCounts.get(cat) || 0,
      }))
    }
    catch (error) {
      logger.error('Error fetching categories:', error)
      return []
    }
  }

  /**
   * Get packages for a specific category (lazy load).
   * @param category The category to load packages for.
   */
  public async getPackagesByCategory(category: PackageCategory):
  Promise<RuyiPackage[]> {
    // If we haven't fetched the raw data yet, get it first
    if (!this.rawListOutput) {
      await this.getCategories()
    }

    // Parse only packages from the requested category
    const categoryPackages = this.parsePorcelainListOutput(this.rawListOutput, category)

    // Cache the parsed packages
    for (const pkg of categoryPackages) {
      const existingIndex = this.packages.findIndex(p => p.name === pkg.name)
      if (existingIndex >= 0) {
        this.packages[existingIndex] = pkg
      }
      else {
        this.packages.push(pkg)
      }
    }

    return categoryPackages
  }

  /**
   * Get all available packages and cache the results.
   * @param forceRefresh If true, force refresh data from CLI.
   */
  public async getPackages(forceRefresh: boolean = false):
  Promise<RuyiPackage[]> {
    if (!forceRefresh && this.packages.length > 0) {
      return this.packages
    }

    try {
      const listResult = await ruyi.list()
      if (listResult.code !== 0) {
        logger.error('Failed to list packages:', listResult.stderr)
        return []
      }

      this.rawListOutput = listResult.stdout
      this.packages = this.parsePorcelainListOutput(listResult.stdout)
      return this.packages
    }
    catch (error) {
      logger.error('Error fetching packages:', error)
      return []
    }
  }

  /**
   * Extract categories and counts from raw output without full parsing.
   */
  private extractCategoriesFromOutput(output: string): void {
    const categoryCounts = new Map<PackageCategory, number>()

    const lines = output.trim().split('\n')
    for (const line of lines) {
      if (!line.trim()) {
        continue
      }

      try {
        const item = JSON.parse(line) as RuyiListOutput
        if (item.ty === 'pkglistoutput-v1'
          && item.category !== 'source'
          && PACKAGE_CATEGORIES.includes(item.category as PackageCategory)) {
          const category = item.category as PackageCategory
          categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1)
        }
      }
      catch {
        // Skip invalid lines
      }
    }

    this.categories = Array.from(categoryCounts.keys()).sort()
    this.categoryCounts = categoryCounts
  }

  /**
   * Parse the NDJSON output of `ruyi --porcelain list`.
   * Each line is a separate JSON object.
   * @param output The raw NDJSON output
   * @param filterCategory Optional category to filter by
   */
  private parsePorcelainListOutput(output: string, filterCategory?: PackageCategory): RuyiPackage[] {
    return parseNDJSON<RuyiListOutput>(output)
      .filter(item => item.ty === 'pkglistoutput-v1')
      // Exclude 'source' category
      .filter(item => item.category !== 'source')
      .filter(item => PACKAGE_CATEGORIES.includes(item.category as PackageCategory))
      // Filter by category if specified
      .filter(item => !filterCategory || item.category === filterCategory)
      .map((item) => {
        const category = item.category as PackageCategory
        const versions: RuyiPackageVersion[] = item.vers.map((v) => {
          const isPrerelease = v.semver.includes('-')
          const isLatest = v.remarks.includes('latest')
          const isLatestPrerelease = v.remarks.includes('latest-prerelease')
          // Check both locations for slug: pm.metadata.slug and remarks array
          const slugRemark = v.remarks.find(r => r.startsWith('slug:'))
          const slug = v.pm?.metadata?.slug
            || (slugRemark ? slugRemark.substring(5).trim() : undefined)

          return {
            version: v.semver,
            isInstalled: v.is_installed,
            isLatest,
            isPrerelease,
            isLatestPrerelease,
            isBinaryAvailable: !v.remarks.includes('no-binary-for-current-host'),
            isOutdated: false, // Will be calculated later
            slug,
          }
        })

        // Sort versions using semver (descending order, newest first)
        versions.sort((a, b) => {
          try {
            const semA = semver.coerce(a.version)
            const semB = semver.coerce(b.version)
            if (semA && semB) {
              return semver.rcompare(semA, semB)
            }
          }
          catch {
            // Fall back to string comparison if semver parsing fails
          }
          return b.version.localeCompare(a.version)
        })

        // Mark all versions except the latest 3 as outdated
        versions.forEach((v, index) => {
          v.isOutdated = index >= 3
        })

        return {
          name: `${item.category}/${item.name}`,
          category,
          versions,
        }
      })
  }
}
