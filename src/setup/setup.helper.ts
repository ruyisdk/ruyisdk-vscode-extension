// SPDX-License-Identifier: Apache-2.0
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

import { logger } from '../common/logger'

const execFileAsync = promisify(execFile)

const PACKAGE_METHODS = {
  pip: {
    install: [
      ['python3', '-m', 'pip', 'install', '--user', '-U', 'ruyi'],
      ['pip3', 'install', '--user', '-U', 'ruyi'],
      ['pip', 'install', '--user', '-U', 'ruyi'],
    ],
    update: [
      ['python3', '-m', 'pip', 'install', '--user', '-U', 'ruyi'],
      ['pip3', 'install', '--user', '-U', 'ruyi'],
      ['pip', 'install', '--user', '-U', 'ruyi'],
    ],
  },
  pipx: {
    install: [
      ['python3', '-m', 'pipx', 'install', 'ruyi'],
      ['pipx', 'install', 'ruyi'],
    ],
    update: [
      ['python3', '-m', 'pipx', 'upgrade', 'ruyi'],
      ['pipx', 'upgrade', 'ruyi'],
    ],
  },
} as const

type PackageMethodKey = keyof typeof PACKAGE_METHODS
type PackageOperation = keyof (typeof PACKAGE_METHODS)[PackageMethodKey]

export const PACKAGE_METHOD_KEYS = Object.keys(PACKAGE_METHODS) as PackageMethodKey[]

async function executeRuyiPackageCommand(
  methodKey: PackageMethodKey,
  operation: PackageOperation,
): Promise<void> {
  for (const args of PACKAGE_METHODS[methodKey][operation]) {
    try {
      await execFileAsync(args[0], [...args.slice(1)], { timeout: 60_000 })
      return
    }
    catch (error) {
      logger.log(`Not executed ${args.join(' ')}: ${error}, trying next command if available.`)
    }
  }
  throw new Error(`Failed to execute any command for ${methodKey} ${operation}.`)
}

export function executeRuyiInstall(methodKey: PackageMethodKey): Promise<void> {
  return executeRuyiPackageCommand(methodKey, 'install')
}

export function executeRuyiUpdate(methodKey: PackageMethodKey): Promise<void> {
  return executeRuyiPackageCommand(methodKey, 'update')
}
