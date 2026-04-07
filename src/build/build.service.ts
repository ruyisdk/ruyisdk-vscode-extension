// SPDX-License-Identifier: Apache-2.0
/**
 * RuyiSDK VS Code Extension - Build Module - Service
 *
 * Responsibilities:
 * - Load build system detection rules from a JSON rule file.
 *   Rule precedence: workspace `.ruyi-build-rules.json` > bundled `media/build-rules.json`.
 * - Detect the active build system by scanning workspace root for indicator files.
 * - Execute build steps, optionally inside an active Ruyi virtual environment.
 *
 * When a Ruyi venv is active the step is run as:
 *   bash -c 'source "$RUYI_ACTIVATE_SCRIPT" && exec "$@"' -- <command> [args…]
 * The activation script path is passed through the RUYI_ACTIVATE_SCRIPT env var to
 * avoid shell-quoting problems with paths that contain spaces or special characters.
 * This guarantees that every compiler/tool variable set by ruyi-activate (CC, CXX,
 * PATH, …) is present in the child process environment.
 */

import { spawn } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as vscode from 'vscode'

import { getWorkspaceFolderPath } from '../common/helpers'
import { logger } from '../common/logger'
import { VenvService } from '../venv/venv.service'

// ─── Rule file schema ─────────────────────────────────────────────────────────

/** A single build action (e.g. "configure" or "build"). */
export interface BuildStep {
  /** Human-readable label shown in progress messages. */
  name: string
  /** Executable name resolved via PATH (or venv bin directory). */
  command: string
  /** Arguments passed verbatim to the executable. */
  args: string[]
  /**
   * Working directory relative to the workspace root.
   * Defaults to "." (workspace root) when omitted.
   */
  workdir?: string
  /**
   * When true the step is executed via `bash -c` so the shell can expand
   * globs (e.g. `*.c`), handle pipes, etc.  When combined with a Ruyi venv
   * the activation script is sourced first.
   *
   * ⚠ Shell-unsafe for argument values that contain spaces — quote them
   * explicitly in the rule file when needed.
   */
  useShell?: boolean
}

/** Describes one build system and how to detect and drive it. */
export interface BuildRule {
  /** Stable identifier used for logging and future extensions. */
  id: string
  /** Display name shown to the user (e.g. "CMake", "GNU Make"). */
  name: string
  /**
   * Detection priority.  When multiple rules match the workspace, the rule
   * with the highest priority wins (CMake > GNU Make by default).
   */
  priority: number
  /**
   * Exact file or directory names searched in the workspace root.
   * The first indicator that exists causes this rule to match.
   */
  indicators: string[]
  /**
   * Glob patterns (relative to workspace root) used when exact `indicators`
   * are insufficient.  Evaluated with `vscode.workspace.findFiles` after all
   * `indicators` have been checked.  The rule matches when at least one file
   * satisfies any of the patterns.
   *
   * Example: `["*.c"]` matches any C source file in the workspace root.
   */
  indicatorGlobs?: string[]
  /** Ordered list of steps to execute when building. */
  steps: BuildStep[]
}

/** Top-level structure of a build-rules JSON file. */
export interface BuildRulesConfig {
  version: string
  description?: string
  rules: BuildRule[]
}

/** Result returned by detectBuildSystem(). */
export interface DetectedBuildSystem {
  rule: BuildRule
  workspaceRoot: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Filename for a workspace-level rule override.
 * When present, replaces the bundled rule set entirely.
 */
const WORKSPACE_RULES_FILE = '.ruyi-build-rules.json'

// ─── Service ──────────────────────────────────────────────────────────────────

export class BuildService implements vscode.Disposable {
  private static _instance: BuildService
  private _outputChannel: vscode.OutputChannel | null = null

  private constructor() {}

  public static get instance(): BuildService {
    if (!BuildService._instance) {
      BuildService._instance = new BuildService()
    }
    return BuildService._instance
  }

  private get outputChannel(): vscode.OutputChannel {
    if (!this._outputChannel) {
      this._outputChannel = vscode.window.createOutputChannel('RuyiSDK Build')
    }
    return this._outputChannel
  }

