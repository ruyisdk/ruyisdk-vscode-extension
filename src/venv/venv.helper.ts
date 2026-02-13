// SPDX-License-Identifier: Apache-2.0

import { parseNDJSON } from '../common/helpers'
import { logger } from '../common/logger'
import ruyi from '../ruyi'
import type { RuyiListOutput } from '../ruyi/types'

import type { Toolchain } from './types'

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
