// SPDX-License-Identifier: Apache-2.0
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const PACKAGE_METHODS = {
  pip: {
    install: ['-m', 'pip', 'install', '--user', '-U', 'ruyi'],
    update: ['-m', 'pip', 'install', '--user', '-U', 'ruyi'],
  },
  pipx: {
    install: ['-m', 'pipx', 'install', 'ruyi'],
    update: ['-m', 'pipx', 'upgrade', 'ruyi'],
  },
} as const

type PackageMethodKey = keyof typeof PACKAGE_METHODS
type PackageOperation = keyof (typeof PACKAGE_METHODS)[PackageMethodKey]

export const PACKAGE_METHOD_KEYS = Object.keys(PACKAGE_METHODS) as PackageMethodKey[]

async function executeRuyiPackageCommand(
  methodKey: PackageMethodKey,
  operation: PackageOperation,
): Promise<void> {
  const args = PACKAGE_METHODS[methodKey][operation]
  await execFileAsync('python3', [...args], { timeout: 60_000 })
}

export function executeRuyiInstall(methodKey: PackageMethodKey): Promise<void> {
  return executeRuyiPackageCommand(methodKey, 'install')
}

export function executeRuyiUpdate(methodKey: PackageMethodKey): Promise<void> {
  return executeRuyiPackageCommand(methodKey, 'update')
}
