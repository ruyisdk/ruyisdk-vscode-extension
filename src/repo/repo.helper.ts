// SPDX-License-Identifier: Apache-2.0

import { parseNDJSON } from '../common/helpers'
import { logger } from '../common/logger'
import ruyi from '../ruyi'
import { RuyiRepoListOutput } from '../ruyi/types'

export async function getRepoList(): Promise<RuyiRepoListOutput[]> {
  const result = await ruyi.repoList()

  if (result.code === 0) {
    return parseRepoList(result.stdout)
  }

  logger.error(`Failed to get repo list: ${result.stderr}`)
  throw new Error(`Failed to get repo list: ${result.stderr}`)
}

export function parseRepoList(output: string): RuyiRepoListOutput[] {
  return parseNDJSON<RuyiRepoListOutput>(output)
}
