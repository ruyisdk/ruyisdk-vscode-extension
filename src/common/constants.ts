// SPDX-License-Identifier: Apache-2.0
/**
 * RuyiSDK VS Code Extension - Common Constants
 *
 * Responsibilities:
 *  - Define shared constants used across the extension
 */

export type ConfigKey = typeof CONFIG_KEYS[keyof typeof CONFIG_KEYS]

/** Configuration keys */
export const CONFIG_KEYS = {
  CHECK_FOR_UPDATES: 'checkForUpdates',
  RUYI_PATH: 'ruyiPath',
  TELEMETRY: 'telemetry',
} as const
