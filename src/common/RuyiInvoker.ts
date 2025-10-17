// SPDX-License-Identifier: Apache-2.0
/**
 * RuyiSDK VS Code Extension - Ruyi Invoker
 *
 * Provides cross-platform helpers for executing the Ruyi CLI with unified
 * result handling.
 */

import { spawn, exec } from 'child_process'
import type { SpawnOptions } from 'child_process'
import { promisify } from 'util'

import { DEFAULT_CMD_TIMEOUT_MS, SHORT_CMD_TIMEOUT_MS } from './constants'

const execAsync = promisify(exec)

export type RuyiResult = {
  stdout: string
  stderr: string
  code: number
}

/**
 * Options for running Ruyi commands.
 * Includes working directory, environment variables, and optional timeout.
 */
export type RuyiRunOptions = Pick<SpawnOptions, 'cwd' | 'env'> & {
  timeout?: number
}

// Execute Ruyi CLI command
async function resolvePipxPython(): Promise<string | null> {
  try {
    const { stdout: pipxList } = await execAsync('pipx list --json', {
      timeout: SHORT_CMD_TIMEOUT_MS,
    })
    try {
      const pipxData = JSON.parse(pipxList)
      const venvPath = pipxData?.venvs?.ruyi?.metadata?.main_package_path
      if (typeof venvPath === 'string' && venvPath.length > 0) {
        return `${venvPath}/bin/python`
      }
    } catch {
      // ignore JSON parse errors
    }
  } catch {
    // pipx not available or failed; fall through to common paths
  }

  const commonPipxPaths = [
    `${process.env.HOME}/.local/share/pipx/venvs/ruyi/bin/python`,
    `${process.env.XDG_DATA_HOME || `${process.env.HOME}/.local/share`}/pipx/venvs/ruyi/bin/python`,
    `/opt/pipx/venvs/ruyi/bin/python`,
  ]
  for (const pythonPath of commonPipxPaths) {
    try {
      await execAsync(`${pythonPath} -m ruyi --version`, { timeout: SHORT_CMD_TIMEOUT_MS })
      return pythonPath
    } catch {
      // try next path
    }
  }
  return null
}

export async function runRuyi(
  args: string[], options?: RuyiRunOptions): Promise<RuyiResult> {
  const pipxPython = await resolvePipxPython()
  const command = pipxPython ?? 'python3'
  const baseArgs = pipxPython ? ['-m', 'ruyi'] : ['-m', 'ruyi']
  const commandArgs = [...baseArgs, ...args]

  return new Promise((resolve) => {
    const spawnOptions: SpawnOptions = {
      shell: true,
      cwd: options?.cwd,
      windowsHide: true,
      env: options?.env ?? process.env,
    }

    const timeout = options?.timeout ?? DEFAULT_CMD_TIMEOUT_MS

    const child = spawn(command, commandArgs, spawnOptions)
    let stdout = ''
    let stderr = ''
    let timer: NodeJS.Timeout | undefined
    let timedOut = false
    let settled = false

    if (timeout > 0) {
      timer = setTimeout(() => {
        timedOut = true
        child.kill()
      }, timeout)
    }

    child.stdout?.on('data', (chunk: Buffer | string) => {
      stdout += chunk.toString()
    })
    child.stderr?.on('data', (chunk: Buffer | string) => {
      stderr += chunk.toString()
    })

    child.on('error', (err: Error) => {
      if (settled) return
      settled = true
      if (timer) clearTimeout(timer)
      const message = err.message || 'Failed to execute Ruyi.'
      resolve({ stdout, stderr: message, code: 1 })
    })

    child.on('close', (code: number | null) => {
      if (settled) return
      settled = true
      if (timer) clearTimeout(timer)
      let resultCode = typeof code === 'number' ? code : 0

      if (timedOut) {
        resultCode = resultCode || 1
        stderr += (stderr ? '\n' : '') + 'Ruyi command timed out.'
      }

      resolve({ stdout, stderr, code: resultCode })
    })
  })
}

function normalizeRuyiResult(result: RuyiResult): RuyiResult {
  return {
    ...result,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
  }
}

// High-level wrappers for Ruyi commands
export function ruyiList(
  args: string[] = [], options?: RuyiRunOptions): Promise<RuyiResult> {
  return runRuyi(['--porcelain', 'list', ...args], options).then(normalizeRuyiResult)
}

export function ruyiInstall(
  args: string[] = [], options?: RuyiRunOptions): Promise<RuyiResult> {
  return runRuyi(['install', ...args], options).then(normalizeRuyiResult)
}

export function ruyiRemove(
  args: string[] = [], options?: RuyiRunOptions): Promise<RuyiResult> {
  return runRuyi(['remove', ...args], options).then(normalizeRuyiResult)
}

export function ruyiUpdate(
  args: string[] = [], options?: RuyiRunOptions): Promise<RuyiResult> {
  return runRuyi(['update', ...args], options).then(normalizeRuyiResult)
}

export async function ruyiVersion(): Promise<string | null> {
  const result = await runRuyi(['--version']).then(normalizeRuyiResult)
  if (result.code !== 0) return null
  return result.stdout.split('\n', 1)[0]?.trim()
}
