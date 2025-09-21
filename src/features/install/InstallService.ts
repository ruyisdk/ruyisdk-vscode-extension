// SPDX-License-Identifier: Apache-2.0
/**
 * InstallService
 *
 * Provides helpers used by the commands layer:
 * - resolvePython(): locate an available Python interpreter
 * - installViaPip(py): install/upgrade Ruyi via pip and verify version
 */

import * as cp from 'child_process';
import * as util from 'util';
import {LONG_CMD_TIMEOUT_MS, SHORT_CMD_TIMEOUT_MS} from '../../common/constants';
import {formatExecError, pythonCandidates} from '../../common/utils';

const execAsync = util.promisify(cp.exec);

export async function resolvePython(): Promise<string|null> {
  for (const cmd of pythonCandidates()) {
    try {
      await execAsync(`${cmd} --version`, {timeout: SHORT_CMD_TIMEOUT_MS});
      return cmd;
    } catch {
      // try next candidate
    }
  }
  return null;
}

export async function installViaPip(py: string):
    Promise<{version?: string; warnPath?: boolean; errorMsg?: string}> {
  try {
    await execAsync(
        `${py} -m pip install --user -U ruyi`, {timeout: LONG_CMD_TIMEOUT_MS});

    try {
      const {stdout} = await execAsync(
          `${py} -m ruyi --version`, {timeout: SHORT_CMD_TIMEOUT_MS});
      return {version: stdout.trim(), warnPath: false};
    } catch {
      return {
        warnPath: true,
      };
    }
  } catch (e: unknown) {
    return {errorMsg: `Failed to install Ruyi: ${formatExecError(e)}`};
  }
}
