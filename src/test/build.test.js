import * as assert from 'node:assert/strict'
import { suite, test } from 'mocha'
import * as vscode from 'vscode'

suite('Build command', () => {
  test('runs the workspace build rules successfully', async () => {
    const informationMessages = []
    const errorMessages = []
    const originalShowInformationMessage = vscode.window.showInformationMessage
    const originalShowErrorMessage = vscode.window.showErrorMessage

    vscode.window.showInformationMessage = (message) => {
      informationMessages.push(message)
      return Promise.resolve(undefined)
    }
    vscode.window.showErrorMessage = (message) => {
      errorMessages.push(message)
      return Promise.resolve(undefined)
    }

    try {
      await vscode.commands.executeCommand('ruyi.build.run')
    }
    finally {
      vscode.window.showInformationMessage = originalShowInformationMessage
      vscode.window.showErrorMessage = originalShowErrorMessage
    }

    assert.deepEqual(errorMessages, [])
    assert.ok(informationMessages.some(message => message.includes('Build succeeded (npm)')))
  }).timeout(20000)
})
