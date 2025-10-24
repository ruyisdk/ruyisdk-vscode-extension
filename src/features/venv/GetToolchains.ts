// SPDX-License-Identifier: Apache-2.0
/**
 * CreateVenv - GetToolchains module
 *
 * Provides helpers used by the commands layer:
 * - class Toolchain: represent a Ruyi toolchain
 *   the Object has the following fields:
 *   name, installed (boolean), version, latest(boolean), slug
 * - readStdoutT(stdout): convert ruyi list output to a Object-array
 *   used by getToolchains()
 *   the stdout contains lines like:
     * toolchain/`name1`
  - `version1` (latest)
  - `version2` slug: `slug`
     * toolchain/`name2`
  - `version1` (latest, installed)
 * - getToolchains(): Get all Ruyi toolchains and return as a Object-array
 */

import * as cp from 'child_process'
import * as util from 'util'

import { SHORT_CMD_TIMEOUT_MS } from '../../common/constants'
import { formatExecError } from '../../common/utils'

const execAsync = util.promisify(cp.exec)

interface Toolchain {
  name: string
  version: string
  installed: boolean
  latest: boolean
  slug: string | null
}

export function readStdoutT(stdout: string): Toolchain[] {
  const arrayT: Toolchain[] = []
  const lines = stdout.split(/\r?\n/)
  let name = ''
  for (const line of lines) {
    if (!line.trim()) continue // skip empty lines
    if (line.startsWith('* toolchain/')) {
      // New toolchain entry
      name = line.replace('* toolchain/', '').trim()
    }
    else {
      // Version line
      if (!name) continue // skip if no toolchain name found yet
      const cur = line.replace('- ', '').trim()
      // The version field elongates to the first space
      const versionMatch = cur.match(/^([^\s(]+)/)
      const version = versionMatch ? versionMatch[1] : ''
      const installed = cur.includes('installed')
      const latest = cur.includes('latest')
      const slugMatch = cur.match(/slug:\s*([^\s]+)/)
      const slug = slugMatch ? slugMatch[1] : null

      if (versionMatch) {
        const currentToolchain = { name: name, version: version,
          installed: installed, latest: latest, slug: slug }
        arrayT.push(currentToolchain)
      }
    }
  }
  return arrayT
}

export async function getToolchains(): Promise<Toolchain[]> {
  let toolchains: Toolchain[] = []
  try {
    const { stdout, stderr } = await execAsync(
      `ruyi list --category-is toolchain`, { timeout: SHORT_CMD_TIMEOUT_MS },
    )
    if (stderr) {
      throw new Error(`Error getting toolchains: ${stderr}`)
    }
    else {
      toolchains = readStdoutT(stdout)
    }
  }
  catch (e: unknown) {
    // return error message
    throw new Error(`Failed to get toolchains: ${formatExecError(e)}`)
  }
  return toolchains
}
