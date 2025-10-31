// SPDX-License-Identifier: Apache-2.0
/**
 * RuyiSDK VS Code Extension - Venv Module - Venv Creating Utility - Profiles Fetching Helper Functions
 *
 * Provides helpers used by the commands layer:
 * - readStdoutP(stdout): convert ruyi list output to a dictionary, used by getProfiles()
 * - getProfiles(): Get all Ruyi profiles and return as a dictionary (deduplicated)
 */

import ruyi from '../../common/ruyi'

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
  const result = await ruyi.getProfiles()
  if (result.code == 0) {
    profiles = readStdoutP(result.stdout)
  }
  else {
    // return error message
    throw new Error(`Failed to get profiles: ${result.stderr}`)
  }
  return profiles
}
