// SPDX-License-Identifier: Apache-2.0
/**
 * RuyiSDK VS Code Extension - Venv Module - Emulator Helper
 *
 * Provides stateless helper functions for fetching and parsing Ruyi emulators.
 * These functions return data only and do NOT update global state or UI.
 */

import { logger } from '../common/logger'
import ruyi from '../ruyi'

import type { PkgInfo as EmulatorInfo, EmulatorResult } from './types'
import { parsePkgs } from './venv.helper'

export type { EmulatorInfo, EmulatorResult }

/**
 * Fetches all available Ruyi emulators from the ruyi CLI.
 *
 * @returns Promise resolving to an array of EmulatorInfo objects, or an error object on failure
 */
export async function getEmulatorsFromRuyi(): Promise<EmulatorResult> {
  const result = await ruyi.list({ categoryIs: 'emulator' })

  if (result.code === 0) {
    return parsePkgs(result.stdout)
  }
  else {
    const errorMsg = `Failed to get emulators: ${result.stderr}`
    logger.error(errorMsg)
    return { errorMsg }
  }
}
