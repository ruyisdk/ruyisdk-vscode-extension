// SPDX-License-Identifier: Apache-2.0
/**
 * RuyiSDK VS Code Extension - News Module - Service Layer
 *
 * Provides reusable business logic for news features:
 * - Wraps `ruyi news list/read` CLI invocations.
 * - Manages on-disk cache with offline fallback and refresh.
 * - Marks items as read and extracts summaries for the UI layer.
 */

import * as os from 'os'
import * as path from 'path'
import * as vscode from 'vscode'

import { isNetworkAvailable } from '../common/helpers'
import { logger } from '../common/logger'
import ruyi from '../ruyi'

import { parseNewsListPorcelain, stripLeadingFrontMatter } from './news.helper'

export type NewsRow = {
  no: number
  id: string
  title: string
  date?: string
  read?: boolean
  summary?: string
}

export type NewsCache = {
  data: NewsRow[]
  timestamp: number
  version: string
}

export class NewsService {
  private static instance: NewsService | null = null
  private cachePath: string
  private localNewsDir: string
  private readonly CACHE_VERSION = '1.0.0'
  private readonly CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000
  private newsEntriesCache = new Map<number, Array<{ name: string, url: string, locale: string }>>()
  private pendingSyncReads = new Set<number>()

  private constructor(context?: vscode.ExtensionContext) {
    this.cachePath = context
      ? path.join(context.globalStorageUri.fsPath, 'news-cache.json')
      : path.join(os.homedir(), '.vscode', 'ruyi-news-cache.json')
    this.localNewsDir = path.join(os.homedir(), '.cache', 'ruyi', 'repos', 'ruyisdk', 'news')
  }

  static getInstance(context?: vscode.ExtensionContext): NewsService {
    if (!NewsService.instance) {
      NewsService.instance = new NewsService(context)
    }
    return NewsService.instance
  }

  private async loadCache(allowExpired = false): Promise<NewsCache | null> {
    try {
      const cacheUri = vscode.Uri.file(this.cachePath)

      try {
        await vscode.workspace.fs.stat(cacheUri)
      }
      catch {
        return null
      }

      const cacheData = await vscode.workspace.fs.readFile(cacheUri)
      const cache: NewsCache = JSON.parse(cacheData.toString())

      const now = Date.now()
      if (!allowExpired && now - cache.timestamp > this.CACHE_EXPIRY_MS) {
        return null
      }

      return cache
    }
    catch (error) {
      logger.warn('Failed to load news cache:', error)
      return null
    }
  }

  private async saveCache(data: NewsRow[]): Promise<void> {
    try {
      const cacheUri = vscode.Uri.file(this.cachePath)
      const cacheDir = vscode.Uri.joinPath(cacheUri, '..')

      try {
        await vscode.workspace.fs.stat(cacheDir)
      }
      catch {
        await vscode.workspace.fs.createDirectory(cacheDir)
      }

      const cache: NewsCache = {
        data,
        timestamp: Date.now(),
        version: this.CACHE_VERSION,
      }

      const cacheContent = JSON.stringify(cache, null, 2)
      await vscode.workspace.fs.writeFile(cacheUri, Buffer.from(cacheContent, 'utf8'))
    }
    catch (error) {
      logger.warn('Failed to save news cache:', error)
    }
  }

  async list(unread = false, forceRefresh = false): Promise<NewsRow[]> {
    // forceRefresh implies trying to update the repo from remote
    if (forceRefresh) {
      const isOnline = await isNetworkAvailable()
      if (isOnline) {
        try {
          await this.refreshNewsRepo()
        }
        catch (error) {
          logger.warn('Failed to update news repo:', error)
          // Proceed to list local news anyway
        }
      }
    }

    try {
      return await this.fetchFromRuyi(unread)
    }
    catch (error) {
      logger.warn('Fetching news from ruyi failed, trying cache:', error)
      return await this.fetchFromCache(unread)
    }
  }

