// SPDX-License-Identifier: Apache-2.0
/**
 * RuyiSDK VS Code Extension - Venv Module - Venv Creating Utility - Emulator Fetching Helper Functions
 *
 * Provides helpers used by the commands layer:
 * - class Toolchain: represent a Ruyi toolchain
 *   the Object has the following fields:
 *   name, installed (boolean), version, latest(boolean), slug
 * - parseStdoutE(json): convert json output to a Dict-array
 *   useless info lines are filtered out
 *   kept fields are: name, semver, remarks. They locates in different levels.
 *   used by getEmulators()
 * - getEmulators(): Get all Ruyi emulators and return as a Dict-array
 */

import { parseNDJSON } from '../../common/helpers'
import ruyi from '../../ruyi'
import type { RuyiListOutput } from '../../ruyi/types'

interface EmulatorInfo {
  name: string
  semver: string
  remarks: string
}

export function parseStdoutE(text: string): EmulatorInfo[] {
  const result: EmulatorInfo[] = []

  // Use parseNDJSON helper to parse newline-delimited JSON
  const objects = parseNDJSON<RuyiListOutput>(text)

  for (const obj of objects) {
    const name = obj.name || ''
    // vers is an array to be iterated
    if (Array.isArray(obj.vers)) {
      for (const v of obj.vers) {
        const semver = v.semver || ''
        // remarks is always an array based on actual CLI output
        const remarks = (v.remarks || []).join(', ')
        result.push({ name, semver, remarks })
      }
    }
  }

  return result
}

export async function getEmulators():
Promise<{ name: string, semver: string, remarks: string }[] | { errorMsg: string }> {
  const result = await ruyi.list({ categoryIs: 'emulator' })
  if (result.code == 0) {
    const emus = parseStdoutE(result.stdout)
    return emus
  }
  else {
    return { errorMsg: `Failed to get emulators: ${result.stderr}` }
  }
}
