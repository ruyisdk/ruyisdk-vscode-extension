// SPDX-License-Identifier: Apache-2.0
/**
 * CreateCommand
 *
 * VS Code command: `ruyi.venv.create`
 *
 * Responsibilities:
 * - Create a new Ruyi virtual environment via features/createVenv service.
 * - Visual helper to pick profile/toolchain/emulator and input name/path.
 */

import paths from 'path'
import * as vscode from 'vscode'

import { createVenv } from '../features/venv/CreateVenv'
import { getEmulators } from '../features/venv/GetEmulators'
import { getProfiles } from '../features/venv/GetProfiles'
import { getToolchains } from '../features/venv/GetToolchains'

export default function registerCreateNewVenvCommand(
  context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('ruyi.venv.create', async () => {
    // Visual helper to pick profile/toolchain/emulator and input name/path

    // Show quick pick for profile
    const allProfiles = await getProfiles()
    const profile = await vscode.window.showQuickPick(
      Object.keys(allProfiles), {
        placeHolder: 'Select a profile for the new venv',
      })
    if (!profile) return

    // Show quick pick for toolchain
    const allToolchains = await getToolchains()
    // Input number of toolchains
    const toolchainCount = await vscode.window.showQuickPick(
      [{ label: '1' }, { label: '2' }, { label: '3' }, { label: '4' }], {
        placeHolder: 'Please input the number of toolchains to include in the new venv ( 1 ~ 4 ).',
      })
    if (!toolchainCount) return

    // Select toolchain(s) from the list for the number specified times
    const toolchains: string[] = []
    for (let i = 0; i < Number(toolchainCount.label); i++) {
      // Using a expanded QuickPickItem to store raw name to pass to backend
      const toolchainItems: (vscode.QuickPickItem & { rawName: string })[] = allToolchains.map((tc) => {
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
        placeHolder: `Select a toolchain for the new venv 
        (Star = Latest, Check = Installed)`,
        matchOnDescription: true,
        matchOnDetail: true,
      })
      if (!toolchainPick) return
      // store the raw name if using the latest version;
      // storing `"$(pick.rawName)(==$(pick.version))"` if using a legacy version
      let topush = ''
      if (toolchainPick.detail && toolchainPick.detail.includes('Latest')) {
        topush = toolchainPick.rawName
      }
      else if (toolchainPick.detail && toolchainPick.description && toolchainPick.detail.includes('Legacy') && toolchainPick.detail.includes('v')) {
        const versionMatch = toolchainPick.description.match(/v([\d.]+)/)
        const version = versionMatch ? versionMatch[1] : ''
        topush = `"${toolchainPick.rawName}(==${version})"`
      }
      toolchains.push(topush)
      // Remove the selected toolchain from the list to avoid duplicate selection
      const index = toolchainItems.findIndex(item => item.rawName === toolchainPick.rawName)
      if (index > -1) {
        toolchainItems.splice(index, 1)
      }
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
      emulator = emulatorPick.rawName
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
      placeHolder: '(Optional) Specifier (atom) of the sysroot package to use, in favor of the toolchain-included one if applicable.',
      validateInput: (value) => {
      // To avoid empty string input, which will cause issues in backend
        if (value === '') {
          return 'Sysroot specifier cannot be empty. To skip, press ESC.'
        }
        return undefined
      },
    })

    // Ask for for number of extra commands
    const extraCommandsCount = await vscode.window.showInputBox({
      placeHolder: 'Number of extra package(s) to add commands to the new virtual environment',
      validateInput: (value) => {
        // To avoid empty string input, which will cause issues in backend
        if (value === '') {
          return 'Number of extra package(s) cannot be empty. To skip, input "0".'
        }
        const num = Number(value)
        if (!Number.isInteger(num) || num < 0) {
          return 'Please enter a non-negative integer.'
        }
        return null
      },
    })
    const extraCommands: string[] = []
    if (extraCommandsCount)
      for (let i = 0; i < Number(extraCommandsCount); i++) {
        const anExtraCommand = await vscode.window.showInputBox({
          placeHolder: 'Specifier(s) (atoms) of extra package(s) to add commands to the new virtual environment.',
        })
        if (!anExtraCommand) return
        extraCommands.push(anExtraCommand)
      }
    // Finally: Create new venv
    vscode.window.showInformationMessage('Creating new venv... This may take several minutes. Please wait.')
    const result = await createVenv(profile, toolchains, emulator, name, path, sysrootFrom, extraCommands)

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
            // Within 2 levels, trigger switch command.
            await vscode.commands.executeCommand('ruyi.venv.switch')
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
