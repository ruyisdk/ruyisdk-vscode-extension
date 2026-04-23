import * as vscode from 'vscode'

import { logger } from '../common/logger'

async function loadDocument(url: string): Promise<string | undefined> {
  try {
    const res = await fetch(url)
    if (!res.ok) {
      logger.error(`Failed to load document from ${url}: `, res.statusText)
      return undefined
    }
    return res.text()
  }
  catch (error) {
    logger.error(`Failed to load ${url}: `, error)
    return undefined
  }
}

function craftPrompt(document: string): string {
  return 'The following message is a document that describes few operations that can be done on a RISC-V board:\n\n'
    + document
}

export async function openInCopilot(document_url: string) {
  const document = await loadDocument(document_url)
  if (!document) {
    return
  }
  const query = craftPrompt(document)
  vscode.commands.executeCommand('workbench.action.chat.open', {
    query,
    isPartialQuery: true,
  })
}
