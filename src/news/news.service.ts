// SPDX-License-Identifier: Apache-2.0
/**
 * RuyiSDK VS Code Extension - News Module - Service Layer
 *
 * Provides reusable business logic for news features:
 * - Wraps `ruyi news list/read` CLI invocations.
 * - Manages on-disk cache with offline fallback and refresh.
 * - Marks items as read and extracts summaries for the UI layer.
 */

import * as dns from 'dns'
import * as https from 'https'
import * as os from 'os'
import * as path from 'path'
import { promisify } from 'util'
import * as vscode from 'vscode'

import { logger } from '../common/logger'
import ruyi from '../ruyi'

import { parseNewsListPorcelain, stripLeadingFrontMatter } from './news.helper'

const resolve4 = promisify(dns.resolve4)

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
  private readonly CACHE_VERSION = '1.0.0'
  private readonly CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000
  private newsEntriesCache = new Map<number, Array<{ name: string, url: string, locale: string }>>()

  private constructor(context?: vscode.ExtensionContext) {
    this.cachePath = context
      ? path.join(context.globalStorageUri.fsPath, 'news-cache.json')
      : path.join(os.homedir(), '.vscode', 'ruyi-news-cache.json')
  }

  static getInstance(context?: vscode.ExtensionContext): NewsService {
    if (!NewsService.instance) {
      NewsService.instance = new NewsService(context)
    }
    return NewsService.instance
  }

  private async isNetworkAvailable(): Promise<boolean> {
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('DNS lookup timeout')), 5000)
      })

      const lookupPromise = resolve4('detectportal.firefox.com')

      await Promise.race([lookupPromise, timeoutPromise])
      return true
    }
    catch {
      return false
    }
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
      const isOnline = await this.isNetworkAvailable()
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

    // Merge with local cache to preserve any read status updates that haven't synced to ruyi CLI yet
    const cache = await this.loadCache(true)
    if (cache) {
      const cacheMap = new Map(cache.data.map(item => [item.no, item]))
      fullData = fullData.map((item) => {
        const cached = cacheMap.get(item.no)
        // Use cached read status if it's more recent (i.e., if cached item is read, use it)
        if (cached && cached.read && !item.read) {
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
      const isOnline = await this.isNetworkAvailable()
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
      const { entries } = await this.getNewsEntries(no)
      if (entries.length === 0) {
        throw new Error('No news files found on GitHub')
      }
      const availableLocales = entries.map(e => e.locale)
      const vscodeLang = vscode.env.language
      const prefersZh = vscodeLang.toLowerCase().startsWith('zh')
      const defaultEntry = entries.find(e => e.locale === (prefersZh ? 'zh_CN' : 'en_US'))
        ?? entries.find(e => e.locale === (prefersZh ? 'en_US' : 'zh_CN'))
        ?? entries[0]
      const fileData = await this.fetchJson<{ content: string }>(defaultEntry.url)
      const cleaned = fileData.content.replace(/\n/g, '')
      const content = stripLeadingFrontMatter(Buffer.from(cleaned, 'base64').toString('utf8'))
      await this.markAsRead(no)
      // Sync read status to local ruyi - ensure completion before returning
      await ruyi.newsRead(no).catch(err => logger.warn('Failed to sync read status to ruyi:', err))
      return { defaultLocale: defaultEntry.locale, content, availableLocales }
    }
    catch (error) {
      logger.warn('Failed to read news from GitHub, falling back to ruyi CLI:', error)
      const result = await ruyi.newsRead(no)
      if (result.code !== 0) {
        throw new Error(result.stderr || 'ruyi news read failed')
      }
      await this.markAsRead(no)
      return { defaultLocale: 'default', content: result.stdout, availableLocales: ['default'] }
    }
  }

  async readLocale(no: number, locale: string): Promise<string> {
    const { entries } = await this.getNewsEntries(no)
    const entry = entries.find(e => e.locale === locale)
    if (!entry) {
      throw new Error(`Locale "${locale}" not found`)
    }
    const fileData = await this.fetchJson<{ content: string }>(entry.url)
    const cleaned = fileData.content.replace(/\n/g, '')
    return stripLeadingFrontMatter(Buffer.from(cleaned, 'base64').toString('utf8'))
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

  private fetchJson<T>(url: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const options = {
        headers: {
          'User-Agent': 'ruyisdk-vscode-extension',
          'Accept': 'application/vnd.github.v3+json',
        },
      }
      https.get(url, options, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`))
          res.resume()
          return
        }
        let data = ''
        res.on('data', (chunk: string) => {
          data += chunk
        })
        res.on('end', () => {
          try {
            resolve(JSON.parse(data) as T)
          }
          catch (e) {
            reject(e)
          }
        })
      }).on('error', reject)
    })
  }

  private async markAsRead(no: number): Promise<void> {
    try {
      const cache = await this.loadCache(true)
      if (!cache) return

      const newsItem = cache.data.find(item => item.no === no)
      if (newsItem && !newsItem.read) {
        newsItem.read = true
        // No need to extract summary again as it should be there from porcelain list
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