  // ─── Rule loading ──────────────────────────────────────────────────────────

  /**
   * Loads build rules with workspace-level override support.
   *
   * Priority:
   *   1. `<workspaceRoot>/.ruyi-build-rules.json`  (user-defined)
   *   2. `media/build-rules.json` bundled with the extension
   */
  public async loadRules(extensionUri: vscode.Uri): Promise<BuildRulesConfig> {
    // 1. Workspace override
    try {
      const workspaceRoot = getWorkspaceFolderPath()
      const overridePath = path.join(workspaceRoot, WORKSPACE_RULES_FILE)
      const raw = fs.readFileSync(overridePath, 'utf8')
      logger.info(`Build rules loaded from workspace override: ${overridePath}`)
      return JSON.parse(raw) as BuildRulesConfig
    }
    catch {
      // No workspace override – fall through
    }

    // 2. Bundled rules
    const bundledUri = vscode.Uri.joinPath(extensionUri, 'media', 'build-rules.json')
    const bytes = await vscode.workspace.fs.readFile(bundledUri)
    return JSON.parse(Buffer.from(bytes).toString('utf8')) as BuildRulesConfig
  }

  // ─── Build system detection ────────────────────────────────────────────────

  /**
   * Scans the workspace root for indicator files and returns the best-matching
   * build rule, or `null` if the workspace has no open folder or no rule matches.
   */
  public async detectBuildSystem(extensionUri: vscode.Uri): Promise<DetectedBuildSystem | null> {
    let workspaceRoot: string
    try {
      workspaceRoot = getWorkspaceFolderPath()
    }
    catch {
      return null
    }

    const config = await this.loadRules(extensionUri)

    // Evaluate rules from highest to lowest priority
    const sorted = [...config.rules].sort((a, b) => b.priority - a.priority)

    for (const rule of sorted) {
      // 1. Exact filename indicators (fast, synchronous)
      for (const indicator of rule.indicators) {
        const candidate = path.join(workspaceRoot, indicator)
        if (fs.existsSync(candidate)) {
          logger.info(`Detected build system: ${rule.name} (matched indicator: ${indicator})`)
          return { rule, workspaceRoot }
        }
      }

      // 2. Glob indicators (async, used when no exact indicator matched)
      if (rule.indicatorGlobs && rule.indicatorGlobs.length > 0) {
        for (const glob of rule.indicatorGlobs) {
          const pattern = new vscode.RelativePattern(workspaceRoot, glob)
          const files = await vscode.workspace.findFiles(pattern, null, 1)
          if (files.length > 0) {
            logger.info(`Detected build system: ${rule.name} (matched glob: ${glob} → ${files[0].fsPath})`)
            return { rule, workspaceRoot }
          }
        }
      }
    }

    return null
  }

  // ─── Build execution ───────────────────────────────────────────────────────

