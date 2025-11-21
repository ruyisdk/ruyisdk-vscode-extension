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
import * as os from 'os'
import * as path from 'path'
import { promisify } from 'util'
import * as vscode from 'vscode'

import { logger } from '../common/logger'
import ruyi from '../ruyi'

import { extractNewsSummary, parseNewsList } from './news.helper'

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

      try {
        await vscode.workspace.fs.stat(cacheUri)
      }
      catch {
        return null
      }

      const cacheData = await vscode.workspace.fs.readFile(cacheUri)
      const cache: NewsCache = JSON.parse(cacheData.toString())

      const now = Date.now()
      if (now - cache.timestamp > this.CACHE_EXPIRY_MS) {
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
    const shouldTryNetwork = forceRefresh || await this.isNetworkAvailable()

    if (shouldTryNetwork) {
      try {
        return await this.fetchFromNetwork(unread)
      }
      catch (error) {
        if (forceRefresh) {
          throw error
        }
        logger.warn('Network fetch failed, trying cache:', error)
        return await this.fetchFromCache(unread)
      }
    }

    return await this.fetchFromCache(unread)
  }

  private async fetchFromNetwork(unread: boolean): Promise<NewsRow[]> {
    const result = await ruyi.newsList({ newOnly: unread })

    if (result.code !== 0) {
      throw new Error(result.stderr || 'ruyi news list failed')
    }

    const newData = parseNewsList(result.stdout)

    const cache = await this.loadCache()
    const existingData = cache?.data || []

    const mergedData = newData.map((newItem) => {
      const existingItem = existingData.find(item => item.id === newItem.id)
      return {
        ...newItem,
        read: existingItem?.read || false,
        summary: existingItem?.summary,
      }
    })

    await this.saveCache(mergedData)

    return unread ? mergedData.filter(item => !item.read) : mergedData
  }

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

  async initialize(): Promise<void> {
    try {
      const isOnline = await this.isNetworkAvailable()
      if (isOnline) {
        await this.list(false, true)
        logger.log('News service initialized')
      }
      else {
        const cache = await this.loadCache()
        if (cache) {
          logger.log(`News service initialized from cache with ${cache.data.length} items`)
        }
      }
    }
    catch (error) {
      logger.warn('Failed to initialize news service:', error)
    }
  }

  async read(no: number): Promise<string> {
    const result = await ruyi.newsRead(no)
    if (result.code !== 0) {
      throw new Error(result.stderr || 'ruyi news read failed')
    }

    await this.markAsRead(no, result.stdout)

    return result.stdout
  }

  private async markAsRead(no: number, bodyMarkdown?: string): Promise<void> {
    try {
      const cache = await this.loadCache()
      if (!cache) return

      const newsItem = cache.data.find(item => item.no === no)
      if (newsItem && !newsItem.read) {
        newsItem.read = true
        if (bodyMarkdown) {
          const summary = extractNewsSummary(bodyMarkdown)
          if (summary) {
            newsItem.summary = summary
          }
        }
        await this.saveCache(cache.data)
      }
    }
    catch (error) {
      logger.warn('Failed to mark news as read:', error)
    }
  }
}
