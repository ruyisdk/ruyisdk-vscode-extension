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
import * as os from 'os'
import * as path from 'path'
import { promisify } from 'util'
import * as vscode from 'vscode'

import ruyi from '../../common/ruyi'

const resolve4 = promisify(dns.resolve4)

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
  private static instance: NewsService | null = null
  private cachePath: string
  private readonly CACHE_VERSION = '1.0.0'
  private readonly CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours

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

  private async loadCache(): Promise<NewsCache | null> {
    try {
      const cacheUri = vscode.Uri.file(this.cachePath)

      // Check if cache file exists
      try {
        await vscode.workspace.fs.stat(cacheUri)
      }
      catch {
        return null
      }

      const cacheData = await vscode.workspace.fs.readFile(cacheUri)
      const cache: NewsCache = JSON.parse(cacheData.toString())

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
      const cacheUri = vscode.Uri.file(this.cachePath)
      const cacheDir = vscode.Uri.joinPath(cacheUri, '..')

      // Ensure directory exists
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
    const shouldTryNetwork = forceRefresh || await this.isNetworkAvailable()

    if (shouldTryNetwork) {
      try {
        return await this.fetchFromNetwork(unread)
      }
      catch (error) {
        if (forceRefresh) {
          throw error
        }
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
    const result = await ruyi.newsList({ newOnly: unread })

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
    const result = await ruyi.newsRead(no)
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
