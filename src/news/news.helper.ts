// SPDX-License-Identifier: Apache-2.0

/**
 * RuyiSDK VS Code Extension - News Module - Helper Utilities
 *
 * Contains reusable pure helpers for the news module:
 * - `extractNewsSummary`: derives short summaries from markdown bodies.
 */

import { logger } from '../common/logger'

import type { NewsRow } from './news.service'

const DATE_RE = /^(\d{4}-\d{2}-\d{2})\b/

interface NewsItemLang {
  lang: string
  display_title: string
  content: string
}

interface NewsItemJson {
  ty: string
  id: string
  ord: number
  is_read: boolean
  langs: NewsItemLang[]
}

function normalizeNewsTitle(rawTitle: string): string {
  const trimmed = rawTitle.trim()
  const prefixed = trimmed.match(/^title\s*:\s*(.+)$/i)
  if (!prefixed) {
    return trimmed
  }

  const cleaned = prefixed[1]
    .trim()
    .replace(/^["'`‘’“”]+/, '')
    .replace(/["'`‘’“”]+$/, '')
    .trim()

  return cleaned || trimmed
}

export function stripLeadingFrontMatter(markdown: string): string {
  return markdown.replace(/^\s*---\s*\r?\n[\s\S]*?\r?\n---\s*\r?\n?/, '')
}

export function parseNewsListPorcelain(stdout: string, preferredLang?: string): NewsRow[] {
  const result: NewsRow[] = []
  const lines = stdout.split(/\r?\n/).filter(line => line.trim())

  // Normalize preferred language code (e.g. "zh-cn" -> "zh_CN")
  let targetLang = preferredLang?.replace('-', '_')
  // Handle simple case "zh" -> "zh_CN"
  if (targetLang === 'zh') targetLang = 'zh_CN'
  if (targetLang === 'en') targetLang = 'en_US'

  for (const line of lines) {
    try {
      const item: NewsItemJson = JSON.parse(line)
      if (item.ty !== 'newsitem-v1') continue

      // Strategy: Preferred -> zh_CN -> en_US -> First Available
      let contentObj = targetLang ? item.langs.find(l => l.lang.toLowerCase() === targetLang?.toLowerCase()) : undefined

      if (!contentObj) {
        // Try with fuzzy match (start with lang code)
        if (preferredLang) {
          const shortLang = preferredLang.split('-')[0]
          contentObj = item.langs.find(l => l.lang.toLowerCase().startsWith(shortLang.toLowerCase()))
        }
      }

      if (!contentObj) {
        contentObj = item.langs.find(l => l.lang === 'zh_CN')
      }
      if (!contentObj) {
        contentObj = item.langs.find(l => l.lang === 'en_US')
      }
      if (!contentObj && item.langs.length > 0) {
        contentObj = item.langs[0]
      }

      if (contentObj) {
        const summary = extractNewsSummary(contentObj.content)
        result.push({
          no: item.ord,
          id: item.id,
          title: normalizeNewsTitle(contentObj.display_title),
          date: DATE_RE.exec(item.id)?.[1],
          read: item.is_read,
          summary,
        })
      }
    }
    catch (error) {
      logger.warn('Failed to parse news item json:', error)
    }
  }
  return result
}

export function extractNewsSummary(markdown: string): string | undefined {
  try {
    const content = stripLeadingFrontMatter(markdown)
    const lines = content.split(/\r?\n/)
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
