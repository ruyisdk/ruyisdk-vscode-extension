// SPDX-License-Identifier: Apache-2.0
/**
 * Venv Create Command
 *
 * VS Code command ID: `ruyi.venv.create`
 *
 * Responsibilities:
 * - Create a new Ruyi virtual environment via features/createVenv service.
 * - Visual helper to pick profile, toolchain, emulator and input name and path.
 */

import paths from 'path'
import * as vscode from 'vscode'

import { createProgressTracker, getWorkspaceFolderPath } from '../../common/helpers'
import { getEmulators } from '../../features/venv/GetEmulators'
import { getProfiles } from '../../features/venv/GetProfiles'
import { getToolchains } from '../../features/venv/GetToolchains'
import { installPackage } from '../../packages/install.command'
import ruyi from '../../ruyi'

export default function registerCreateNewVenvCommand(
  context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('ruyi.venv.create', async () => {
    // Visual helper to pick profile/toolchain/emulator and input name/path

    let terminated: boolean = false
    // Show quick pick for profile
    const allProfiles = await getProfiles()
    const profile = await vscode.window.showQuickPick(
      Object.keys(allProfiles), {
        placeHolder: 'Select a profile for the new venv',
      })
    if (!profile) return

    // Show quick pick for toolchain
    const allToolchains = await getToolchains()
    // Maintain a list of remaining toolchains
    const remainingToolchains = allToolchains.slice()

    let toolchainFinished: boolean = false
    // Select toolchain(s) from the list for the number specified times
    const toolchains: string[] = []
    while (!toolchainFinished) {
      // Using a expanded QuickPickItem to store raw name to pass to backend
      const toolchainItems: (vscode.QuickPickItem & { rawName: string })[] = remainingToolchains.map((tc) => {
        if (!tc) return { label: '', description: '', detail: '', rawName: '' }

        // Using codicon to show status: latest = star, installed = check
        // That is why the label is corrupted and we need to use raw name to pass to backend
        const icons = [
          tc.latest ? '$(star-full)' : '',
          tc.installed ? '$(check)' : '',
        ].filter(Boolean).join(' ')

        const label = [icons, tc.name].filter(Boolean).join(' ')

        // detailed info
        const description = [
          tc.version ? `v${tc.version}` : undefined,
        ].filter(Boolean).join(' • ')
        const detail = [
          tc.latest ? 'Latest' : 'Legacy',
          tc.installed ? 'Installed' : undefined,
          tc.slug ? `Slug: ${tc.slug}` : '',
        ].filter(Boolean).join('   ')

        return { label, description, detail, rawName: tc.name }
      })

      const toolchainPick = await vscode.window.showQuickPick(toolchainItems, {
        placeHolder: toolchains.length > 0
          ? `(Optional) Select one more toolchain (Star = Latest, Check = Installed). Press ESC to skip this step.`
          : `Select a toolchain (Star = Latest, Check = Installed).`,
        matchOnDescription: true,
        matchOnDetail: true,
      })
      if (!toolchainPick) {
        toolchainFinished = true
        break
      }
      // store the raw name if using the latest version;
      // storing `"$(pick.rawName)(==$(pick.version))"` if using a legacy version
      let topush = ''
      if (!toolchainPick.detail || !toolchainPick.description) return
      const versionMatch = toolchainPick.description.match(/v([\w.-]+)/)
      const version = versionMatch ? versionMatch[1] : ''
      if (toolchainPick.detail && toolchainPick.detail.includes('Latest')) {
        topush = toolchainPick.rawName
      }
      else if (toolchainPick.detail && toolchainPick.description && toolchainPick.detail.includes('Legacy') && toolchainPick.description.includes('v')) {
        topush = `${toolchainPick.rawName}(==${version})`
      }
      toolchains.push(topush)
      // Remove the selected toolchain from the list to avoid duplicate selection
      const index = remainingToolchains.findIndex(item => item.name
        + (item.latest ? '' : `(==${item.version})`) === topush.replace(/"/g, ''))
      if (index > -1) {
        remainingToolchains.splice(index, 1)
      }

      // Selecting a non-installed toolchain, aborting the creating and show inquiry to install now.
      if (!(toolchainPick.detail as string).includes('Installed')) {
        terminated = true
        const selection = await vscode.window.showWarningMessage(
          `The selected toolchain "${topush}" is not installed.`
          + `\nPlease install the toolchain first before creating the venv. Start installation now?`,
          'Yes', 'No')
        if (selection === 'Yes') {
          await installPackage(toolchainPick.rawName, version || undefined)
        }
      }
      if (terminated) return
    }
    if (toolchains.length === 0) return

    // Ask for whether to include emulator
    let emulator: string | null
    const includeEmulator = await vscode.window.showQuickPick(
      [{ label: 'Yes' }, { label: 'No' }], {
        placeHolder: 'Include an emulator in the new venv?',
      })
    if (includeEmulator === undefined) return
    if (includeEmulator.label == 'Yes') {
      const allEmulators = await getEmulators()
      if (typeof allEmulators === 'object' && 'errorMsg' in allEmulators) {
        return
      }
      // Show quick pick for emulator:
      // Star for latest, Check for installed, Cross for "no-binary-for-current-host"
      const emulatorItems: (vscode.QuickPickItem & { rawName: string })[] = allEmulators.map((em) => {
        if (!em) return { label: '', description: '', detail: '', rawName: '' }
        const icons = [
          em.remarks.includes('latest') ? '$(star-full)' : '',
          em.remarks.includes('installed') ? '$(check)' : '',
          em.remarks.includes('no-binary-for-current-host') ? '$(x)' : '',
        ].filter(Boolean).join(' ')

        const label = [icons, em.name].filter(Boolean).join(' ')

        // detailed info
        const description = [
          em.semver ? `v${em.semver}` : undefined,
        ].filter(Boolean).join(' • ')
        const detail = [
          em.remarks.includes('latest') ? 'Latest' : 'Legacy',
          em.remarks.includes('installed') ? 'Installed' : undefined,
          em.remarks.includes('no-binary-for-current-host') ? 'No binary for current host' : undefined,
        ].filter(Boolean).join('   ')

        return { label, description, detail, rawName: em.name }
      })
      if (!emulatorItems) return

      const emulatorPick = await vscode.window.showQuickPick(emulatorItems, {
        placeHolder: `Select an emulator for the new venv
        (Star = Latest, Check = Installed, Cross = No binary for current host)`,
        matchOnDescription: true,
        matchOnDetail: true,
      })
      if (!emulatorPick) return
      else if (!emulatorPick.detail || !emulatorPick.description) return
      // Selecting a no-binary-for-current-host emulator, aborting the creating and show error message.
      else {
        if (emulatorPick.detail.includes('No binary for current host')) {
          vscode.window.showWarningMessage(
            `The selected emulator "${emulatorPick.rawName}" has no binary for the current host. `)
          return
        }
        const versionMatch = emulatorPick.description.match(/v([\w.-]+)/)
        const version = versionMatch ? versionMatch[1] : ''
        if (emulatorPick.detail.includes('Latest')) {
          emulator = emulatorPick.rawName
        }
        else {
          if (!(emulatorPick.description && emulatorPick.detail.includes('Legacy') && emulatorPick.description.includes('v'))) return
          emulator = `${emulatorPick.rawName}(==${version})`
        }

        // Selecting a non-installed emulator, aborting the creating and show show inquiry to install now.
        if (!emulatorPick.detail.includes('Installed')) {
          terminated = true
          const selection = await vscode.window.showWarningMessage(
            `The selected emulator "${emulator}" is not installed.`
            + `\nPlease install the emulator first before creating the venv. Start installation now?`,
            'Yes', 'No')
          if (selection === 'Yes') {
            await installPackage(emulatorPick.rawName, version || undefined)
          }
        }
        if (terminated) return
      }
    }
    else emulator = null

    // Input name, default to profile name
    const name = await vscode.window.showInputBox({
      placeHolder: 'Name of the new venv',
      value: profile, // Default value set to profile name
    })
    if (name === undefined) return

    // Input path, default to ./myhone-venv/
    const path = await vscode.window.showInputBox({
      placeHolder: 'Path to create the new venv',
      value: `./myhone-venv`,
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Path cannot be empty'
        }
        return null
      },
    })
    if (!path) return

    // Ask for a "sysroot from"
    const sysrootFrom = await vscode.window.showInputBox({
      placeHolder: '(Optional) Sysroot package specifier. Press ESC to skip this step.',
      validateInput: (value) => {
      // To avoid empty string input, which will cause issues in backend
        if (value === '') {
          return 'Sysroot specifier cannot be empty. Press ESC to skip this step.'
        }
        return undefined
      },
    })

    // Ask for extra commands packages specifier to add
    const extraCommands: string[] = []

    let extraCommandsCeased = false
    while (!extraCommandsCeased) {
      const anExtraCommand = await vscode.window.showInputBox({
        placeHolder: '(Optional) Specifier(s) (atoms) of extra package(s) to add commands. Press ESC to skip this step.',
        validateInput: (value) => {
        // To avoid empty string input, which will cause issues in backend
          if (value === '') {
            return 'Extra commands specifier cannot be empty. Press ESC to skip this step.'
          }
          return undefined
        },
      })
      if (!anExtraCommand) extraCommandsCeased = true
      else extraCommands.push(anExtraCommand)
    }
    // Finally: Create new venv
    let result = ''
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Creating venv "${name}"`,
        cancellable: false,
      },
      async (progress) => {
        progress.report({ message: 'Initializing...', increment: 0 })

        const [onProgress, getLastPercent] = createProgressTracker(progress)

        const ruyiResult = await ruyi
          .timeout(5 * 60 * 1000)
          .cwd(getWorkspaceFolderPath())
          .onProgress(onProgress)
          .venv(profile, path, {
            name,
            toolchain: toolchains,
            emulator: emulator ?? undefined,
            sysrootFrom,
            extraCommandsFrom: extraCommands,
          })

        const finalIncrement = Math.max(0, 100 - getLastPercent())
        if (finalIncrement > 0) {
          progress.report({ message: 'Venv creation complete', increment: finalIncrement })
        }
        else {
          progress.report({ message: 'Venv creation complete' })
        }

        if (ruyiResult.code == 0) {
          result = `Succeeded: Now you can activate the new venv with our extension or via the terminal.`
        }
        else {
          result = `Exception: ${ruyiResult.stderr.slice(0, 750)}. `
        }
      },
    )

    if (result.includes('Succeeded')) {
      vscode.window.showInformationMessage(result)
      // If succeeded, detect venvs to refresh the list
      // However, if the path is outside the workspace or deeper than 2 level,
      // skip this step and show warning message that this venv will never be detected.
      const workspaceFolders = vscode.workspace.workspaceFolders
      if (workspaceFolders && workspaceFolders.length > 0) {
        const workspacePath = workspaceFolders[0].uri.fsPath

        let goodPath = false
        const fullVenvPath = paths.resolve(
          vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd(),
          path,
        )
        if (fullVenvPath.startsWith(workspacePath)) {
          const relativePath = paths.relative(workspacePath, fullVenvPath)
          const depth = relativePath.split(paths.sep).length - 1
          if (depth <= 2) {
            // Within 2 levels, trigger refresh command.
            await vscode.commands.executeCommand('ruyi.venv.refresh')
            goodPath = true
            return
          }
        }
        if (!goodPath) {
          vscode.window.showWarningMessage(
            'The newly created venv is outside the current workspace or deeper than 2 levels. '
            + 'It will not be detected automatically. '
            + 'Please create venvs within the workspace and no deeper than 2 levels to enable automatic detection.')
        }
      }
      // If no workspace is opened, skip detection and show warning.
      if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showWarningMessage(
          'No workspace is opened. The newly created venv will not be detected automatically.')
        return
      }
    }
    else if (result.includes('Exception')) {
      vscode.window.showErrorMessage(result)
    }
    else {
      vscode.window.showWarningMessage('Unknown status:' + result)
    }
  })
  context.subscriptions.push(disposable)
}
