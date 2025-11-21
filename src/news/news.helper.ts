// SPDX-License-Identifier: Apache-2.0

/**
 * RuyiSDK VS Code Extension - News Module - Helper Utilities
 *
 * Contains reusable pure helpers for the news module:
 * - `parseNewsList`: converts CLI stdout into typed rows.
 * - `extractNewsSummary`: derives short summaries from markdown bodies.
 */

import { logger } from '../common/logger'

import type { NewsRow } from './news.service'

const ROW_RE = /^\s*(\d+)\s+(\S+)\s+(.+)\s*$/
const DATE_RE = /^(\d{4}-\d{2}-\d{2})\b/

export function parseNewsList(stdout: string): NewsRow[] {
  return stdout.split(/\r?\n/)
    .map(line => ROW_RE.exec(line))
    .filter((match): match is RegExpExecArray => !!match)
    .map(([, no, id, title]) => ({
      no: Number(no),
      id,
      title: title.trim(),
      date: DATE_RE.exec(id)?.[1],
      read: false,
    }))
}

export function extractNewsSummary(markdown: string): string | undefined {
  try {
    const lines = markdown.split(/\r?\n/)
    const blocks: string[] = []
    let current: string[] = []

    for (const line of lines) {
      if (line.trim() === '') {
        if (current.length) {
          blocks.push(current.join(' ').trim())
          current = []
        }
        continue
      }

      if (/^\s*(```|#{1,6}\s|[-*+]\s|>\s|\|.+\||!\[[^\]]*\]\([^)]*\))/.test(line)) {
        continue
      }

      current.push(line.trim())
    }

    if (current.length) {
      blocks.push(current.join(' ').trim())
    }

    const first = blocks.find(block => block.length > 0)
    if (!first) {
      return undefined
    }

    let text = first
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
      .replace(/!\[(.*?)\]\((.*?)\)/g, '$1')
      .replace(/\s+/g, ' ')
      .trim()

    const limit = 160
    if (text.length > limit) {
      text = text.slice(0, limit - 1).trimEnd() + '…'
    }

    return text
  }
  catch (error) {
    logger.warn('Failed to extract summary:', error)
    return undefined
  }
}
