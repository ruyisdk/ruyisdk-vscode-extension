// SPDX-License-Identifier: Apache-2.0
/**
 * RuyiSDK VS Code Extension - Venv Module - Sysroot Helper
 *
 * Provides stateless helper functions to deal with sysroot packages or custom sysroots.
 * These functions return data only and do NOT update global state or UI.
 */

import { logger } from '../common/logger'
import ruyi from '../ruyi'

import { SysrootPkgResult } from './types'
import { parsePkgs } from './venv.helper'

/**
 * Fetches all available Ruyi packages that can be used as a sysroot from the ruyi CLI.
 *
 * @returns Promise resolving to an array of SysrootPkgInfo objects, or an error object on failure
 */
export async function getSysrootPkgsFromRuyi(): Promise<SysrootPkgResult> {
  // TODO: Not all `toolchain` packages contains a sysroot, but Ruyi has not provided a way to check
  // it yet.
  const result = await ruyi.list({ categoryIs: 'toolchain' })

  if (result.code === 0) {
    return parsePkgs(result.stdout)
  }
  else {
    const errorMsg = `Failed to get sysroot packages: ${result.stderr}`
    logger.error(errorMsg)
    return { errorMsg }
  }
}
