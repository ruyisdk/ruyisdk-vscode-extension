// SPDX-License-Identifier: Apache-2.0
/**
 * RuyiSDK VS Code Extension - Venv Module - Venv Creating Utility - Profiles Fetching Helper Functions
 *
 * Provides helpers used by the commands layer:
 * - readStdoutP(stdout): convert ruyi list output to a dictionary and sort it, used by getProfiles()
 * - getProfiles(): Get all Ruyi profiles and return as a dictionary (deduplicated and sorted)
 */

import ruyi from '../../ruyi'

export function readStdoutP(stdout: string): Record<string, string> {
  const dict: Record<string, string> = {}
  const lines = stdout.split(/\r?\n/)
  for (const line of lines) {
    if (!line.trim()) continue // skip empty lines
    const raw = line
    // Remove any parenthetical annotations, e.g., "(needs quirks: {'xthead'})"
    const label = raw.replace(/\([^()]*\)/g, '').trim()
    if (!label) continue

    // Map cleaned name -> raw line so UI can show raw in description
    dict[label] = raw
  }
  // Sort the dictionary by keys
  const sortedDict: Record<string, string> = {}
  Object.keys(dict).sort().forEach((key) => {
    sortedDict[key] = dict[key]
  })
  return sortedDict
}

export async function getProfiles(): Promise<{ [key: string]: string }> {
  let profiles: { [key: string]: string } = {}
  const result = await ruyi.listProfiles()
  if (result.code == 0) {
    profiles = readStdoutP(result.stdout)
  }
  else {
    // return error message
    throw new Error(`Failed to get profiles: ${result.stderr}`)
  }
  return profiles
}
