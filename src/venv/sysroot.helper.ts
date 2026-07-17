// SPDX-License-Identifier: Apache-2.0
/**
 * RuyiSDK VS Code Extension - Venv Module - Sysroot Helper
 *
 * Provides stateless helper functions to deal with sysroot packages or custom sysroots.
 * These functions return data only and do NOT update global state or UI.
 */

import { logger } from '../common/logger'

import { SysrootPkgResult } from './types'
import { getToolchainsFromRuyi } from './venv.helper'

/**
 * Fetches all available Ruyi packages that can be used as a sysroot from the ruyi CLI.
 *
 * @returns Promise resolving to an array of SysrootPkgInfo objects, or an error object on failure
 */
export async function getSysrootPkgsFromRuyi(): Promise<SysrootPkgResult> {
  try {
    const toolchains = await getToolchainsFromRuyi()
    const sysroots = toolchains.filter(toolchain => toolchain.included_sysroot)
    const sysrootPkgs = sysroots.map(toolchain => (
      {
        name: toolchain.name,
        semver: toolchain.version,
        remarks: toolchain.remarks,
      }
    ))
    return sysrootPkgs
  }
  catch (error) {
    const errorMsg = `Failed to get sysroot packages: ${error}`
    logger.error(errorMsg)
    return { errorMsg }
  }
}
