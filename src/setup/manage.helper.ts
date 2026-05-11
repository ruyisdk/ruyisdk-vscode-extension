import path from 'path'
import * as vscode from 'vscode'

/**
 * Options for the pickFile function.
 */
export type PickFileOptions = {
  initPath?: string
  absolute?: boolean
}

/**
 * Prompt the user to pick a file or folder from the filesystem using QuickPick.
 *
 * Different from vscode.window.showOpenDialog, this function uses QuickPick to allow the user to copy the path,
 * making it easier to select hidden files or from '/'.
 *
 * @returns The selected file or folder path, or undefined if the user cancels the selection.
 */
export function pickFile(options?: PickFileOptions): Promise<string | undefined> {
  return new Promise((resolve) => {
    const quickPick = vscode.window.createQuickPick()
    let usingFilter = false

    options = options || { absolute: false }
    if (options.absolute) {
      quickPick.value = '/'
    }
    else {
      quickPick.value = './'
    }
    if (options.initPath) {
      quickPick.value = options.initPath
    }

    quickPick.onDidChangeValue(async (value) => {
      let dir: string
      let filter: string | undefined
      const fileType = await getFileType(value)
      if (fileType === vscode.FileType.Directory) {
        dir = value
        usingFilter = false
      }
      else {
        dir = path.dirname(value)
        filter = path.basename(value)
        usingFilter = true
      }
      let children: [string, vscode.FileType][]
      try {
        children = await vscode.workspace.fs.readDirectory(vscode.Uri.file(dir))
      }
      catch {
        children = []
      }
      children = children.sort()
      children.unshift(['..', vscode.FileType.Directory])
      if (filter) {
        children = children.filter(([name]) => name.startsWith(filter))
      }
      quickPick.items = children.map(([name]) => {
        return {
          label: name,
          picked: false,
          alwaysShow: true,
        }
      })
    })

    quickPick.onDidAccept(async () => {
      if (quickPick.selectedItems.length === 0) {
        return
      }
      const sel = quickPick.selectedItems[0]

      if (sel.label === '..') {
        quickPick.value = path.dirname(quickPick.value)
      }
      else {
        const basePath = usingFilter ? path.dirname(quickPick.value) : quickPick.value
        const newPath = path.join(basePath, sel.label)
        const fileType = await getFileType(newPath)
        if (fileType === vscode.FileType.File) {
          resolve(newPath)
          quickPick.hide()
          return
        }
        quickPick.value = newPath
      }
    })

    quickPick.onDidHide(() => {
      resolve(undefined)
      quickPick.dispose()
    })

    quickPick.show()
  })
}

async function getFileType(path: string): Promise<vscode.FileType | undefined> {
  try {
    const stat = await vscode.workspace.fs.stat(vscode.Uri.file(path))
    return stat.type
  }
  catch {
    return undefined
  }
}