  /**
   * Detects the build system in the workspace and runs all of its steps.
   * When a Ruyi venv is active, each step is executed inside that environment.
   */
  public async build(extensionUri: vscode.Uri): Promise<void> {
    const detected = await this.detectBuildSystem(extensionUri)
    if (!detected) {
      vscode.window.showWarningMessage(
        'No supported build system found in the workspace. '
        + 'Supported: CMake (CMakeLists.txt), GNU Make (Makefile), GCC (*.c). '
        + 'You can also add a .ruyi-build-rules.json to the workspace root to define custom rules.',
      )
      return
    }

    const { rule, workspaceRoot } = detected
    const venvPath = VenvService.instance.getCurrentVenv()

    this.outputChannel.clear()
    this.outputChannel.show(true)
    this.outputChannel.appendLine(`=== RuyiSDK Build: ${rule.name} ===`)
    if (venvPath) {
      this.outputChannel.appendLine(`Virtual environment : ${venvPath}`)
    }
    else {
      this.outputChannel.appendLine('Virtual environment : none (building without venv)')
    }
    this.outputChannel.appendLine('')

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Building with ${rule.name}`,
        cancellable: false,
      },
      async (progress) => {
        const total = rule.steps.length

        for (let i = 0; i < total; i++) {
          const step = rule.steps[i]

          progress.report({
            message: step.name,
            increment: i === 0 ? 0 : Math.floor(100 / total),
          })

          this.outputChannel.appendLine(`--- ${step.name} ---`)

          const stepWorkdir = step.workdir
            ? path.resolve(workspaceRoot, step.workdir)
            : workspaceRoot

          let exitCode: number
          try {
            exitCode = await this.runStep(step, stepWorkdir, venvPath)
          }
          catch (err) {
            this.outputChannel.appendLine(`\n✗ Step '${step.name}' could not start: ${err}`)
            vscode.window.showErrorMessage(
              `Build failed: could not start '${step.command}'. `
              + 'Is it installed and on PATH?',
            )
            return
          }

          if (exitCode !== 0) {
            this.outputChannel.appendLine(
              `\n✗ Step '${step.name}' failed (exit code ${exitCode})`,
            )
            vscode.window.showErrorMessage(
              `Build failed at step '${step.name}' (exit code ${exitCode}). `
              + 'See the "RuyiSDK Build" output panel for details.',
            )
            return
          }

          this.outputChannel.appendLine('')
        }

        progress.report({ increment: 100, message: 'Done' })
        this.outputChannel.appendLine('=== Build succeeded ===')
        vscode.window.showInformationMessage(`✓ Build succeeded (${rule.name})`)
      },
    )
  }

  // ─── Internal helpers ──────────────────────────────────────────────────────

  /**
   * Spawns a single build step and streams its output to the output channel.
   *
   * @param step      The build step to execute.
   * @param workdir   Absolute working directory for the process.
   * @param venvPath  Absolute path to the active Ruyi venv, or null.
   * @returns         The process exit code (0 = success).
   */
  private runStep(
    step: BuildStep,
    workdir: string,
    venvPath: string | null,
  ): Promise<number> {
    return new Promise((resolve, reject) => {
      let spawnCmd: string
      let spawnArgs: string[]
      const spawnEnv: NodeJS.ProcessEnv = { ...process.env }

      const activateScript = venvPath ? path.join(venvPath, 'bin', 'ruyi-activate') : ''

      if (step.useShell) {
        /**
         * Shell mode: join command + args into a single shell string so the
         * shell can expand globs, pipes, etc.
         * If a venv is active, the activation script is sourced first.
         */
        const shellCmd = [step.command, ...step.args].join(' ')
        spawnCmd = 'bash'
        if (venvPath) {
          spawnArgs = ['-c', 'source "$RUYI_ACTIVATE_SCRIPT" && ' + shellCmd]
          spawnEnv.RUYI_ACTIVATE_SCRIPT = activateScript
        }
        else {
          spawnArgs = ['-c', shellCmd]
        }
      }
      else if (venvPath) {
        /**
         * Safe mode with venv: pass command + args as positional parameters so
         * they are never re-parsed by the shell.
         *
         * bash -c 'source "$RUYI_ACTIVATE_SCRIPT" && exec "$@"' -- cmd [args…]
         *   $0 = "--"  (placeholder)
         *   $@ = cmd args…  (exec'd verbatim, no word-splitting)
         */
        spawnCmd = 'bash'
        spawnArgs = [
          '-c',
          'source "$RUYI_ACTIVATE_SCRIPT" && exec "$@"',
          '--',
          step.command,
          ...step.args,
        ]
        spawnEnv.RUYI_ACTIVATE_SCRIPT = activateScript
      }
      else {
        // Safe mode, no venv: spawn directly, no shell involved
        spawnCmd = step.command
        spawnArgs = step.args
      }

      const proc = spawn(spawnCmd, spawnArgs, {
        cwd: workdir,
        env: spawnEnv,
        stdio: ['ignore', 'pipe', 'pipe'],
      })

      proc.stdout.on('data', (chunk: Buffer) => {
        this.outputChannel.append(chunk.toString())
      })

      proc.stderr.on('data', (chunk: Buffer) => {
        this.outputChannel.append(chunk.toString())
      })

      proc.on('close', (code) => {
        resolve(code ?? -1)
      })

      proc.on('error', reject)
    })
  }

  dispose(): void {
    this._outputChannel?.dispose()
  }
}
