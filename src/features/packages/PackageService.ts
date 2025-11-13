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

import { parseNDJSON } from '../../common/helpers'
import { logger } from '../../common/logger'
import ruyi, { PACKAGE_CATEGORIES, type PackageCategory } from '../../ruyi'
import type { RuyiListOutput } from '../../ruyi/types'

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

      this.packages = this.parsePorcelainListOutput(listResult.stdout)
      return this.packages
    }
    catch (error) {
      logger.error('Error fetching packages:', error)
      return []
    }
  }

  /**
   * Parse the NDJSON output of `ruyi --porcelain list`.
   * Each line is a separate JSON object.
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
