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

import ruyi from '../../common/ruyi'

interface EmulatorInfo {
  name: string
  semver: string
  remarks: string
}

export function parseStdoutE(text: string): EmulatorInfo[] {
  // Split the text into segments based on single newlines
  const segments = text
    .split('\n')
    .map(seg => seg.trim())
    .filter(seg => seg.length > 0)

  const result: EmulatorInfo[] = []

  for (const seg of segments) {
    try {
      const obj = JSON.parse(seg)
      const name = obj.name || ''
      // vers is an array to be iterated
      if (Array.isArray(obj.vers)) {
        for (const v of obj.vers) {
          const semver = v.semver || ''
          // Concat the array of remarks into a single string
          const remarks = Array.isArray(v.remarks)
            ? v.remarks.join(', ')
            : (v.remarks || '')
          result.push({ name, semver, remarks })
        }
      }
    }
    catch (e) {
      // Output JSON parse errors
      console.error('JSON parse error:', e)
    }
  }

  return result
}

export async function getEmulators():
Promise<{ name: string, semver: string, remarks: string }[] | { errorMsg: string }> {
  const result = await ruyi.getEmulators()
  if (result.code == 0) {
    const emus = parseStdoutE(result.stdout)
    return emus
  }
  else {
    return { errorMsg: `Failed to get emulators: ${result.stderr}` }
  }
}