  private async fetchFromRuyi(unread: boolean): Promise<NewsRow[]> {
    // Always fetch the full list to maintain complete cache
    // Using porcelain mode to get JSON output with read status and content
    const result = await ruyi.newsList({ newOnly: false, porcelain: true })

    if (result.code !== 0) {
      throw new Error(result.stderr || 'ruyi news list failed')
    }

    let fullData = parseNewsListPorcelain(result.stdout, vscode.env.language)

    // Retain the local "read" flag for items whose ruyi sync is still in-flight,
    // so the card list doesn't flicker back to unread before the CLI is updated.
    const cache = await this.loadCache(true)
    if (cache) {
      const cacheMap = new Map(cache.data.map(item => [item.no, item]))
      fullData = fullData.map((item) => {
        const cached = cacheMap.get(item.no)
        if (cached && cached.read && !item.read && this.pendingSyncReads.has(item.no)) {
          return { ...item, read: true }
        }
        return item
      })
    }

    // Cache the full valid data
    await this.saveCache(fullData)

    // If unread is requested, filter the data
    const filteredData = unread ? fullData.filter(item => !item.read) : fullData
    return filteredData
  }

  private async fetchFromCache(unread: boolean): Promise<NewsRow[]> {
    const cache = await this.loadCache(true)

    if (!cache || cache.data.length === 0) {
      return []
    }

    return unread ? cache.data.filter(item => !item.read) : cache.data
  }

  async initialize(): Promise<void> {
    try {
      const isOnline = await isNetworkAvailable()
      if (isOnline) {
        await this.list(false, true)
        logger.log('News service initialized')
      }
      else {
        const cache = await this.loadCache(true)
        if (cache) {
          logger.log(`News service initialized from cache with ${cache.data.length} items`)
        }
      }
    }
    catch (error) {
      logger.warn('Failed to initialize news service:', error)
    }
  }

  async readDefault(no: number): Promise<{ defaultLocale: string, content: string, availableLocales: string[] }> {
    try {
      const { id, entries } = await this.getNewsEntries(no)
      if (entries.length === 0) {
        throw new Error('No news files found')
      }
      const availableLocales = entries.map(e => e.locale)
      const vscodeLang = vscode.env.language
      const prefersZh = vscodeLang.toLowerCase().startsWith('zh')
      const defaultEntry = entries.find(e => e.locale === (prefersZh ? 'zh_CN' : 'en_US'))
        ?? entries.find(e => e.locale === (prefersZh ? 'en_US' : 'zh_CN'))
        ?? entries[0]

      // Priority 1: read from local ruyi news cache
      let content = await this.readLocalNewsContent(id, defaultEntry.locale)

      // Priority 2: fetch from GitHub API (only when URL is available — local entries have no URL)
      if (content === null && defaultEntry.url) {
        const fileData = await this.fetchJson<{ content: string }>(defaultEntry.url)
        const cleaned = fileData.content.replace(/\n/g, '')
        content = stripLeadingFrontMatter(Buffer.from(cleaned, 'base64').toString('utf8'))
      }

      if (content === null) {
        throw new Error('News file not found in local cache and no GitHub URL available')
      }

      // Success — mark as read locally; sync to ruyi in background (non-blocking)
      await this.markAsRead(no)
      ruyi.newsRead(no)
        .then(() => this.pendingSyncReads.delete(no))
        .catch((err) => {
          this.pendingSyncReads.delete(no)
          logger.warn('Failed to sync read status to ruyi:', err)
        })
      return { defaultLocale: defaultEntry.locale, content, availableLocales }
    }
    catch (error) {
      logger.warn('Failed to read news, falling back to ruyi CLI:', error)
      const result = await ruyi.newsRead(no)
      if (result.code !== 0) {
        throw new Error(result.stderr || 'ruyi news read failed')
      }
      await this.markAsRead(no)
      this.pendingSyncReads.delete(no)
      return { defaultLocale: 'default', content: result.stdout, availableLocales: ['default'] }
    }
  }

  async readLocale(no: number, locale: string): Promise<string> {
    const { id, entries } = await this.getNewsEntries(no)
    const entry = entries.find(e => e.locale === locale)
    if (!entry) {
      throw new Error(`Locale "${locale}" not found`)
    }

    // Priority 1: read from local ruyi news cache
    const localContent = await this.readLocalNewsContent(id, locale)
    if (localContent !== null) {
      return localContent
    }

    // Priority 2: fetch from GitHub API (only when URL is available — local entries have no URL)
    if (entry.url) {
      const fileData = await this.fetchJson<{ content: string }>(entry.url)
      const cleaned = fileData.content.replace(/\n/g, '')
      return stripLeadingFrontMatter(Buffer.from(cleaned, 'base64').toString('utf8'))
    }

    throw new Error(`Locale "${locale}" not available in local cache and no GitHub URL`)
  }

