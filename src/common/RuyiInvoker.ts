// SPDX-License-Identifier: Apache-2.0
/**
 * RuyiSDK VS Code Extension - Ruyi Invoker
 *
 * Provides cross-platform helpers for executing the Ruyi CLI with unified
 * result handling and high-level command wrappers.
 */

import { spawn } from 'child_process'
import type { SpawnOptions } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

import { DEFAULT_CMD_TIMEOUT_MS } from './constants'

// ============================================================================
// Types
// ============================================================================

export interface RuyiResult {
  stdout: string
  stderr: string
  code: number
}

/**
 * Options for running Ruyi commands.
 * Includes working directory, environment variables, and optional timeout.
 */
export interface RuyiRunOptions {
  cwd?: string
  env?: NodeJS.ProcessEnv
  timeout?: number
}

export type TelemetryStatus = 'on' | 'off' | 'local' | 'unknown'

export interface ListOptions {
  verbose?: boolean
  isInstalled?: boolean
  categoryContains?: string
  categoryIs?: string
  nameContains?: string
}

export interface InstallOptions {
  fetchOnly?: boolean
  host?: string
  reinstall?: boolean
}

export interface ExtractOptions {
  destDir?: string
  extractWithoutSubdir?: boolean
  fetchOnly?: boolean
  host?: string
}

export interface VenvOptions {
  name?: string
  toolchain?: string | string[]
  emulator?: string
  withSysroot?: boolean
  sysrootFrom?: string
  extraCommandsFrom?: string | string[]
}

export interface NewsListOptions {
  newOnly?: boolean
}

export interface SelfCleanOptions {
  all?: boolean
  distfiles?: boolean
  installedPkgs?: boolean
  newsReadStatus?: boolean
  progcache?: boolean
  repo?: boolean
  telemetry?: boolean
}

// ============================================================================
// Core Execution
// ============================================================================

/**
 * Resolve Ruyi executable path
 * Checks ~/.local/bin/ruyi first, then searches PATH environment variable
 */
export async function resolveRuyi(): Promise<string | null> {
  // Check user's local bin directory first
  const homeDir = process.env.HOME
  if (homeDir) {
    const localBinPath = path.join(homeDir, '.local', 'bin', 'ruyi')
    if (fs.existsSync(localBinPath)) {
      return localBinPath
    }
  }

  // Search in PATH directories
  const pathEnv = process.env.PATH
  if (!pathEnv) return null

  const pathDirs = pathEnv.split(':').filter(dir => dir.trim())
  for (const dir of pathDirs) {
    try {
      const ruyiPath = path.join(dir, 'ruyi')
      if (fs.existsSync(ruyiPath)) {
        return ruyiPath
      }
    }
    catch {
      // Skip inaccessible directories
      continue
    }
  }

  return null
}

/**
 * Execute a command with spawn and return the result
 */
function executeCommand(
  command: string,
  args: string[],
  options?: RuyiRunOptions,
): Promise<RuyiResult> {
  return new Promise((resolve) => {
    const timeout = options?.timeout ?? DEFAULT_CMD_TIMEOUT_MS
    const spawnOptions: SpawnOptions = {
      shell: false, // Don't use shell to avoid argument parsing issues
      cwd: options?.cwd,
      windowsHide: true,
      env: options?.env ?? process.env,
    }

    const child = spawn(command, args, spawnOptions)
    let stdout = ''
    let stderr = ''
    let settled = false
    let timedOut = false
    let timer: NodeJS.Timeout | undefined

    // Setup timeout
    if (timeout > 0) {
      timer = setTimeout(() => {
        timedOut = true
        child.kill()
      }, timeout)
    }

    // Collect output
    child.stdout?.on('data', (chunk: Buffer | string) => {
      stdout += chunk.toString()
    })

    child.stderr?.on('data', (chunk: Buffer | string) => {
      stderr += chunk.toString()
    })

    // Handle errors
    child.on('error', (err: Error) => {
      if (settled) return
      settled = true
      if (timer) clearTimeout(timer)

      resolve({
        stdout,
        stderr: stderr || err.message || 'Failed to execute command',
        code: 1,
      })
    })

    // Handle completion
    child.on('close', (code: number | null) => {
      if (settled) return
      settled = true
      if (timer) clearTimeout(timer)

      let exitCode = code ?? 0
      let errorOutput = stderr

      if (timedOut) {
        exitCode = exitCode || 1
        errorOutput += (errorOutput ? '\n' : '') + 'Command timed out'
      }

      resolve({
        stdout,
        stderr: errorOutput,
        code: exitCode,
      })
    })
  })
}

