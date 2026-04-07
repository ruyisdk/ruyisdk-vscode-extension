// SPDX-License-Identifier: Apache-2.0
import * as cp from 'child_process'
import * as util from 'util'

const execAsync = util.promisify(cp.exec)

export const PACKAGE_METHODS = {
  pip: {
    installCmd: 'python3 -m pip install --user -U ruyi',
    updateCmd: 'python3 -m pip install --user -U ruyi',
  },
  pipx: {
    installCmd: 'python3 -m pipx install ruyi',
    updateCmd: 'python3 -m pipx upgrade ruyi',
  },
} as const

export type PackageMethodKey = keyof typeof PACKAGE_METHODS
export type PackageMethod = (typeof PACKAGE_METHODS)[PackageMethodKey]

function getMethodOrThrow(methodKey: PackageMethodKey): PackageMethod {
  const method = PACKAGE_METHODS[methodKey]
  if (!method) {
    throw new Error(`Unknown package method: ${methodKey}`)
  }
  return method
}

export async function executeRuyiInstall(
  methodKey: PackageMethodKey,
  options?: { timeout?: number },
): Promise<void> {
  const method = getMethodOrThrow(methodKey)
  const timeout = options?.timeout ?? 60000

  await execAsync(method.installCmd, { timeout })
}

export async function executeRuyiUpdate(
  methodKey: PackageMethodKey,
  options?: { timeout?: number },
): Promise<void> {
  const method = getMethodOrThrow(methodKey)
  const timeout = options?.timeout ?? 60000

  await execAsync(method.updateCmd, { timeout })
}
