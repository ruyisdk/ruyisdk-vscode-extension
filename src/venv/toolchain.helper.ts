// SPDX-License-Identifier: Apache-2.0
/**
 * RuyiSDK VS Code Extension - Venv Module - Toolchain Helper
 *
 * Provides stateless helper functions for fetching and parsing Ruyi toolchains.
 * These functions return data only and do NOT update global state or UI.
 */

import { parseNDJSON } from '../common/helpers'
import { logger } from '../common/logger'
import ruyi from '../ruyi'
import type { RuyiListOutput } from '../ruyi/types'

import type { Toolchain } from './types'

export type { Toolchain }

/**
 * Parses the raw stdout from `ruyi list --porcelain` command to extract toolchain information.
 * Filters and transforms the NDJSON output into a structured array of Toolchain objects.
 *
 * @param output - Raw NDJSON output from ruyi list command
 * @returns Array of Toolchain objects
 */
export function parseToolchains(output: string): Toolchain[] {
  const result: Toolchain[] = []

  // Use parseNDJSON helper to parse newline-delimited JSON
  const objects = parseNDJSON<RuyiListOutput>(output)

  for (const obj of objects) {
    const name = obj.name || ''

    // vers is an array to be iterated
    if (Array.isArray(obj.vers)) {
      for (const v of obj.vers) {
        const semver = v.semver || ''
        // remarks is always an array based on actual CLI output
        const remarks = v.remarks || []
        const slug = v.pm?.metadata?.slug || null
        const installed = remarks.includes('installed')
        const latest = remarks.includes('latest')

        result.push({
          name,
          version: semver,
          installed,
          latest,
          slug,
        })
      }
    }
  }

  return result
}

/**
 * Fetches all available Ruyi toolchains from the ruyi CLI.
 *
 * @returns Promise resolving to an array of Toolchain objects
 * @throws Error if the ruyi command fails
 */
export async function getToolchainsFromRuyi(): Promise<Toolchain[]> {
  const result = await ruyi.list({ categoryIs: 'toolchain' })

  if (result.code === 0) {
    return parseToolchains(result.stdout)
  }
  else {
    logger.error(`Failed to get toolchains: ${result.stderr}`)
    throw new Error(`Failed to get toolchains: ${result.stderr}`)
  }
}
