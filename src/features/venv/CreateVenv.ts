// SPDX-License-Identifier: Apache-2.0
/**
 * RuyiSDK VS Code Extension - Venv Module - Venv Creating Utility
 *
 * Provides helpers used by the commands layer:
 * - createVenv(profile, toolchain, emulator, name, path): create a Ruyi venv
 */

import ruyi from '../../common/ruyi'

export async function createVenv(profile: string, toolchains: string[], emulator: string | null,
  name: string, path: string, sysrootFrom: string | undefined, extraCommandsFrom: string[]): Promise<string> {
  const result = await ruyi.venvCreate(name, toolchains, emulator, sysrootFrom, extraCommandsFrom, profile, path)
  if (result.code == 0) {
    return `Succeeded: ${result.stderr}. \n\
      Now you can activate the new venv with our extension or via the terminal.`
  }
  else {
    return `Exception: ${result.stderr.slice(0, 750)}. `
  }
}
