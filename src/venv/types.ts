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
  /** Relative path to the venv from workspace root */
  path: string
  /** Name of the venv (basename of the directory) */
  name: string
}

/**
 * Event listener for venv state changes.
 */
export type VenvStateListener = (venvPath: string | null) => void

/**
 * Represents a Ruyi toolchain package.
 */
export interface Toolchain {
  /** Toolchain package name */
  name: string
  /** Semantic version of the toolchain */
  version: string
  /** Whether the toolchain is installed locally */
  installed: boolean
  /** Whether this is the latest version */
  latest: boolean
  /** Package slug for installation */
  slug: string | null
}

/**
 * Represents a Ruyi emulator package.
 */
export interface EmulatorInfo {
  /** Emulator package name */
  name: string
  /** Semantic version of the emulator */
  semver: string
  /** Installation status remarks */
  remarks: string
}

/**
 * Represents a Ruyi profile.
 */
export type ProfilesMap = Record<string, string>

/**
 * Result type for emulator fetching that can be either success or error.
 */
export type EmulatorResult = EmulatorInfo[] | { errorMsg: string }
