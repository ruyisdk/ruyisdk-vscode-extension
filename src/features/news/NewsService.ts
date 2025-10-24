// SPDX-License-Identifier: Apache-2.0
/**
 * NewsService: wraps CLI calls to `ruyi news`.
 *
 * Responsibilities:
 *   - Run `ruyi news list` (all news) or `ruyi news list --new` (only unread)
 *   - Run `ruyi news read <id>` to fetch news details (also marks as read)
 *   - Parse CLI tabular output (No. / ID / Title) into structured rows
 *   - Extract optional date prefix (yyyy-mm-dd) from ID
 */

import ruyi from '../../common/ruyi'

export type NewsRow = {
  no: number
  id: string
  title: string
  date?: string
}

export default class NewsService {
  /**
   * List news items.
   * @param unread false → list all news (`ruyi news list`)
   *               true  → list only unread news (`ruyi news list --new`)
   */
  async list(unread = false): Promise<NewsRow[]> {
    const result = await ruyi.newsList({ newOnly: unread })
    if (result.code !== 0) {
      throw new Error(result.stderr || 'ruyi news list failed')
    }
    return this.parseList(result.stdout)
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
    return result.stdout
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
      }))
  }
}