/**
 * Execute Ruyi CLI command with automatic path resolution and result normalization
 */
export async function runRuyi(
  args: string[],
  options?: RuyiRunOptions,
): Promise<RuyiResult> {
  // Resolve ruyi executable or fallback to python3 -m ruyi
  const ruyiPath = await resolveRuyi()
  const command = ruyiPath || 'python3'
  const commandArgs = ruyiPath ? args : ['-m', 'ruyi', ...args]

  // Execute command
  const result = await executeCommand(command, commandArgs, options)

  // Normalize output by trimming whitespace
  return {
    ...result,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
  }
}

// ============================================================================
// High-level Command Wrappers
// ============================================================================

/**
 * Get Ruyi version
 * @returns Version string or null if failed
 */
export async function ruyiVersion(): Promise<string | null> {
  const result = await runRuyi(['--version'])
  if (result.code !== 0) return null
  return result.stdout.split('\n', 1)[0]?.trim() || null
}

// ----------------------------------------------------------------------------
// List Command
// ----------------------------------------------------------------------------

/**
 * List packages with optional filters
 * @param options Filter options for listing packages
 * @param runOptions Execution options (cwd, env, timeout)
 */
export async function ruyiList(
  options?: ListOptions,
  runOptions?: RuyiRunOptions,
): Promise<RuyiResult> {
  const args = ['--porcelain', 'list']

  if (options?.verbose) {
    args.push('--verbose')
  }
  if (options?.isInstalled !== undefined) {
    args.push('--is-installed', options.isInstalled ? 'y' : 'n')
  }
  if (options?.categoryContains) {
    args.push('--category-contains', options.categoryContains)
  }
  if (options?.categoryIs) {
    args.push('--category-is', options.categoryIs)
  }
  args.push('--name-contains', options?.nameContains ?? '')

  return runRuyi(args, runOptions)
}

/**
 * List all available profiles
 */
export async function ruyiListProfiles(
  runOptions?: RuyiRunOptions,
): Promise<RuyiResult> {
  return runRuyi(['--porcelain', 'list', 'profiles'], runOptions)
}

// ----------------------------------------------------------------------------
// Install Command
// ----------------------------------------------------------------------------

/**
 * Install one or more packages
 * @param packages Package specifiers (atoms) to install
 * @param options Install options
 * @param runOptions Execution options
 */
export async function ruyiInstall(
  packages: string | string[],
  options?: InstallOptions,
  runOptions?: RuyiRunOptions,
): Promise<RuyiResult> {
  const args = ['install']

  if (options?.fetchOnly) {
    args.push('-f')
  }
  if (options?.host) {
    args.push('--host', options.host)
  }
  if (options?.reinstall) {
    args.push('--reinstall')
  }

  const pkgArray = Array.isArray(packages) ? packages : [packages]
  args.push(...pkgArray)

  return runRuyi(args, runOptions)
}

// ----------------------------------------------------------------------------
// Uninstall Command
// ----------------------------------------------------------------------------

/**
 * Uninstall one or more packages
 * @param packages Package specifiers (atoms) to uninstall
 * @param runOptions Execution options
 */
export async function ruyiUninstall(
  packages: string | string[],
  runOptions?: RuyiRunOptions,
): Promise<RuyiResult> {
  const args = ['uninstall', '-y']

  const pkgArray = Array.isArray(packages) ? packages : [packages]
  args.push(...pkgArray)

  return runRuyi(args, runOptions)
}

/**
 * Alias for ruyiUninstall
 */
export const ruyiRemove = ruyiUninstall

// ----------------------------------------------------------------------------
// Update Command
// ----------------------------------------------------------------------------

/**
 * Update RuyiSDK repo and packages
 */
