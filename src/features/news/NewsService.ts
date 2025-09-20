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

import {exec} from 'child_process';
import {promisify} from 'util';
import {DEFAULT_CMD_TIMEOUT_MS} from '../../common/constants';

const execAsync = promisify(exec);

export type NewsRow = {
  no: number; id: string; title: string;
  date?: string;
};

export default class NewsService {
  /**
   * List news items.
   * @param unread false → list all news (`ruyi news list`)
   *               true  → list only unread news (`ruyi news list --new`)
   */
  async list(unread = false): Promise<NewsRow[]> {
    const cmd = unread ? 'ruyi news list --new' : 'ruyi news list';
    const {stdout} = await execAsync(cmd, {timeout: DEFAULT_CMD_TIMEOUT_MS});
    return this.parseList(stdout);
  }

  /**
   * Read news details by list number (No.).
   * Example: `ruyi news read 1`
   */
  async read(no: number): Promise<string> {
    const {stdout} = await execAsync(`ruyi news read ${no}`, {
      timeout: DEFAULT_CMD_TIMEOUT_MS,
    });
    return stdout;
  }

  /**
   * Parse CLI output lines into NewsRow objects.
   * Matches lines like: "1   2024-01-14-ruyi-news   Some title..."
   */
  private parseList(out: string): NewsRow[] {
    const rowRe = /^\s*(\d+)\s+(\S+)\s+(.+)\s*$/;
    const dateRe = /^(\d{4}-\d{2}-\d{2})\b/;

    return out.split(/\r?\n/)
        .map(l => rowRe.exec(l))
        .filter((m): m is RegExpExecArray => !!m)
        .map(([, no, id, title]) => ({
               no: +no,
               id,
               title: title.trim(),
               date: dateRe.exec(id)?.[1],
             }));
  }
}
