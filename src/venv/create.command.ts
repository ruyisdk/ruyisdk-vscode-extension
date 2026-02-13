// SPDX-License-Identifier: Apache-2.0
import * as path from 'path'
import * as vscode from 'vscode'

import { getWorkspaceFolderPath } from '../common/helpers'
import { installPackage } from '../packages/install.command'

import type { VenvService } from './venv.service'

type ToolchainPick = vscode.QuickPickItem & {
  rawName: string
  version: string
  latest: boolean
  installed: boolean
}

type EmulatorPick = vscode.QuickPickItem & {
  rawName: string
  version: string
  latest: boolean
  installed: boolean
  noBinary: boolean
}

type InstallableDependency = {
  rawName: string
  version: string
  latest: boolean
  installed: boolean
}

function buildPackageSpec(pkg: Pick<InstallableDependency, 'rawName' | 'version' | 'latest'>): string {
  if (pkg.latest || !pkg.version) {
    return pkg.rawName
  }
  return `${pkg.rawName}(==${pkg.version})`
}

async function ensureDependencyInstalled(
  dependencyType: 'toolchain' | 'emulator',
  item: InstallableDependency,
): Promise<boolean> {
  if (item.installed) {
    return true
  }

  const selection = await vscode.window.showWarningMessage(
    `The selected ${dependencyType} "${item.rawName}" is not installed.\nWould you like to install it now?`,
    'Install',
    'Cancel',
  )
  if (selection !== 'Install') {
    return false
  }

  const success = await installPackage(item.rawName, item.latest ? undefined : item.version, true)
  if (!success) {
    vscode.window.showErrorMessage(`Failed to install ${dependencyType} "${item.rawName}". Venv creation cancelled.`)
    return false
  }

  return true
}

/**
 * Executes the create venv command.
 */