export async function ruyiUpdate(
  runOptions?: RuyiRunOptions,
): Promise<RuyiResult> {
  return runRuyi(['update'], runOptions)
}

// ----------------------------------------------------------------------------
// Extract Command
// ----------------------------------------------------------------------------

/**
 * Fetch and extract package(s) to a directory
 * @param packages Package specifiers (atoms) to extract
 * @param options Extract options
 * @param runOptions Execution options
 */
export async function ruyiExtract(
  packages: string | string[],
  options?: ExtractOptions,
  runOptions?: RuyiRunOptions,
): Promise<RuyiResult> {
  const args = ['extract']

  if (options?.destDir) {
    args.push('-d', options.destDir)
  }
  if (options?.extractWithoutSubdir) {
    args.push('--extract-without-subdir')
  }
  if (options?.fetchOnly) {
    args.push('-f')
  }
  if (options?.host) {
    args.push('--host', options.host)
  }

  const pkgArray = Array.isArray(packages) ? packages : [packages]
  args.push(...pkgArray)

  return runRuyi(args, runOptions)
}

// ----------------------------------------------------------------------------
// Venv Command
// ----------------------------------------------------------------------------

/**
 * Generate a virtual environment adapted to the chosen toolchain and profile
 * @param profile Profile to use for the environment
 * @param dest Path to the new virtual environment
 * @param options Venv options
 * @param runOptions Execution options
 */
export async function ruyiVenv(
  profile: string,
  dest: string,
  options?: VenvOptions,
  runOptions?: RuyiRunOptions,
): Promise<RuyiResult> {
  const args = ['venv']

  if (options?.name) {
    args.push('--name', options.name)
  }
  if (options?.toolchain) {
    const toolchains = Array.isArray(options.toolchain) ? options.toolchain : [options.toolchain]
    toolchains.forEach(tc => args.push('--toolchain', tc))
  }
  if (options?.emulator) {
    args.push('--emulator', options.emulator)
  }
  if (options?.withSysroot === false) {
    args.push('--without-sysroot')
  }
  else if (options?.withSysroot === true) {
    args.push('--with-sysroot')
  }
  if (options?.sysrootFrom) {
    args.push('--sysroot-from', options.sysrootFrom)
  }
  if (options?.extraCommandsFrom) {
    const extras = Array.isArray(options.extraCommandsFrom)
      ? options.extraCommandsFrom
      : [options.extraCommandsFrom]
    extras.forEach(e => args.push('--extra-commands-from', e))
  }

  args.push(profile, dest)

  return runRuyi(args, runOptions)
}

// ----------------------------------------------------------------------------
// Device Command
// ----------------------------------------------------------------------------

/**
 * Interactively initialize a device for development
 */
export async function ruyiDeviceProvision(
  runOptions?: RuyiRunOptions,
): Promise<RuyiResult> {
  return runRuyi(['device', 'provision'], runOptions)
}

/**
 * Alias for ruyiDeviceProvision
 */
export const ruyiDeviceFlash = ruyiDeviceProvision

// ----------------------------------------------------------------------------
// News Command
// ----------------------------------------------------------------------------

/**
 * List news items
 * @param options News list options
 * @param runOptions Execution options
 */
export async function ruyiNewsList(
  options?: NewsListOptions,
  runOptions?: RuyiRunOptions,
): Promise<RuyiResult> {
  const args = ['news', 'list']

  if (options?.newOnly) {
    args.push('--new')
  }

  return runRuyi(args, runOptions)
}

/**
 * Read news item(s) by ordinal or ID
 * @param items Ordinal(s) or ID(s) of news items to read
 * @param runOptions Execution options
 */
export async function ruyiNewsRead(
  items: number | string | Array<number | string>,
  runOptions?: RuyiRunOptions,
): Promise<RuyiResult> {
  const args = ['news', 'read']

  const itemArray = Array.isArray(items) ? items : [items]
  args.push(...itemArray.map(String))

  return runRuyi(args, runOptions)
}

// ----------------------------------------------------------------------------
// Telemetry Command
// ----------------------------------------------------------------------------

/**
 * Get telemetry status
 */
