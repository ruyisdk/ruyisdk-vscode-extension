// SPDX-License-Identifier: Apache-2.0
/**
 * RuyiSDK VS Code Extension - Venv Module - Emulator Helper
 *
 * Provides stateless helper functions for fetching and parsing Ruyi emulators.
 * These functions return data only and do NOT update global state or UI.
 */

import { parseNDJSON } from '../common/helpers'
import { logger } from '../common/logger'
import ruyi from '../ruyi'
import type { RuyiListOutput } from '../ruyi/types'

import type { EmulatorInfo, EmulatorResult } from './types'

export type { EmulatorInfo, EmulatorResult }

/**
 * Parses the raw stdout from `ruyi list --porcelain` command to extract emulator information.
 * Filters and transforms the NDJSON output into a structured array of EmulatorInfo objects.
 *
 * @param output - Raw NDJSON output from ruyi list command
 * @returns Array of EmulatorInfo objects
 */
export function parseEmulators(output: string): EmulatorInfo[] {
  const result: EmulatorInfo[] = []

  // Use parseNDJSON helper to parse newline-delimited JSON
  const objects = parseNDJSON<RuyiListOutput>(output)

  for (const obj of objects) {
    const name = obj.name || ''

    // vers is an array to be iterated
    if (Array.isArray(obj.vers)) {
      for (const v of obj.vers) {
        const semver = v.semver || ''
        // remarks is always an array based on actual CLI output
        const remarks = (v.remarks || []).join(', ')

        result.push({
          name,
          semver,
          remarks,
        })
      }
    }
  }

  return result
}

/**
 * Fetches all available Ruyi emulators from the ruyi CLI.
 *
 * @returns Promise resolving to an array of EmulatorInfo objects, or an error object on failure
 */
export async function getEmulatorsFromRuyi(): Promise<EmulatorResult> {
  const result = await ruyi.list({ categoryIs: 'emulator' })

  if (result.code === 0) {
    return parseEmulators(result.stdout)
  }
  else {
    const errorMsg = `Failed to get emulators: ${result.stderr}`
    logger.error(errorMsg)
    return { errorMsg }
  }
}
