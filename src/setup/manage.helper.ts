// SPDX-License-Identifier: Apache-2.0
import { exec } from 'child_process'
import * as path from 'path'
import { promisify } from 'util'
import * as vscode from 'vscode'

import { logger } from '../common/logger'

const execAsync = promisify(exec)

async function isExecutable(filePath: string): Promise<boolean> {
  try {
    const stat = await vscode.workspace.fs.stat(vscode.Uri.file(filePath))
    return stat.type === vscode.FileType.File
  }
  catch {
    return false
  }
}

export async function findRuyiExecutables(): Promise<string[]> {
  const candidates: string[] = []
  const seen = new Set<string>()

  const addCandidate = async (dir: string) => {
    const candidate = path.join(dir, 'ruyi')
    if (seen.has(candidate)) {
      return
    }

    if (await isExecutable(candidate)) {
      candidates.push(candidate)
      seen.add(candidate)
    }
  }

  const homeDir = process.env.HOME
  if (homeDir) {
    await addCandidate(path.join(homeDir, '.local', 'bin'))
  }

  const pathEnv = process.env.PATH
  if (pathEnv) {
    const pathDirs = pathEnv.split(path.delimiter).filter(Boolean)
    for (const dir of pathDirs) {
      await addCandidate(dir)
    }
  }
  else {
    logger.warn('PATH environment variable is not set')
  }

  return candidates
}

export async function getRuyiVersion(ruyiPath: string): Promise<string | undefined> {
  try {
    const result = await execAsync(`"${ruyiPath}" --version`)
    const versionLine = result.stdout.split(/\r?\n/, 1)[0]?.trim()
    return versionLine || undefined
  }
  catch (error) {
    logger.warn(`Failed to get version for ${ruyiPath}`, error)
    return undefined
  }
}
