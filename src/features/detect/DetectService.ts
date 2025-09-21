// SPDX-License-Identifier: Apache-2.0
/**
 * DetectService
 *
 * Provides detectRuyiVersion() for use by the commands layer.
 * - Tries multiple Python interpreter candidates
 * - Runs `python -m ruyi --version`
 * - Returns version string on success, null otherwise
 */

import * as cp from 'child_process';
import * as util from 'util';
import {SHORT_CMD_TIMEOUT_MS} from '../../common/constants';
import {pythonCandidates} from '../../common/utils';

const execAsync = util.promisify(cp.exec);

export async function detectRuyiVersion(): Promise<string|null> {
  for (const py of pythonCandidates()) {
    try {
      const {stdout} = await execAsync(`${py} -m ruyi --version`, {
        timeout: SHORT_CMD_TIMEOUT_MS,
      });
      const v = stdout.trim();
      if (v) return v;
    } catch {
      // ignore and try next candidate
    }
  }
  return null;
}