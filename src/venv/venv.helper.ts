// SPDX-License-Identifier: Apache-2.0

import { parseNDJSON } from '../common/helpers'
import { logger } from '../common/logger'
import ruyi from '../ruyi'
import type { RuyiListOutput } from '../ruyi/types'

import type { PkgInfo, Toolchain } from './types'

export type { Toolchain }

/**
 * Resolve venv path from VS Code command argument payload.
 * Supports direct string arguments and tree items that expose `venvPath`.
 */
export function resolveVenvPathArg(arg: unknown): string | undefined {
  if (typeof arg === 'string') {
    return arg
  }

  if (arg && typeof arg === 'object' && 'venvPath' in arg) {
    const { venvPath } = arg as { venvPath?: unknown }
    return typeof venvPath === 'string' ? venvPath : undefined
  }

  return undefined
}

/**
 * Parse toolchains from `ruyi list --porcelain` output.
 */
export function parseToolchains(output: string): Toolchain[] {
  const result: Toolchain[] = []
  const objects = parseNDJSON<RuyiListOutput>(output)

  for (const obj of objects) {
    const name = obj.name || ''
    if (!Array.isArray(obj.vers)) {
      continue
    }

    for (const v of obj.vers) {
      const semver = v.semver || ''
      const remarks = v.remarks || []

      result.push({
        name,
        version: semver,
        installed: remarks.includes('installed'),
        latest: remarks.includes('latest'),
        slug: v.pm?.metadata?.slug || null,
        remarks,
        included_sysroot: v.pm?.toolchain?.included_sysroot,
      })
    }
  }

  return result
}

/**
 * Fetch all available Ruyi toolchains from the CLI.
 */
export async function getToolchainsFromRuyi(): Promise<Toolchain[]> {
  const result = await ruyi.list({ categoryIs: 'toolchain' })

  if (result.code === 0) {
    return parseToolchains(result.stdout)
  }

  logger.error(`Failed to get toolchains: ${result.stderr}`)
  throw new Error(`Failed to get toolchains: ${result.stderr}`)
}

export async function ruyiVersionIsAbove(expected: string): Promise<boolean> {
  const result = await ruyi.version()
  if (!result) {
    return false
  }

  const actual = result.split('-')[0].split('+')[0]
  const [actualMajor, actualMinor, actualPatch] = actual.split('.').map(Number)
  const [expectedMajor, expectedMinor, expectedPatch] = expected.split('.').map(Number)

  if (actualMajor > expectedMajor) return true
  if (actualMajor < expectedMajor) return false

  if (actualMinor > expectedMinor) return true
  if (actualMinor < expectedMinor) return false

  return actualPatch >= expectedPatch
}

/**
 * Parses the raw stdout from `ruyi list --porcelain` command to extract package information.
 * Filters and transforms the NDJSON output into a structured array of PkgInfo objects.
 *
 * @param output - Raw NDJSON output from ruyi list command
 * @returns Array of PkgInfo objects
 */
export function parsePkgs(output: string): PkgInfo[] {
  const result: PkgInfo[] = []

  // Use parseNDJSON helper to parse newline-delimited JSON
  const objects = parseNDJSON<RuyiListOutput>(output)

  for (const obj of objects) {
    const name = obj.name || ''

    // vers is an array to be iterated
    if (Array.isArray(obj.vers)) {
      for (const v of obj.vers) {
        const semver = v.semver || ''
        // remarks is always an array based on actual CLI output
        const remarks: string[] = v.remarks || []

        result.push({
          name,
          semver,
          remarks,
        })
      }
    }
  }

  return result
}
