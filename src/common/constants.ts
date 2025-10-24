// SPDX-License-Identifier: Apache-2.0
/**
 * RuyiSDK VS Code Extension - Common Constants
 *
 * Responsibilities:
 *  - Define shared error codes and constants used across the extension
 *  - Provide standard timeout values for command execution
 */

/** Error code constants */
export const ERR_NOT_SUPPORTED = -126 // Platform not supported
export const ERR_RUYI_NOT_FOUND = -127 // Ruyi command not found

/** Valid package categories */
export const VALID_PACKAGE_CATEGORIES = [
  'toolchain',
  'source',
  'emulator',
  'board-image',
  'analyzer',
  'extra',
] as const
