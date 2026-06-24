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

/** Output line from `ruyi --porcelain repo list` */
export interface RuyiRepoListOutput {
  ty: string
  id: string
  name: string
  remote: string
  branch: string
  local_path: string | null
  priority: number
  active: boolean
  is_system: boolean
}
