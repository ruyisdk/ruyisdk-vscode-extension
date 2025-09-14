// SPDX-License-Identifier: Apache-2.0
/**
 * RuyiSDK VS Code Extension - Common Constants
 *
 * Responsibilities:
 *  - Define shared error codes and constants used across the extension
 *  - Provide standard timeout values for command execution
 */

/** Error code constants */
export const ERR_NOT_SUPPORTED = -126;   // Platform not supported
export const ERR_RUYI_NOT_FOUND = -127;  // Ruyi command not found

/** Command execution timeouts */
export const SHORT_CMD_TIMEOUT_MS =
    5_000;  // quick checks (e.g. `ruyi --version`)
export const DEFAULT_CMD_TIMEOUT_MS = 10_000;  // most commands
export const LONG_CMD_TIMEOUT_MS =
    60_000;  // long tasks (e.g. pip install/upgrade)