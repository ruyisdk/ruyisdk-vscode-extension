// SPDX-License-Identifier: Apache-2.0
/**
 * CreateVenv module
 *
 * Provides helpers used by the commands layer:
 * - createVenv(profile, toolchain, emulator, name, path): create a Ruyi venv
 */

import * as cp from 'child_process'
import * as util from 'util'

import { LONG_CMD_TIMEOUT_MS } from '../../common/constants'
import { formatExecError, getWorkspaceFolderPath } from '../../common/utils'

const execAsync = util.promisify(cp.exec)

export async function createVenv(profile: string, toolchains: string[], emulator: string | null,
  name: string, path: string, sysrootFrom: string | undefined, extraCommandsFrom: string[]):
Promise<string> {
  const toolchainArgs = toolchains.map(tc => `-t ${tc}`).join(' ')
  const extraCommandArgs = extraCommandsFrom.map(ex => `--extra-commands-from ${ex}`).join(' ')
  const command = `ruyi venv -n "${name}" ${toolchainArgs} \
            ${emulator ? `-e ${emulator}` : ''} ${profile} ${path}\
            ${sysrootFrom ? `--sysroot-from ${sysrootFrom}` : ''} \
            ${extraCommandArgs}`
  try {
    const workspace = getWorkspaceFolderPath()

    const outputs = await execAsync(command, { timeout: LONG_CMD_TIMEOUT_MS, cwd: workspace })

    return `Succeeded: ${outputs.stderr}. \n\
        The executed command is: ${command}. Current workspace path is: ${process.cwd()}.\n\
        Now you can activate the new venv with our extension or via the terminal.`
  }
  catch (e: unknown) {
    // return error message
    return `Exception: ${formatExecError(e).slice(0, 750)}. \
        The exceptional command is: ${command}. \
        Current workspace path is: ${process.cwd()}`
  }
}
