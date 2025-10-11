// SPDX-License-Identifier: Apache-2.0
/**
 * RuyiSDK VS Code Extension - Ruyi Invoker
 *
 * Provides cross-platform helpers for executing the Ruyi CLI with unified
 * result handling.
 */

import {spawn} from 'child_process';
import type {SpawnOptions} from 'child_process';

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

// Resolve Ruyi executable path
function resolveRuyiBinary(): string {
  const envValue = process.env.RUYI_BIN?.trim();
  if (envValue) return envValue;
  return process.platform === 'win32' ? 'ruyi.exe' : 'ruyi';
}

// Generate helpful hint for PATH or permission issues
function buildPathHint(bin: string): string {
  const shown = bin.includes(' ') ? `"${bin}"` : bin;
  const base =
      `Ensure the Ruyi executable is available at ${shown} or set RUYI_BIN.`;
  const extra = process.platform === 'win32' ?
      'Verify it is on your PATH and that ruyi.exe can run without elevated permissions.' :
      'Verify it is on your PATH and has execute permission for the current user.';
  return `${base}\n${extra}`;
}

// Execute Ruyi CLI command
export function runRuyi(
    args: string[], options?: RuyiRunOptions): Promise<RuyiResult> {
  const bin = resolveRuyiBinary();

  return new Promise((resolve) => {
    const spawnOptions: SpawnOptions = {
      shell: true,
      cwd: options?.cwd,
      windowsHide: true,
      env: options?.env ?? process.env,
    };

    const child = spawn(bin, args, spawnOptions);
    let stdout = '';
    let stderr = '';
    let timer: NodeJS.Timeout|undefined;
    let timedOut = false;
    let settled = false;

    if (options?.timeout && options.timeout > 0) {
      timer = setTimeout(() => {
        timedOut = true;
        child.kill();
      }, options.timeout);
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
      const hint = buildPathHint(bin);
      const message = `${err.message || 'Failed to execute Ruyi.'}\n${hint}`;
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

      if (resultCode !== 0) {
        const hint = buildPathHint(bin);
        if (!stderr.includes(hint)) stderr += '\n' + hint;
      }

      resolve({stdout, stderr, code: resultCode});
    });
  });
}

// High-level wrappers for Ruyi commands
export function ruyiList(
    args: string[] = [], options?: RuyiRunOptions): Promise<RuyiResult> {
  return runRuyi(['list', ...args], options);
}

export function ruyiInstall(
    args: string[] = [], options?: RuyiRunOptions): Promise<RuyiResult> {
  return runRuyi(['install', ...args], options);
}

export function ruyiRemove(
    args: string[] = [], options?: RuyiRunOptions): Promise<RuyiResult> {
  return runRuyi(['remove', ...args], options);
}

export function ruyiUpdate(
    args: string[] = [], options?: RuyiRunOptions): Promise<RuyiResult> {
  return runRuyi(['update', ...args], options);
}

export function ruyiVersion(options?: RuyiRunOptions): Promise<RuyiResult> {
  return runRuyi(['--version'], options);
}
