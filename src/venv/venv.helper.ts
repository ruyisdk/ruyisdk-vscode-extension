// SPDX-License-Identifier: Apache-2.0

import * as semver from 'semver'

import { parseNDJSON } from '../common/helpers'
import { logger } from '../common/logger'
import ruyi from '../ruyi'
import type { RuyiListOutput } from '../ruyi/types'

import type { PkgInfo, Toolchain } from './types'

export type { Toolchain }

/**
 * Compare two version strings semantically, descending (newest first).
 * Invalid or empty versions are pushed to the end.
 */
function compareVersionsDesc(a: string, b: string): number {
  const va = semver.valid(a) ?? semver.valid(semver.coerce(a))
  const vb = semver.valid(b) ?? semver.valid(semver.coerce(b))

  if (va && vb) {
    return semver.rcompare(va, vb)
  }
  if (va) return -1
  if (vb) return 1

  // Both invalid/unparseable: keep a deterministic order (empty last, then reverse lexicographic).
  const aEmpty = a === ''
  const bEmpty = b === ''
  if (aEmpty && bEmpty) return 0
  if (aEmpty) return 1
  if (bEmpty) return -1
  return b.localeCompare(a)
}

/**
 * Sort items alphabetically by name, then by version extracted via getVersion,
 * using semantic version comparison with the newest version first.
 */
function sortByNameThenVersion<T extends { name: string }>(
  items: T[],
  getVersion: (item: T) => string,
): T[] {
  return items.sort((a, b) => {
    const nameCmp = a.name.localeCompare(b.name)
    if (nameCmp !== 0) return nameCmp
    return compareVersionsDesc(getVersion(a), getVersion(b))
  })
}

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
        semver,
        remarks,
        included_sysroot: v.pm?.toolchain?.included_sysroot,
        quirks: v.pm?.toolchain?.quirks || [],
      })
    }
  }

  sortByNameThenVersion(result, t => t.semver)

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

  sortByNameThenVersion(result, p => p.semver)

  return result
}