  /**
   * Scan the local ruyi news cache directory for files matching a given news item ID.
   * File naming convention: `{id}.{locale}.md`, e.g. `2024-01-14-ruyi-news.zh_CN.md`
   */
  private async scanLocalNewsFiles(id: string): Promise<Array<{ name: string, url: string, locale: string }> | null> {
    try {
      const dirUri = vscode.Uri.file(this.localNewsDir)
      const entries = await vscode.workspace.fs.readDirectory(dirUri)
      const localeRe = /\.([a-z]{2}_[A-Z]{2})\.md$/

      const files = entries
        .filter(([name, fileType]) => fileType === vscode.FileType.File && name.startsWith(id))
        .map(([name]) => {
          const localeMatch = name.match(localeRe)
          const locale = localeMatch ? localeMatch[1] : 'default'
          return { name, url: '', locale }
        })

      return files.length > 0 ? files : null
    }
    catch {
      // Directory doesn't exist or can't be read — fall back to GitHub API
      return null
    }
  }

  /**
   * Read a single locale's markdown content from the local ruyi news cache.
   */
  private async readLocalNewsContent(id: string, locale: string): Promise<string | null> {
    try {
      const filePath = path.join(this.localNewsDir, `${id}.${locale}.md`)
      const fileUri = vscode.Uri.file(filePath)
      const raw = await vscode.workspace.fs.readFile(fileUri)
      return stripLeadingFrontMatter(raw.toString())
    }
    catch {
      return null
    }
  }

  private async getNewsEntries(no: number): Promise<{ id: string, entries: Array<{ name: string, url: string, locale: string }> }> {
    const cache = await this.loadCache(true)
    const newsItem = cache?.data.find(item => item.no === no)
    if (!newsItem?.id) {
      throw new Error('News item not found in cache')
    }
    const cached = this.newsEntriesCache.get(no)
    if (cached) {
      return { id: newsItem.id, entries: cached }
    }

    // Priority 1: scan local ruyi news cache directory
    const localEntries = await this.scanLocalNewsFiles(newsItem.id)
    if (localEntries) {
      this.newsEntriesCache.set(no, localEntries)
      return { id: newsItem.id, entries: localEntries }
    }

    // Priority 2: fall back to GitHub API
    const dirUrl = 'https://api.github.com/repos/ruyisdk/packages-index/contents/news?ref=main'
    const rawEntries = await this.fetchJson<Array<{ name: string, url: string, type: string }>>(dirUrl)
    const entries = rawEntries
      .filter(e => e.type === 'file' && e.name.startsWith(newsItem.id))
      .map((e) => {
        const localeMatch = e.name.match(/\.([a-z]{2}_[A-Z]{2})\.md$/)
        const locale = localeMatch ? localeMatch[1] : 'default'
        return { name: e.name, url: e.url, locale }
      })
    this.newsEntriesCache.set(no, entries)
    return { id: newsItem.id, entries }
  }

  private async fetchJson<T>(url: string): Promise<T> {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ruyisdk-vscode-extension',
        'Accept': 'application/vnd.github.v3+json',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`)
    }

    return (await response.json()) as T
  }

  private async markAsRead(no: number): Promise<void> {
    try {
      const cache = await this.loadCache(true)
      if (!cache) return

      const newsItem = cache.data.find(item => item.no === no)
      if (newsItem && !newsItem.read) {
        newsItem.read = true
        this.pendingSyncReads.add(no)
        await this.saveCache(cache.data)
      }
    }
    catch (error) {
      logger.warn('Failed to mark news as read:', error)
    }
  }

  private async refreshNewsRepo(): Promise<void> {
    const result = await ruyi.update()
    if (result.code !== 0) {
      throw new Error(result.stderr || 'ruyi update failed')
    }
  }
}
