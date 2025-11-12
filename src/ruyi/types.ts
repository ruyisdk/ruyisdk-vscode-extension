// SPDX-License-Identifier: Apache-2.0
/**
 * Type Definitions for Ruyi CLI Output
 * Based on --porcelain (NDJSON) output format
 */

/** Base version information for all package types */
export interface RuyiVersionBase {
  semver: string
  remarks: string[] // Always an array, e.g. ["latest"], ["latest", "installed"]
  is_downloaded: boolean
  is_installed: boolean
}

/** Base package metadata (common fields) */
export interface RuyiPackageMetadata {
  format: string
  metadata: {
    desc?: string
    vendor?: {
      name: string
      eula: string
    }
    slug?: string
  }
  kind?: string[]
}

/** Toolchain metadata with toolchain-specific fields */
export interface RuyiToolchainMetadata extends RuyiPackageMetadata {
  toolchain: {
    target: string
    flavors?: string[]
    components?: Array<{
      name: string
      version: string
    }>
    included_sysroot?: string
  }
}

/** Emulator metadata with emulator-specific fields */
export interface RuyiEmulatorMetadata extends RuyiPackageMetadata {
  emulator: {
    flavors?: string[]
    programs?: Array<{
      path: string
      flavor: string
      supported_arches?: string[]
    }>
  }
}

/** Regular package version info */
export interface RuyiPackageVersionInfo extends RuyiVersionBase {
  pm?: RuyiPackageMetadata
}

/** Toolchain package version info */
export interface RuyiToolchainVersionInfo extends RuyiVersionBase {
  pm: RuyiToolchainMetadata
}

/** Emulator package version info */
export interface RuyiEmulatorVersionInfo extends RuyiVersionBase {
  pm: RuyiEmulatorMetadata
}

/** Generic list item with name and versions */
export interface RuyiListItem<V = RuyiVersionBase> {
  name: string
  vers: V[]
}

/** Full package output from `ruyi --porcelain list` */
export interface RuyiPorcelainPackageOutput {
  ty: string
  category: string
  name: string
  vers: RuyiPackageVersionInfo[]
}

/** Toolchain list item */
export type RuyiToolchainListItem = RuyiListItem<RuyiToolchainVersionInfo>

/** Emulator list item */
export type RuyiEmulatorListItem = RuyiListItem<RuyiEmulatorVersionInfo>
