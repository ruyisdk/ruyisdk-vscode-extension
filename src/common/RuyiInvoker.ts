// SPDX-License-Identifier: Apache-2.0
/**
 * RuyiSDK VS Code Extension - Ruyi Invoker
 *
 * Provides cross-platform helpers for executing the Ruyi CLI with unified
 * result handling.
 */

import {spawn} from 'child_process';
import type {SpawnOptions} from 'child_process';

import {DEFAULT_CMD_TIMEOUT_MS} from './constants';

export type RuyiResult = {
  stdout: string; stderr: string; code: number;
};

/**
 * Options for running Ruyi commands.
 * Includes working directory, environment variables, and optional timeout.
 */
export type RuyiRunOptions = Pick<SpawnOptions, 'cwd'|'env'>&{
  timeout?: number;
};

// Execute Ruyi CLI command
export function runRuyi(
    args: string[], options?: RuyiRunOptions): Promise<RuyiResult> {
  return new Promise((resolve) => {
    const spawnOptions: SpawnOptions = {
      shell: true,
      cwd: options?.cwd,
      windowsHide: true,
      env: options?.env ?? process.env,
    };

    const timeout = options?.timeout ?? DEFAULT_CMD_TIMEOUT_MS;

    const child = spawn('python3', ['-m', 'ruyi', ...args], spawnOptions);
    let stdout = '';
    let stderr = '';
    let timer: NodeJS.Timeout|undefined;
    let timedOut = false;
    let settled = false;

    if (timeout > 0) {
      timer = setTimeout(() => {
        timedOut = true;
        child.kill();
      }, timeout);
    }

    child.stdout?.on('data', (chunk: Buffer|string) => {
      stdout += chunk.toString();
    });
    child.stderr?.on('data', (chunk: Buffer|string) => {
      stderr += chunk.toString();
    });

    child.on('error', (err: Error) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      const message = err.message || 'Failed to execute Ruyi.';
      resolve({stdout, stderr: message, code: 1});
    });

    child.on('close', (code: number|null) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      let resultCode = typeof code === 'number' ? code : 0;

      if (timedOut) {
        resultCode = resultCode || 1;
        stderr += (stderr ? '\n' : '') + 'Ruyi command timed out.';
      }

      resolve({stdout, stderr, code: resultCode});
    });
  });
}

function normalizeRuyiResult(result: RuyiResult): RuyiResult {
  return {
    ...result,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
  };
}

// High-level wrappers for Ruyi commands
export function ruyiList(
    args: string[] = [], options?: RuyiRunOptions): Promise<RuyiResult> {
  return runRuyi(['list', ...args], options).then(normalizeRuyiResult);
}

export function ruyiInstall(
    args: string[] = [], options?: RuyiRunOptions): Promise<RuyiResult> {
  return runRuyi(['install', ...args], options).then(normalizeRuyiResult);
}

export function ruyiRemove(
    args: string[] = [], options?: RuyiRunOptions): Promise<RuyiResult> {
  return runRuyi(['remove', ...args], options).then(normalizeRuyiResult);
}

export function ruyiUpdate(
    args: string[] = [], options?: RuyiRunOptions): Promise<RuyiResult> {
  return runRuyi(['update', ...args], options).then(normalizeRuyiResult);
}

export function ruyiVersion(options?: RuyiRunOptions): Promise<RuyiResult> {
  return runRuyi(['--version'], options).then(normalizeRuyiResult);
}

export async function getRuyiVersion(options?: RuyiRunOptions):
    Promise<string> {
  try {
    const result = await ruyiVersion(options);
    if (result.code !== 0) return '';
    const firstLine = result.stdout.split('\n', 1)[0]?.trim();
    return firstLine ?? '';
  } catch {
    return '';
  }
}