export async function ruyiTelemetryStatus(): Promise<TelemetryStatus> {
  const result = await runRuyi(['telemetry', 'status'])

  const parseStatus = (text: string): TelemetryStatus => {
    const s = text.trim()
    return (s === 'on' || s === 'off' || s === 'local') ? s : 'unknown'
  }

  return parseStatus(result.stdout)
}

/**
 * Give consent to telemetry data uploads (enable telemetry)
 */
export async function ruyiTelemetryConsent(): Promise<TelemetryStatus> {
  await runRuyi(['telemetry', 'consent'])
  return ruyiTelemetryStatus()
}

/**
 * Set telemetry mode to local collection only
 */
export async function ruyiTelemetryLocal(): Promise<TelemetryStatus> {
  await runRuyi(['telemetry', 'local'])
  return ruyiTelemetryStatus()
}

/**
 * Opt out of telemetry data collection (disable telemetry)
 */
export async function ruyiTelemetryOptout(): Promise<TelemetryStatus> {
  await runRuyi(['telemetry', 'optout'])
  return ruyiTelemetryStatus()
}

/**
 * Upload collected telemetry data now
 */
export async function ruyiTelemetryUpload(
  runOptions?: RuyiRunOptions,
): Promise<RuyiResult> {
  return runRuyi(['telemetry', 'upload'], runOptions)
}

/**
 * Manage telemetry preferences
 * @param enable true to enable, false to disable, undefined to get status
 * @returns Object with current telemetry status
 */
export async function ruyiTelemetry(
  enable?: boolean,
): Promise<{ status: TelemetryStatus }> {
  if (enable === undefined) {
    const status = await ruyiTelemetryStatus()
    return { status }
  }

  const status = enable ? await ruyiTelemetryConsent() : await ruyiTelemetryOptout()
  return { status }
}

// ----------------------------------------------------------------------------
// Config Command
// ----------------------------------------------------------------------------

/**
 * Get a config value
 * @param key Config key to query
 */
export async function ruyiConfigGet(
  key: string,
  runOptions?: RuyiRunOptions,
): Promise<RuyiResult> {
  return runRuyi(['config', 'get', key], runOptions)
}

/**
 * Set a config value
 * @param key Config key to set
 * @param value Config value to set
 */
export async function ruyiConfigSet(
  key: string,
  value: string,
  runOptions?: RuyiRunOptions,
): Promise<RuyiResult> {
  return runRuyi(['config', 'set', key, value], runOptions)
}

/**
 * Unset a config option
 * @param key Config key to unset
 */
export async function ruyiConfigUnset(
  key: string,
  runOptions?: RuyiRunOptions,
): Promise<RuyiResult> {
  return runRuyi(['config', 'unset', key], runOptions)
}

/**
 * Remove a section from the config
 * @param section Config section to remove
 */
export async function ruyiConfigRemoveSection(
  section: string,
  runOptions?: RuyiRunOptions,
): Promise<RuyiResult> {
  return runRuyi(['config', 'remove-section', section], runOptions)
}

// ----------------------------------------------------------------------------
// Self Command
// ----------------------------------------------------------------------------

/**
 * Remove various Ruyi-managed data to reclaim storage
 * @param options Clean options
 * @param runOptions Execution options
 */
export async function ruyiSelfClean(
  options?: SelfCleanOptions,
  runOptions?: RuyiRunOptions,
): Promise<RuyiResult> {
  const args = ['self', 'clean', '--quiet']

  if (options?.all) {
    args.push('--all')
  }
  if (options?.distfiles) {
    args.push('--distfiles')
  }
  if (options?.installedPkgs) {
    args.push('--installed-pkgs')
  }
  if (options?.newsReadStatus) {
    args.push('--news-read-status')
  }
  if (options?.progcache) {
    args.push('--progcache')
  }
  if (options?.repo) {
    args.push('--repo')
  }
  if (options?.telemetry) {
    args.push('--telemetry')
  }

  return runRuyi(args, runOptions)
}

/**
 * Uninstall Ruyi
 */
export async function ruyiSelfUninstall(
  runOptions?: RuyiRunOptions,
): Promise<RuyiResult> {
  return runRuyi(['self', 'uninstall'], runOptions)
}
