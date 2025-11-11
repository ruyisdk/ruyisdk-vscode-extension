// SPDX-License-Identifier: Apache-2.0
/**
 * Config Remote Repository Command
 *
 * VS Code command ID: `ruyi.config.remote`
 *
 * Responsibilities:
 * - Get current remote repository and branch configuration
 * - Allow user to configure remote repository URL and branch
 * - Update Ruyi configuration with user input
 */

import * as vscode from 'vscode'

import ruyi from '../common/ruyi'

export default function registerConfigRemoteCommand(
  context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('ruyi.config.remote', async () => {
    try {
      // Get current remote and branch configuration
      let currentRemote = ''
      let currentBranch = ''

      try {
        const remoteResult = await ruyi.configGet('repo.remote')
        if (remoteResult.code === 0) {
          currentRemote = remoteResult.stdout.trim()
        }
      }
      catch (error) {
        console.warn('Failed to get current remote:', error)
      }

      try {
        const branchResult = await ruyi.configGet('repo.branch')
        if (branchResult.code === 0) {
          currentBranch = branchResult.stdout.trim()
        }
      }
      catch (error) {
        console.warn('Failed to get current branch:', error)
      }

      // Prompt user to input remote URL
      const remote = await vscode.window.showInputBox({
        prompt: 'Enter the remote repository URL',
        placeHolder: 'Enter the remote repository URL.e.g., https://github.com/ruyisdk/packages-index.git',
        value: currentRemote,
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Remote URL cannot be empty'
          }
          return null
        },
      })

      if (remote === undefined) {
        // User cancelled
        return
      }

      // Prompt user to input branch
      const branch = await vscode.window.showInputBox({
        prompt: 'Enter the branch name',
        placeHolder: 'Enter the branch name. e.g., main',
        value: currentBranch,
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Branch name cannot be empty'
          }
          return null
        },
      })

      if (branch === undefined) {
        // User cancelled
        return
      }

      // Show progress while updating configuration
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Configuring remote repository...',
        cancellable: false,
      }, async (progress) => {
        // Get previous remote URL for potential rollback
        progress.report({ message: 'Fetching previous remote URL...' })
        const prevRemoteResult = await ruyi.configGet('repo.remote')
        const prevRemote = prevRemoteResult.code === 0 ? prevRemoteResult.stdout.trim() : null
        // Set remote URL
        progress.report({ message: 'Setting remote URL...' })
        const remoteResult = await ruyi.configSet('repo.remote', remote.trim())
        if (remoteResult.code !== 0) {
          throw new Error(`Failed to set remote URL: ${remoteResult.stderr}`)
        }
        // Set branch configuration
        progress.report({ message: 'Configuring branch...' })
        const branchResult = await ruyi.configSet('repo.branch', branch.trim())
        if (branchResult.code !== 0) {
          // Attempt rollback of remote URL
          let rollbackMsg = ''
          if (prevRemote !== null) {
            const rollbackResult = await ruyi.configSet('repo.remote', prevRemote)
            if (rollbackResult.code !== 0) {
              rollbackMsg = `\nRollback of remote URL failed: ${rollbackResult.stderr}`
            }
            else {
              rollbackMsg = '\nRemote URL rolled back to previous value.'
            }
          }
          else {
            rollbackMsg = '\nPrevious remote URL not found, unable to rollback.'
          }
          throw new Error(`Failed to set branch configuration: ${branchResult.stderr}${rollbackMsg}`)
        }
      })

      vscode.window.showInformationMessage(
        `Remote repository configured successfully:\n`
        + `Remote: ${remote.trim()}\n`
        + `Branch: ${branch.trim()}`)
    }
    catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      vscode.window.showErrorMessage(`Failed to configure remote repository: ${errorMessage}`)
    }
  })

  context.subscriptions.push(disposable)
}
