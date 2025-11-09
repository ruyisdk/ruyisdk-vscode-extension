import * as vscode from 'vscode'

/**
 * Logger class that wraps VS Code's LogOutputChannel for console-like logging.
 * Provides similar methods to console (log, info, warn, error, debug).
 * Uses VS Code's native log levels for proper formatting.
 */

export class Logger {
  static #outputChannel: vscode.LogOutputChannel | null = null

  /**
   * Initialize the logger with a LogOutputChannel.
   * Should be called once during extension activation.
   */
  static initialize(name: string = 'RuyiSDK'): void {
    if (!this.#outputChannel) {
      this.#outputChannel = vscode.window.createOutputChannel(name, { log: true })
    }
  }

  /**
   * Get the LogOutputChannel instance.
   * Creates one if it doesn't exist.
   */
  static #getChannel(): vscode.LogOutputChannel {
    if (!this.#outputChannel) {
      this.initialize()
    }
    return this.#outputChannel!
  }

  /**
   * Log a trace message (similar to console.trace)
   */
  static trace(message: string, ...args: unknown[]): void {
    this.#getChannel().trace(message, ...args)
  }

  /**
   * Log a debug message (similar to console.debug)
   */
  static debug(message: string, ...args: unknown[]): void {
    this.#getChannel().debug(message, ...args)
  }

  /**
   * Log an info message (similar to console.info)
   */
  static info(message: string, ...args: unknown[]): void {
    this.#getChannel().info(message, ...args)
  }

  /**
   * Log a message (similar to console.log)
   */
  static log(message: string, ...args: unknown[]): void {
    this.info(message, ...args)
  }

  /**
   * Log a warning message (similar to console.warn)
   */
  static warn(message: string, ...args: unknown[]): void {
    this.#getChannel().warn(message, ...args)
  }

  /**
   * Log an error message (similar to console.error)
   */
  static error(message: string, ...args: unknown[]): void {
    this.#getChannel().error(message, ...args)
  }

  /**
   * Show the output channel (similar to opening DevTools console)
   */
  static show(preserveFocus: boolean = true): void {
    this.#getChannel().show(preserveFocus)
  }

  /**
   * Clear the output channel (similar to console.clear)
   */
  static clear(): void {
    this.#getChannel().clear()
  }

  /**
   * Dispose the output channel
   */
  static dispose(): void {
    if (this.#outputChannel) {
      this.#outputChannel.dispose()
      this.#outputChannel = null
    }
  }
}

export { Logger as logger }
