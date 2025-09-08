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
