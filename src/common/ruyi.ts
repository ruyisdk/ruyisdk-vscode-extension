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
    const timeout = options?.timeout ?? 10_000
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
// High-level Command Wrappers - Builder Pattern
// ============================================================================

/**
 * RuyiInvoker - Fluent API for executing Ruyi commands
 *
 * Usage:
 *   - Default: await Ruyi.list()
 *   - With timeout: await Ruyi.timeout(5000).list()
 *   - Chained: await Ruyi.cwd('/path').timeout(3000).install('pkg')
 */
export class Ruyi {
  constructor(private options: RuyiRunOptions = {}) {}

  // ============================================================================
  // Builder Methods
  // ============================================================================

  /**
   * Set timeout for command execution
   */
  timeout(ms: number): Ruyi {
    return new Ruyi({ ...this.options, timeout: ms })
  }

  /**
   * Set working directory for command execution
   */
  cwd(path: string): Ruyi {
    return new Ruyi({ ...this.options, cwd: path })
  }

  /**
   * Set environment variables for command execution
   */
  env(env: NodeJS.ProcessEnv): Ruyi {
    return new Ruyi({ ...this.options, env })
  }

  // ============================================================================
  // Version Command
  // ============================================================================

  /**
   * Get Ruyi version
   * @returns Version string or null if failed
   */
  async version(): Promise<string | null> {
    const result = await runRuyi(['--version'], this.options)
    if (result.code !== 0) return null
    return result.stdout.split('\n', 1)[0]?.trim() || null
  }

  // ============================================================================
  // List Command
  // ============================================================================

  /**
   * List packages with optional filters
   */
  async list(options?: ListOptions): Promise<RuyiResult> {
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

    return runRuyi(args, this.options)
  }

  /**
   * List all available profiles
   */
  async listProfiles(): Promise<RuyiResult> {
    return runRuyi(['--porcelain', 'list', 'profiles'], this.options)
  }

  // ============================================================================
  // Install Command
  // ============================================================================

  /**
   * Install one or more packages
   */
  async install(
    packages: string | string[],
    options?: InstallOptions,
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

    return runRuyi(args, this.options)
  }

  // ============================================================================
  // Uninstall Command
  // ============================================================================

  /**
   * Uninstall one or more packages
   */
  async uninstall(packages: string | string[]): Promise<RuyiResult> {
    const args = ['uninstall', '-y']

    const pkgArray = Array.isArray(packages) ? packages : [packages]
    args.push(...pkgArray)

    return runRuyi(args, this.options)
  }

  /**
   * Alias for uninstall
   */
  async remove(packages: string | string[]): Promise<RuyiResult> {
    return this.uninstall(packages)
  }

  // ============================================================================
  // Update Command
  // ============================================================================

  /**
   * Update RuyiSDK repo and packages
   */
  async update(): Promise<RuyiResult> {
    return runRuyi(['update'], this.options)
  }

  // ============================================================================
  // Extract Command
  // ============================================================================

  /**
   * Fetch and extract package(s) to a directory
   */
  async extract(
    packages: string | string[],
    options?: ExtractOptions,
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

    return runRuyi(args, this.options)
  }

  // ============================================================================
  // Venv Command
  // ============================================================================

  /**
   * Generate a virtual environment adapted to the chosen toolchain and profile
   */
  async venv(
    profile: string,
    dest: string,
    options?: VenvOptions,
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

    return runRuyi(args, this.options)
  }

  // ============================================================================
  // Device Command
  // ============================================================================

  /**
   * Interactively initialize a device for development
   */
  async deviceProvision(): Promise<RuyiResult> {
    return runRuyi(['device', 'provision'], this.options)
  }

  /**
   * Alias for deviceProvision
   */
  async deviceFlash(): Promise<RuyiResult> {
    return this.deviceProvision()
  }

  // ============================================================================
  // News Command
  // ============================================================================

  /**
   * List news items
   */
  async newsList(options?: NewsListOptions): Promise<RuyiResult> {
    const args = ['news', 'list']

    if (options?.newOnly) {
      args.push('--new')
    }

    return runRuyi(args, this.options)
  }

  /**
   * Read news item(s) by ordinal or ID
   */
  async newsRead(
    items: number | string | Array<number | string>,
  ): Promise<RuyiResult> {
    const args = ['news', 'read']

    const itemArray = Array.isArray(items) ? items : [items]
    args.push(...itemArray.map(String))

    return runRuyi(args, this.options)
  }

  // ============================================================================
  // Telemetry Command
  // ============================================================================

  /**
   * Get telemetry status
   */
  async telemetryStatus(): Promise<TelemetryStatus> {
    const result = await runRuyi(['telemetry', 'status'], this.options)

    const parseStatus = (text: string): TelemetryStatus => {
      const s = text.trim()
      return (s === 'on' || s === 'off' || s === 'local') ? s : 'unknown'
    }

    return parseStatus(result.stdout)
  }

  /**
   * Give consent to telemetry data uploads (enable telemetry)
   */
  async telemetryConsent(): Promise<TelemetryStatus> {
    await runRuyi(['telemetry', 'consent'], this.options)
    return this.telemetryStatus()
  }

  /**
   * Set telemetry mode to local collection only
   */
  async telemetryLocal(): Promise<TelemetryStatus> {
    await runRuyi(['telemetry', 'local'], this.options)
    return this.telemetryStatus()
  }

  /**
   * Opt out of telemetry data collection (disable telemetry)
   */
  async telemetryOptout(): Promise<TelemetryStatus> {
    await runRuyi(['telemetry', 'optout'], this.options)
    return this.telemetryStatus()
  }

  /**
   * Upload collected telemetry data now
   */
  async telemetryUpload(): Promise<RuyiResult> {
    return runRuyi(['telemetry', 'upload'], this.options)
  }

  /**
   * Manage telemetry preferences
   * @param enable true to enable, false to disable, undefined to get status
   */
  async telemetry(
    enable?: boolean,
  ): Promise<{ status: TelemetryStatus }> {
    if (enable === undefined) {
      const status = await this.telemetryStatus()
      return { status }
    }

    const status = enable ? await this.telemetryConsent() : await this.telemetryOptout()
    return { status }
  }

  // ============================================================================
  // Config Command
  // ============================================================================

  /**
   * Get a config value
   */
  async configGet(key: string): Promise<RuyiResult> {
    return runRuyi(['config', 'get', key], this.options)
  }

  /**
   * Set a config value
   */
  async configSet(key: string, value: string): Promise<RuyiResult> {
    return runRuyi(['config', 'set', key, value], this.options)
  }

  /**
   * Unset a config option
   */
  async configUnset(key: string): Promise<RuyiResult> {
    return runRuyi(['config', 'unset', key], this.options)
  }

  /**
   * Remove a section from the config
   */
  async configRemoveSection(section: string): Promise<RuyiResult> {
    return runRuyi(['config', 'remove-section', section], this.options)
  }

  // ============================================================================
  // Self Command
  // ============================================================================

  /**
   * Remove various Ruyi-managed data to reclaim storage
   */
  async selfClean(options?: SelfCleanOptions): Promise<RuyiResult> {
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

    return runRuyi(args, this.options)
  }

  /**
   * Uninstall Ruyi
   */
  async selfUninstall(): Promise<RuyiResult> {
    return runRuyi(['self', 'uninstall'], this.options)
  }
}

export default new Ruyi()