export async function createVenvCommand(service: VenvService): Promise<void> {
  // 1. Check workspace
  if (!vscode.workspace.workspaceFolders?.length) {
    const action = await vscode.window.showWarningMessage(
      'Venv creation requires an open workspace folder. Please open a folder first.',
      'Open Folder',
    )
    if (action === 'Open Folder') {
      await vscode.commands.executeCommand('vscode.openFolder')
    }
    return
  }

  // 2. Select Profile
  const allProfiles = await service.getProfiles()
  const profileItems = Object.entries(allProfiles).map(([label, raw]) => ({
    label,
    description: raw !== label ? raw : undefined,
  }))

  const pickedProfile = await vscode.window.showQuickPick(profileItems, {
    placeHolder: 'Select a profile for the new venv',
    matchOnDescription: true,
  })
  if (!pickedProfile) {
    return
  }
  const profile = pickedProfile.label

  // 3. Select Toolchains
  const toolchains = await service.getToolchains()
  const toolchainItems: ToolchainPick[] = toolchains.map(toolchain => ({
    label: toolchain.name,
    description: toolchain.version ? `v${toolchain.version}` : undefined,
    detail: [
      toolchain.latest ? 'Latest' : 'Legacy',
      toolchain.installed ? 'Installed' : undefined,
      toolchain.slug ? `Slug: ${toolchain.slug}` : undefined,
    ].filter(Boolean).join(' • '),
    rawName: toolchain.name,
    version: toolchain.version,
    latest: toolchain.latest,
    installed: toolchain.installed,
  }))

  const pickedToolchains = await vscode.window.showQuickPick(toolchainItems, {
    placeHolder: 'Select one or more toolchains for the new venv',
    canPickMany: true,
    matchOnDescription: true,
    matchOnDetail: true,
  })

  if (!pickedToolchains || pickedToolchains.length === 0) {
    return
  }

  // 3.1 Check and install missing toolchains
  for (const tc of pickedToolchains) {
    const ready = await ensureDependencyInstalled('toolchain', tc)
    if (!ready) {
      return
    }
  }

  const toolchainSpecs = pickedToolchains.map(toolchain => buildPackageSpec(toolchain))

  // 4. Select Emulator (Optional)
  let emulatorSpec: string | undefined
  const includeEmulator = await vscode.window.showQuickPick(
    [{ label: 'Yes' }, { label: 'No' }],
    { placeHolder: 'Include an emulator in the new venv?' },
  )

  if (includeEmulator?.label === 'Yes') {
    const emulatorsResult = await service.getEmulators()
    if ('errorMsg' in emulatorsResult) {
      vscode.window.showErrorMessage(emulatorsResult.errorMsg)
      return
    }

    const emulatorItems: EmulatorPick[] = emulatorsResult.map((em) => {
      const isLatest = em.remarks.includes('latest')
      const isInstalled = em.remarks.includes('installed')
      const isNoBinary = em.remarks.includes('no-binary-for-current-host')

      const icons = [
        isLatest ? '$(star-full)' : '',
        isInstalled ? '$(check)' : '',
        isNoBinary ? '$(x)' : '',
      ].filter(Boolean).join(' ')

      return {
        label: [icons, em.name].filter(Boolean).join(' '),
        description: em.semver ? `v${em.semver}` : undefined,
        detail: [
          isLatest ? 'Latest' : 'Legacy',
          isInstalled ? 'Installed' : undefined,
          isNoBinary ? 'No binary for current host' : undefined,
        ].filter(Boolean).join('   '),
        rawName: em.name,
        version: em.semver,
        latest: isLatest,
        installed: isInstalled,
        noBinary: isNoBinary,
      }
    })

    const pickedEmulator = await vscode.window.showQuickPick(emulatorItems, {
      placeHolder: 'Select an emulator (Star=Latest, Check=Installed, Cross=No Binary)',
      matchOnDescription: true,
      matchOnDetail: true,
    })

    if (!pickedEmulator) {
      return
    }

    if (pickedEmulator.noBinary) {
      vscode.window.showWarningMessage(`The selected emulator "${pickedEmulator.rawName}" has no binary for the current host.`)
      return
    }

    // 4.1 Install missing emulator
    const emulatorReady = await ensureDependencyInstalled('emulator', pickedEmulator)
    if (!emulatorReady) {
      return
    }

    emulatorSpec = buildPackageSpec(pickedEmulator)
  }

  // 5. Input Path
  // Default path format: ./ruyi-venv-{profile}
  const suggestedPath = `./ruyi-venv-${profile.replace(/\s+/g, '-')}`
  const pathInput = await vscode.window.showInputBox({
    placeHolder: 'Path to create the new venv',
    value: suggestedPath,
    validateInput: (value) => {
      if (!value || value.trim().length === 0) {
        return 'Path cannot be empty'
      }
      return undefined
    },
  })

  if (!pathInput) {
    return
  }
  const venvPath = pathInput.trim()

  // 6. Sysroot (Optional)
  const sysrootFrom = await vscode.window.showInputBox({
    placeHolder: '(Optional) Sysroot package specifier. Press ESC to skip.',
  })

  // 7. Extra Commands (Optional)
  const extraCommands: string[] = []
  let addingCommands = true
  while (addingCommands) {
    const cmd = await vscode.window.showInputBox({
      placeHolder: '(Optional) Specifier of extra package to add commands. Press ESC to finish.',
    })
    if (cmd) {
      extraCommands.push(cmd)
    }
    else {
      addingCommands = false
    }
  }

  // 8. Create Venv
  let created = false
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Creating venv',
      cancellable: false,
    },
    async (progress) => {
      progress.report({ message: 'Initializing...' })
      try {
        await service.createVenv({
          profile,
          path: venvPath,
          toolchains: toolchainSpecs,
          emulator: emulatorSpec,
          withSysroot: sysrootFrom ? true : false,
          sysrootFrom: sysrootFrom || undefined,
          extraCommandsFrom: extraCommands.length > 0 ? extraCommands : undefined,
        }, progress)

        vscode.window.showInformationMessage('Venv created successfully.')
        created = true
      }
      catch (error) {
        if (error instanceof Error) {
          vscode.window.showErrorMessage(`Failed to create venv: ${error.message}`)
        }
        else {
          vscode.window.showErrorMessage(`Failed to create venv: ${error}`)
        }
      }
    },
  )

  if (!created) return

  // 9. Post-creation checks
  let workspaceRoot: string | undefined
  try {
    workspaceRoot = getWorkspaceFolderPath()
  }
  catch {
    // Ignore if no workspace
  }

  if (workspaceRoot) {
    const fullVenvPath = path.resolve(workspaceRoot, venvPath)

    let autoDetected = false
    if (fullVenvPath.startsWith(workspaceRoot)) {
      const relativePath = path.relative(workspaceRoot, fullVenvPath)
      const depth = relativePath.split(path.sep).length - 1
      if (depth <= 2) {
        autoDetected = true
        // Trigger refresh
        await vscode.commands.executeCommand('ruyi.venv.refresh')
      }
    }

    if (!autoDetected) {
      vscode.window.showWarningMessage(
        'The newly created venv is outside the workspace or too deep (>2 levels). It will not be detected automatically.',
      )
    }
  }
}

/**
 * Registers the create venv command.
 * @param ctx - The extension context
 * @param service - The venv service instance
 */
export default function registerCreateCommand(ctx: vscode.ExtensionContext, service: VenvService): void {
  ctx.subscriptions.push(
    vscode.commands.registerCommand('ruyi.venv.create', () => createVenvCommand(service)),
  )
}
