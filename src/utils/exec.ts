// SPDX-License-Identifier: Apache-2.0
/**
 * RuyiSDK VS Code Extension - Exec Utilities
 */

import * as cp from 'child_process';
import {promisify} from 'util';
import {ERR_NOT_SUPPORTED, ERR_RUYI_NOT_FOUND} from '../common/constants';

export interface ExecResult {
  code: number;  // exit code
  stdout: string;
  stderr: string;
}

const CMD_TIMEOUT_MS = 10_000;  // ms
const RUYI_NAME = 'ruyi';
const execAsync = promisify(cp.exec);

function findOnPath(binName: string): string|null {
  try {
    const out = cp.execSync(`which ${binName}`, {
                    stdio: ['ignore', 'pipe', 'ignore'],
                    timeout: CMD_TIMEOUT_MS,
                  })
                    .toString()
                    .trim();
    return out.split(/\r?\n/)[0]?.trim() || null;
  } catch {
    return null;
  }
}

export function resolveRuyiPath(): string|null {
  return findOnPath(RUYI_NAME);
}

export async function runRuyi(
    args: string[],
    cwd?: string,
    ): Promise<ExecResult> {
  if (process.platform !== 'linux') {
    return {code: ERR_NOT_SUPPORTED, stdout: '', stderr: 'Linux only'};
  }

  const ruyi = resolveRuyiPath();
  if (!ruyi) {
    return {code: ERR_RUYI_NOT_FOUND, stdout: '', stderr: 'ruyi not found'};
  }

  try {
    const {stdout, stderr} = await execAsync(`${ruyi} ${args.join(' ')}`, {
      cwd,
      timeout: CMD_TIMEOUT_MS,
    });
    return {code: 0, stdout, stderr};
  } catch (err: any) {
    return {
      code: err.code ?? -1,
      stdout: err.stdout ?? '',
      stderr: err.stderr ?? (err.message || ''),
    };
  }
}
