// SPDX-License-Identifier: Apache-2.0
/**
 * RuyiSDK VS Code Extension - Venv Module - Type Definitions
 *
 * Provides type definitions for the venv module.
 */

/**
 * Information about a detected Ruyi virtual environment.
 */
export interface VenvInfo {
  name: string
  path: string
}

/**
 * Event listener for venv state changes.
 */
export type VenvStateListener = (venvPath: string | null) => void
