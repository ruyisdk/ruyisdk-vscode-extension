// SPDX-License-Identifier: Apache-2.0

/** Version information for a package */
export interface RuyiVersionInfo {
  semver: string
  remarks: string[]
  is_downloaded: boolean
  is_installed: boolean
  pm?: {
    metadata?: {
      desc?: string
      slug?: string
    }
  }
}

/** Output line from `ruyi --porcelain list` */
export interface RuyiListOutput {
  ty: string
  category: string
  name: string
  vers: RuyiVersionInfo[]
}
