// SPDX-License-Identifier: Apache-2.0
/**
 * RuyiSDK VS Code Extension - Venv Module - Profile Helper
 *
 * Provides stateless helper functions for fetching and parsing Ruyi profiles.
 * These functions return data only and do NOT update global state or UI.
 */

import { logger } from '../common/logger'
import ruyi from '../ruyi'
import type { RuyiResult } from '../ruyi'

import type { ProfilesMap, RuyiProfile } from './types'

export type { ProfilesMap, RuyiProfile }

/**
 * Parse the JSON Lines output from entity list command into RuyiProfile array
 */
function parseProfilesOutput(result: RuyiResult): RuyiProfile[] {
  if (result.code !== 0) {
    throw new Error(`Failed to list profiles: ${result.stderr}`)
  }

  const profiles: RuyiProfile[] = []
  const lines = result.stdout.split(/\r?\n/).filter(line => line.trim())

  for (const line of lines) {
    try {
      const entity = JSON.parse(line)
      const data = entity.data?.['profile-v1']
      if (!data) continue

      profiles.push({
        id: data.id ?? entity.entity_id,
        displayName: data.display_name ?? entity.display_name,
        arch: data.arch ?? 'unknown',
        neededToolchainQuirks: data.needed_toolchain_quirks ?? [],
        toolchainCommonFlagsStr: data.toolchain_common_flags_str ?? '',
      })
    }
    catch (err) {
      logger.warn(`Failed to parse profile line: ${line}`, err)
    }
  }

  // Sort by display name for consistent ordering
  return profiles.sort((a, b) => a.displayName.localeCompare(b.displayName))
}

/**
 * Converts structured RuyiProfile array to ProfilesMap format.
 * Returns a map of display names to optional descriptions.
 *
 * @param profiles - Array of structured profile objects
 * @returns Dictionary mapping profile display names to descriptions (or undefined)
 */
export function parseProfiles(profiles: RuyiProfile[]): ProfilesMap {
  const dict: Record<string, string | undefined> = {}

  for (const profile of profiles) {
    // Build description only if quirks exist
    const description = profile.neededToolchainQuirks.length > 0
      ? `(needs quirks: ${profile.neededToolchainQuirks.join(', ')})`
      : undefined

    dict[profile.displayName] = description
  }

  return dict
}

/**
 * Fetches all available Ruyi profiles from the ruyi CLI.
 *
 * @returns Promise resolving to a dictionary of profiles
 * @throws Error if the ruyi command fails
 */
export async function getProfilesFromRuyi(): Promise<ProfilesMap> {
  try {
    const result = await ruyi.listProfiles()
    const profiles = parseProfilesOutput(result)
    return parseProfiles(profiles)
  }
  catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    logger.error(`Failed to get profiles: ${errorMsg}`)
    throw new Error(`Failed to get profiles: ${errorMsg}`)
  }
}
