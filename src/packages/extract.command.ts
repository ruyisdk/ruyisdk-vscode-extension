// SPDX-License-Identifier: Apache-2.0
/**
 * Extract Command: Extract RuyiSDK Package from source
 *
 * Provides user-facing command for:
 * - Listing all available source packages
 * - Letting user select a package to extract
 * - Extracting the selected package to the current directory
 */

import * as path from 'path'
import * as vscode from 'vscode'

import { createProgressTracker, parseNDJSON } from '../common/helpers'
import ruyi from '../ruyi'
import type { RuyiListOutput } from '../ruyi/types'

/**
 * Parse the NDJSON output of `ruyi --porcelain list` to get source packages.
 * Each line is a separate JSON object.
 */

function parseSourcePackages(output: string): string[] {
  const packages = parseNDJSON<RuyiListOutput>(output)
    .filter(item => item.ty === 'pkglistoutput-v1' && item.category === 'source')
    .map(item => `${item.category}/${item.name}`)

  return [...new Set(packages)].sort()
}

async function getTargetDirectory(uri?: vscode.Uri): Promise<string> {
  if (uri) {
    const stat = await vscode.workspace.fs.stat(uri)
    if (stat.type === vscode.FileType.Directory) {
      return uri.fsPath
    }
    return path.dirname(uri.fsPath)
  }

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0]
  if (!workspaceFolder) {
    throw new Error('Please open a workspace folder first')
  }
  return workspaceFolder.uri.fsPath
}

async function fetchSourcePackages(): Promise<string[]> {
  const listResult = await ruyi.list({ nameContains: '' })

  if (listResult.code !== 0) {
    throw new Error(`Failed to fetch package list: ${listResult.stderr}`)
  }

  const sourcePackages = parseSourcePackages(listResult.stdout)

  if (sourcePackages.length === 0) {
    throw new Error('No available source packages found')
  }

  return sourcePackages
}

async function extractSelectedPackage(
  packageName: string,
  targetDir: string,
  progress: vscode.Progress<{ message?: string, increment?: number }>,
): Promise<void> {
  const [onProgress, getLastPercent] = createProgressTracker(progress)

  const extractResult = await ruyi
    .cwd(targetDir)
    .timeout(300_000) // Increase timeout for large downloads
    .onProgress(onProgress)
    .extract(packageName, {
      extractWithoutSubdir: true,
    })

  if (extractResult.code !== 0) {
    throw new Error(
      `Failed to extract: ${extractResult.stderr || extractResult.stdout}`,
    )
  }

  // Ensure progress reaches 100%
  const finalIncrement = Math.max(0, 100 - getLastPercent())
  if (finalIncrement > 0) {
    progress.report({ message: 'Extraction complete', increment: finalIncrement })
  }
}

/**
 * Extract RuyiSDK Package command handler
 * @param uri - The URI of the folder where the user right-clicked
 */
export async function extractPackage(uri?: vscode.Uri): Promise<void> {
  try {
    const targetDir = await getTargetDirectory(uri)

    const sourcePackages = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Fetching available source packages...',
        cancellable: false,
      },
      async () => fetchSourcePackages(),
    )

    const selectedPackage = await vscode.window.showQuickPick(sourcePackages, {
      placeHolder: 'Select a package to extract',
      title: 'Extract RuyiSDK Package',
    })

    if (!selectedPackage) {
      return
    }

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Extracting ${selectedPackage}...`,
        cancellable: false,
      },
      async progress => extractSelectedPackage(selectedPackage, targetDir, progress),
    )

    await vscode.window.showInformationMessage(
      `Successfully extracted ${selectedPackage} to ${targetDir}`,
    )

    await vscode.commands.executeCommand('ruyi.packages.refresh')
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    if (errorMessage.includes('No available source packages found')) {
      await vscode.window.showInformationMessage(errorMessage)
    }
    else {
      await vscode.window.showErrorMessage(
        `Error occurred during extraction: ${errorMessage}`,
      )
    }
  }
}

export default function registerExtractCommand(ctx: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    'ruyi.extract',
    extractPackage,
  )
  ctx.subscriptions.push(disposable)
}
