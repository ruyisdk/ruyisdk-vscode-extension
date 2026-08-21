// SPDX-License-Identifier: Apache-2.0
import * as vscode from 'vscode'

import { VersionItem } from './package-tree.provider'

export default function registerCopyPackageIdCommand(ctx: vscode.ExtensionContext) {
  const uninstallDisposable = vscode.commands.registerCommand(
    'ruyi.packages.copyPackageId',
    async (item: VersionItem) => {
      if (!(item instanceof VersionItem)) {
        vscode.window.showErrorMessage(vscode.l10n.t('Invalid package selection.'))
        return
      }

      const pkgId = item.getPackageId()

      await vscode.env.clipboard.writeText(pkgId)
      vscode.window.showInformationMessage(vscode.l10n.t('Package ID "{0}" copied to clipboard!', pkgId))
    },
  )

  ctx.subscriptions.push(uninstallDisposable)
}
