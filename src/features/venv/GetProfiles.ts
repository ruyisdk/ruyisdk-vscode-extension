// SPDX-License-Identifier: Apache-2.0
/**
 * CreateVenv - GetProfiles module
 *
 * Provides helpers used by the commands layer:
 * - readStdoutP(stdout): convert ruyi list output to a dictionary, used by getProfiles()
 * - getProfiles(): Get all Ruyi profiles and return as a dictionary (deduplicated)
 */

import * as cp from 'child_process'
import * as util from 'util'

import { SHORT_CMD_TIMEOUT_MS } from '../../common/constants'
import { formatExecError } from '../../common/utils'

const execAsync = util.promisify(cp.exec)

export function readStdoutP(stdout: string): Record<string, string> {
  const dict: Record<string, string> = {}
  const lines = stdout.split(/\r?\n/)
  for (const line of lines) {
    if (!line.trim()) continue // skip empty lines
    // Use the entire line as the key, and the line without parentheses as the value
    const key = line
    const value = key.replace(/\([^()]*\)/g, '').trim()
    dict[key] = value
  }
  return dict
}

export async function getProfiles(): Promise<{ [key: string]: string }> {
  let profiles: { [key: string]: string } = {}
  try {
    const { stdout, stderr } = await execAsync(
      `ruyi list profiles`, { timeout: SHORT_CMD_TIMEOUT_MS },
    )
    if (stderr) {
      throw new Error(`Error getting profiles: ${stderr}`)
    }
    else {
      profiles = readStdoutP(stdout)
    }
  }
  catch (e: unknown) {
    // return error message
    throw new Error(`Failed to get profiles: ${formatExecError(e)}`)
  }
  return profiles
}
