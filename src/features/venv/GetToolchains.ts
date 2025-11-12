// SPDX-License-Identifier: Apache-2.0
/**
 * RuyiSDK VS Code Extension - Venv Module - Venv Creating Utility - Toolchains Fetching Helper Functions
 *
 * Provides helpers used by the commands layer:
 * - class Toolchain: represent a Ruyi toolchain
 *   the Object has the following fields:
 *   name, installed (boolean), version, latest(boolean), slug
 * - parseStdoutT(stdout): convert json output to a Dict-array
 *   useless info lines are filtered out
 *   kept fields are: name, vers/semver, vers/pm/metadata/slug, vers/remarks. They locates in different levels.
 *   used by getToolchains()
 * - getToolchains(): Get all Ruyi toolchains and return as a Object-array
 */
import { parseNDJSON } from '../../common/helpers'
import ruyi from '../../common/ruyi'

interface Toolchain {
  name: string
  version: string
  installed: boolean
  latest: boolean
  slug: string | null
}

export function parseStdoutT(text: string): Toolchain[] {
  const result: Toolchain[] = []

  // Use parseNDJSON helper to parse newline-delimited JSON
  const objects = parseNDJSON<{ name?: string, vers?: Array<{
    semver?: string
    remarks?: string | string[]
    pm?: { metadata?: { slug?: string } }
  }> }>(text)

  for (const obj of objects) {
    const name = obj.name || ''
    // vers is an array to be iterated
    if (Array.isArray(obj.vers)) {
      for (const v of obj.vers) {
        const semver = v.semver || ''
        // Concat the array of remarks into a single string
        const remarks = Array.isArray(v.remarks)
          ? v.remarks.join(', ')
          : (v.remarks || '')
        const slug = v.pm?.metadata?.slug || null
        const installed = remarks.includes('installed')
        const latest = remarks.includes('latest')
        result.push({ name, version: semver, installed, latest, slug })
      }
    }
  }

  return result
}

export async function getToolchains(): Promise<Toolchain[]> {
  let toolchains: Toolchain[] = []
  const result = await ruyi.list({ categoryIs: 'toolchain' })
  if (result.code == 0) {
    toolchains = parseStdoutT(result.stdout)
  }
  else {
    throw new Error(`Failed to get toolchains: ${result.stderr}`)
  }
  return toolchains
}
