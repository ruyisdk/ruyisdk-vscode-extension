// SPDX-License-Identifier: Apache-2.0
/**
 * PackageService
 *
 * Provides package listing, parsing, and installation status tracking.
 *
 * Features:
 * - Retrieves all available packages via `ruyi list`
 * - Parses package information including categories, versions, and metadata
 * - Tracks installation status by querying `ruyi list -- porcelain --installed`
 * - Caches results to minimize CLI calls
 */

import { VALID_PACKAGE_CATEGORIES } from '../../common/constants'
import ruyi from '../../common/ruyi'

export type PackageCategory = typeof VALID_PACKAGE_CATEGORIES[number] | 'unknown'

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

/**
 * NDJSON output type from `ruyi list --porcelain`
 */
interface RuyiPorcelainPackageOutput {
  ty: string
  category: string
  name: string
  vers: Array<{
    semver: string
    remarks: string[]
    is_installed: boolean
    is_downloaded: boolean
  }>
}

export class PackageService {
  private packages: RuyiPackage[] = []

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
        console.error('Failed to list packages:', listResult.stderr)
        return []
      }

      this.packages = this.parsePorcelainListOutput(listResult.stdout)
      return this.packages
    }
    catch (error) {
      console.error('Error fetching packages:', error)
      return []
    }
  }

  /**
   * Parse the NDJSON output of `ruyi --porcelain list`.
   * Each line is a separate JSON object.
   */
  private parsePorcelainListOutput(output: string): RuyiPackage[] {
    return output
      .split('\n')
      .filter(line => line.trim())
      .map((line) => {
        try {
          return JSON.parse(line) as RuyiPorcelainPackageOutput
        }
        catch {
          // Skip non-JSON lines (e.g., log messages)
          return null
        }
      })
      .filter(
        (item): item is RuyiPorcelainPackageOutput =>
          item !== null && item.ty === 'pkglistoutput-v1',
      )

      // Exclude 'source' category
      .filter(item => item.category !== 'source')
      .map((item) => {
        const category = this.normalizeCategory(item.category)
        const versions: RuyiPackageVersion[] = item.vers.map((v) => {
          const isPrerelease = v.semver.includes('-')
          const isLatest = v.remarks.includes('latest')
          const isLatestPrerelease = v.remarks.includes('latest-prerelease')
          const slugRemark = v.remarks.find(r => r.startsWith('slug:'))

          return {
            version: v.semver,
            isInstalled: v.is_installed,
            isLatest,
            isPrerelease,
            isLatestPrerelease,
            isBinaryAvailable: !v.remarks.includes('no-binary-for-current-host'),
            slug: slugRemark ? slugRemark.substring(5).trim() : undefined,
          }
        })

        return {
          name: `${item.category}/${item.name}`,
          category,
          versions,
        }
      })
  }

  /**
   * Normalize category string to PackageCategory type.
   */
  private normalizeCategory(category: string): PackageCategory {
    if ((VALID_PACKAGE_CATEGORIES as readonly string[]).includes(category)) {
      return category as PackageCategory
    }

    return 'unknown'
  }
}
