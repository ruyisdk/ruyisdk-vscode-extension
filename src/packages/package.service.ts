// SPDX-License-Identifier: Apache-2.0
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
  slug?: string
}

export interface RuyiPackage {
  name: string
  category: PackageCategory
  versions: RuyiPackageVersion[]
}

export class PackageService {
  private packages: RuyiPackage[] = []
  private categoryCounts: Map<PackageCategory, number> = new Map()
  private hasLoaded = false
  private loadingPromise: Promise<void> | null = null

  private async loadPackages(forceRefresh: boolean = false): Promise<void> {
    if (this.loadingPromise) {
      await this.loadingPromise
      if (!forceRefresh || this.hasLoaded) {
        return
      }
    }

    if (!forceRefresh && this.hasLoaded) {
      return
    }

    this.loadingPromise = this.fetchPackagesFromCli()
    try {
      await this.loadingPromise
    }
    finally {
      this.loadingPromise = null
    }
  }

  private async fetchPackagesFromCli(): Promise<void> {
    try {
      const listResult = await ruyi.list()
      if (listResult.code !== 0) {
        logger.error('Failed to list packages:', listResult.stderr)
        return
      }

      const parsedPackages = this.parsePorcelainListOutput(listResult.stdout)
      this.packages = parsedPackages
      this.categoryCounts = this.buildCategoryCounts(parsedPackages)
      this.hasLoaded = true
    }
    catch (error) {
      logger.error('Error fetching packages:', error)
    }
  }

  private buildCategoryCounts(packages: RuyiPackage[]): Map<PackageCategory, number> {
    const counts = new Map<PackageCategory, number>()
    for (const pkg of packages) {
      counts.set(pkg.category, (counts.get(pkg.category) || 0) + 1)
    }
    return counts
  }

  /**
   * Get all available categories with package counts.
   * @param forceRefresh If true, force refresh data from CLI.
   */
  public async getCategories(forceRefresh: boolean = false):
  Promise<{ category: PackageCategory, count: number }[]> {
    await this.loadPackages(forceRefresh)

    if (!this.hasLoaded) {
      return []
    }

    return Array.from(this.categoryCounts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([category, count]) => ({ category, count }))
  }

  /**
   * Get packages for a specific category (lazy load).
   * @param category The category to load packages for.
   */
  public async getPackagesByCategory(category: PackageCategory):
  Promise<RuyiPackage[]> {
    await this.loadPackages()

    if (!this.hasLoaded) {
      return []
    }

    return this.packages.filter(pkg => pkg.category === category)
  }

  /**
   * Get all available packages and cache the results.
   * @param forceRefresh If true, force refresh data from CLI.
   */
  public async getPackages(forceRefresh: boolean = false):
  Promise<RuyiPackage[]> {
    await this.loadPackages(forceRefresh)

    if (!this.hasLoaded) {
      return []
    }

    return this.packages
  }

  /**
  * Parse the NDJSON output of `ruyi --porcelain list`.
  * Each line is a separate JSON object.
  * @param output The raw NDJSON output
   */
  private parsePorcelainListOutput(output: string): RuyiPackage[] {
    return parseNDJSON<RuyiListOutput>(output)
      .filter(item => item.ty === 'pkglistoutput-v1')
      // Exclude 'source' category
      .filter(item => item.category !== 'source')
      .filter(item => PACKAGE_CATEGORIES.includes(item.category as PackageCategory))
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
            slug,
          }
        })

        return {
          name: `${item.category}/${item.name}`,
          category,
          versions,
        }
      })
  }
}
