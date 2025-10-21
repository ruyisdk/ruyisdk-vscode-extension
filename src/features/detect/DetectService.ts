// SPDX-License-Identifier: Apache-2.0
/**
 * DetectService
 *
 * Provides detectRuyiVersion() for use by the commands layer.
 *
 * Detection process:
 *  1. Attempts to retrieve the Ruyi version via the CLI (`ruyi --version`)
 *  2. Falls back to the Python entrypoint (`python -m ruyi --version`) if CLI
 * is unavailable
 *
 * Returns the detected version string on success, or null if Ruyi is not found.
 */

import * as cp from 'child_process'
import * as https from 'https'
import * as util from 'util'

import { SHORT_CMD_TIMEOUT_MS } from '../../common/constants'
import { getRuyiVersion } from '../../common/RuyiInvoker'
import { pythonCandidates } from '../../common/utils'

const execAsync = util.promisify(cp.exec)

export async function detectRuyiVersion(): Promise<string | null> {
  const cliVersion = await getRuyiVersion({ timeout: SHORT_CMD_TIMEOUT_MS })
  if (cliVersion) return cliVersion

  for (const py of pythonCandidates()) {
    try {
      const { stdout } = await execAsync(`${py} -m ruyi --version`, {
        timeout: SHORT_CMD_TIMEOUT_MS,
      })
      const pyVersion = stdout.trim()
      if (pyVersion) return pyVersion
    }
    catch {
      continue
    }
  }
  return null
}

/**
 * Fetches the latest Ruyi version from GitHub Releases API
 * @returns The latest version string (e.g., "0.12.0") or null if unavailable
 */
export async function getLatestRuyiVersion(): Promise<string | null> {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.github.com',
      path: '/repos/ruyisdk/ruyi/releases/latest',
      method: 'GET',
      headers: {
        'User-Agent': 'ruyisdk-vscode-extension',
      },
      timeout: 5000,
    }

    const req = https.request(options, (res) => {
      let data = ''

      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const release = JSON.parse(data)
            const tagName = release.tag_name
            // Remove 'v' prefix if present (e.g., "v0.12.0" -> "0.12.0")
            const version = tagName?.startsWith('v') ? tagName.slice(1) : tagName
            resolve(version || null)
          }
          else {
            resolve(null)
          }
        }
        catch {
          resolve(null)
        }
      })
    })

    req.on('error', () => {
      resolve(null)
    })

    req.on('timeout', () => {
      req.destroy()
      resolve(null)
    })

    req.end()
  })
}

/**
 * Compares two semantic version strings
 * @returns 1 if v1 > v2, -1 if v1 < v2, 0 if equal, null if comparison fails
 */
export function compareVersions(v1: string, v2: string): number | null {
  try {
    const parseVersion = (v: string) => {
      // Extract version number from strings like "0.12.0" or "Ruyi 0.12.0"
      const match = v.match(/(\d+)\.(\d+)\.(\d+)/)
      if (!match) return null
      return {
        major: Number.parseInt(match[1], 10),
        minor: Number.parseInt(match[2], 10),
        patch: Number.parseInt(match[3], 10),
      }
    }

    const ver1 = parseVersion(v1)
    const ver2 = parseVersion(v2)

    if (!ver1 || !ver2) return null

    if (ver1.major !== ver2.major) {
      return ver1.major > ver2.major ? 1 : -1
    }
    if (ver1.minor !== ver2.minor) {
      return ver1.minor > ver2.minor ? 1 : -1
    }
    if (ver1.patch !== ver2.patch) {
      return ver1.patch > ver2.patch ? 1 : -1
    }
    return 0
  }
  catch {
    return null
  }
}
