// SPDX-License-Identifier: Apache-2.0
/**
 * RuyiSDK VS Code Extension - Venv Module - Profile Helper
 *
 * Provides stateless helper functions for fetching and parsing Ruyi profiles.
 * These functions return data only and do NOT update global state or UI.
 */

import { logger } from '../common/logger'
import ruyi from '../ruyi'

import type { ProfilesMap } from './types'

export type { ProfilesMap }

/**
 * Parses the raw stdout from `ruyi list` command to extract profiles.
 * Cleans up parenthetical annotations and returns a sorted dictionary.
 *
 * @param stdout - Raw output from ruyi list command
 * @returns Sorted dictionary mapping cleaned profile names to raw lines
 */
export function parseProfiles(stdout: string): ProfilesMap {
  const dict: Record<string, string> = {}
  const lines = stdout.split(/\r?\n/)

  for (const line of lines) {
    if (!line.trim()) continue // skip empty lines

    const raw = line
    // Remove any parenthetical annotations, e.g., "(needs quirks: {'xthead'})" or "（需要特殊特性：{'xthead'}）"
    const label = raw.replace(/[(\uff08][^()\uff08\uff09]*[)\uff09]/g, '').trim()
    if (!label) continue

    // Map cleaned name -> raw line so UI can show raw in description
    dict[label] = raw
  }

  // Sort the dictionary by keys
  const sortedDict: Record<string, string> = {}
  Object.keys(dict).sort().forEach((key) => {
    sortedDict[key] = dict[key]
  })

  return sortedDict
}

/**
 * Fetches all available Ruyi profiles from the ruyi CLI.
 *
 * @returns Promise resolving to a dictionary of profiles
 * @throws Error if the ruyi command fails
 */
export async function getProfilesFromRuyi(): Promise<ProfilesMap> {
  const result = await ruyi.listProfiles()

  if (result.code === 0) {
    return parseProfiles(result.stdout)
  }
  else {
    logger.error(`Failed to get profiles: ${result.stderr}`)
    throw new Error(`Failed to get profiles: ${result.stderr}`)
  }
}
