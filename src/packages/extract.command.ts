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
 * Parse the NDJSON output of `ruyi --porcelain list` to get source packages with versions.
 */
interface SourcePackage {
  label: string
  value: string
}

function parseSourcePackages(output: string): SourcePackage[] {
  const items = parseNDJSON<RuyiListOutput>(output)
    .filter(item => item.ty === 'pkglistoutput-v1' && item.category === 'source')

  const packages: SourcePackage[] = []

  for (const item of items) {
    for (const ver of item.vers) {
      if (ver.is_downloaded) {
        const label = `${item.name} (${ver.semver})`
        const value = `${item.category}/${item.name}@${ver.semver}`
        packages.push({ label, value })
      }
    }
  }

  return packages.sort((a, b) => a.label.localeCompare(b.label))
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

async function fetchSourcePackages(): Promise<SourcePackage[]> {
  const listResult = await ruyi.list({ nameContains: '' })

  if (listResult.code !== 0) {
    throw new Error(`Failed to fetch package list: ${listResult.stderr}`)
  }

  const sourcePackages = parseSourcePackages(listResult.stdout)

  if (sourcePackages.length === 0) {
    throw new Error('No downloaded source packages found. Please download some first.')
  }

  return sourcePackages
}

async function extractSelectedPackage(
  packageValue: string,
  destDir: string,
  progress: vscode.Progress<{ message?: string, increment?: number }>,
): Promise<void> {
  const [onProgress, getLastPercent] = createProgressTracker(progress)

  const extractResult = await ruyi
    .timeout(300_000)
    .onProgress(onProgress)
    .extract(packageValue, {
      extractWithoutSubdir: true,
      destDir,
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
    let targetDir = await getTargetDirectory(uri)

    const sourcePackages = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Fetching available source packages...',
        cancellable: false,
      },
      async () => fetchSourcePackages(),
    )

    const selectedLabel = await vscode.window.showQuickPick(
      sourcePackages.map(p => p.label),
      {
        placeHolder: 'Select a package version to extract',
        title: 'Extract RuyiSDK Package',
      },
    )

    if (!selectedLabel) {
      return
    }

    const selectedPackage = sourcePackages.find(p => p.label === selectedLabel)

    if (!selectedPackage) {
      throw new Error('Selected package not found')
    }

    // Add support for custom destination directory
    const folder = await vscode.window.showOpenDialog({
      canSelectFolders: true,
      canSelectFiles: false,
      canSelectMany: false,
      defaultUri: vscode.Uri.file(targetDir),
      openLabel: 'Select Destination Folder',
      title: 'Choose where to extract the package',
    })

    if (folder && folder[0]) {
      targetDir = folder[0].fsPath
    }

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Extracting ${selectedLabel}...`,
        cancellable: false,
      },
      async progress => extractSelectedPackage(selectedPackage.value, targetDir, progress),
    )

    await vscode.window.showInformationMessage(
      `Successfully extracted ${selectedLabel} to ${targetDir}`,
    )

    await vscode.commands.executeCommand('ruyi.packages.refresh')
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    if (errorMessage.includes('No downloaded source packages found')) {
      await vscode.window.showInformationMessage(errorMessage)
    }
    else {
      await vscode.window.showErrorMessage(
        `Error occurred during extraction: ${errorMessage}`,
      )
    }
  }
}

export function registerExtractCommand(ctx: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    'ruyi.extract',
    extractPackage,
  )
  ctx.subscriptions.push(disposable)
}
