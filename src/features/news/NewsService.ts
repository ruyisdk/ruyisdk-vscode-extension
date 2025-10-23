// SPDX-License-Identifier: Apache-2.0
/**
 * NewsService: wraps CLI calls to `ruyi news`.
 *
 * Responsibilities:
 *   - Run `ruyi news list` (all news) or `ruyi news list --new` (only unread)
 *   - Run `ruyi news read <id>` to fetch news details (also marks as read)
 *   - Parse CLI tabular output (No. / ID / Title) into structured rows
 *   - Extract optional date prefix (yyyy-mm-dd) from ID
 *   - Cache news data locally for offline access
 *   - Auto-update cache when network is available
 */

import * as dns from 'dns'
import * as fs from 'fs'
import * as path from 'path'
import { promisify } from 'util'
import * as vscode from 'vscode'

import { runRuyi } from '../../common/RuyiInvoker'

const lookup = promisify(dns.lookup)

export type NewsRow = {
  no: number
  id: string
  title: string
  date?: string
  read?: boolean
}

export type NewsCache = {
  data: NewsRow[]
  timestamp: number
  version: string
}

export default class NewsService {
  private cachePath: string
  private readonly CACHE_VERSION = '1.0.0'
  private readonly CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours

  constructor(context?: vscode.ExtensionContext) {
    this.cachePath = context
      ? path.join(context.globalStorageUri.fsPath, 'news-cache.json')
      : path.join(process.env.HOME || '', '.vscode', 'ruyi-news-cache.json')
  }

  private async isNetworkAvailable(): Promise<boolean> {
    try {
      await lookup('www.baidu.com')
      return true
    }
    catch {
      return false
    }
  }

  private async loadCache(): Promise<NewsCache | null> {
    try {
      if (!fs.existsSync(this.cachePath)) {
        return null
      }

      const cacheData = fs.readFileSync(this.cachePath, 'utf8')
      const cache: NewsCache = JSON.parse(cacheData)

      // Check if cache is expired
      const now = Date.now()
      if (now - cache.timestamp > this.CACHE_EXPIRY_MS) {
        return null
      }

      return cache
    }
    catch (error) {
      console.warn('Failed to load news cache:', error)
      return null
    }
  }

  private async saveCache(data: NewsRow[]): Promise<void> {
    try {
      const cacheDir = path.dirname(this.cachePath)
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true })
      }

      const cache: NewsCache = {
        data,
        timestamp: Date.now(),
        version: this.CACHE_VERSION,
      }

      fs.writeFileSync(this.cachePath, JSON.stringify(cache, null, 2))
    }
    catch (error) {
      console.warn('Failed to save news cache:', error)
    }
  }

  /**
   * List news items with automatic cache management.
   * @param unread false → list all news (`ruyi news list`)
   *               true  → list only unread news (`ruyi news list --new`)
   * @param forceRefresh force refresh from network, ignoring cache
   */
  async list(unread = false, forceRefresh = false): Promise<NewsRow[]> {
    if (forceRefresh) {
      return await this.fetchFromNetwork(unread)
    }

    if (await this.isNetworkAvailable()) {
      try {
        return await this.fetchFromNetwork(unread)
      }
      catch (error) {
        console.warn('Network fetch failed, trying cache:', error)
        return await this.fetchFromCache(unread)
      }
    }

    return await this.fetchFromCache(unread)
  }

  /**
   * Fetch news from network and update cache
   */
  private async fetchFromNetwork(unread: boolean): Promise<NewsRow[]> {
    const result = await runRuyi(['news', 'list'])

    if (result.code !== 0) {
      throw new Error(result.stderr || 'ruyi news list failed')
    }

    const newData = this.parseList(result.stdout)

    const cache = await this.loadCache()
    const existingData = cache?.data || []

    const mergedData = newData.map((newItem) => {
      const existingItem = existingData.find(item => item.id === newItem.id)
      return {
        ...newItem,
        read: existingItem?.read || false,
      }
    })

    await this.saveCache(mergedData)

    return unread ? mergedData.filter(item => !item.read) : mergedData
  }

  /**
   * Fetch from cache with smart fallback
   */
  private async fetchFromCache(unread: boolean): Promise<NewsRow[]> {
    const cache = await this.loadCache()

    if (!cache || cache.data.length === 0) {
      if (await this.isNetworkAvailable()) {
        return await this.fetchFromNetwork(unread)
      }
      return []
    }

    return unread ? cache.data.filter(item => !item.read) : cache.data
  }

  /**
   * Initialize news service by fetching latest data if network is available
   * This should be called on extension startup
   */
  async initialize(): Promise<void> {
    try {
      const isOnline = await this.isNetworkAvailable()
      if (isOnline) {
        await this.list(false, true) // Force refresh
        console.log('News service initialized')
      }
      else {
        const cache = await this.loadCache()
        if (cache) {
          console.log(`News service initialized from cache with ${cache.data.length} items`)
        }
      }
    }
    catch (error) {
      console.warn('Failed to initialize news service:', error)
    }
  }

  /**
   * Read news details by list number (No.).
   * Example: `ruyi news read 1`
   */
  async read(no: number): Promise<string> {
    const result = await runRuyi(
      ['news', 'read', String(no)])
    if (result.code !== 0) {
      throw new Error(result.stderr || 'ruyi news read failed')
    }

    // Mark this news item as read in cache
    await this.markAsRead(no)

    return result.stdout
  }

  /**
   * Mark a news item as read by its list number
   */
  private async markAsRead(no: number): Promise<void> {
    try {
      const cache = await this.loadCache()
      if (!cache) return

      const newsItem = cache.data.find(item => item.no === no)
      if (newsItem && !newsItem.read) {
        newsItem.read = true
        await this.saveCache(cache.data)
      }
    }
    catch (error) {
      console.warn('Failed to mark news as read:', error)
    }
  }

  /**
   * Parse CLI output lines into NewsRow objects.
   * Matches lines like: "1   2024-01-14-ruyi-news   Some title..."
   */
  private parseList(out: string): NewsRow[] {
    const rowRe = /^\s*(\d+)\s+(\S+)\s+(.+)\s*$/
    const dateRe = /^(\d{4}-\d{2}-\d{2})\b/

    return out.split(/\r?\n/)
      .map(l => rowRe.exec(l))
      .filter((m): m is RegExpExecArray => !!m)
      .map(([, no, id, title]) => ({
        no: +no,
        id,
        title: title.trim(),
        date: dateRe.exec(id)?.[1],
        read: false,
      }))
  }
}
