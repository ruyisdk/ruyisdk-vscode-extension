// SPDX-License-Identifier: Apache-2.0
/**
 * RuyiSDK VS Code Extension - News Tree View
 *
 * - Render news items (title + date) in `ruyiNewsView`
 * - Click to read via command `ruyi.news.read` (by list number, No.)
 * - Filter: unread only / all (uses `ruyi news list --new`)
 */

import * as vscode from 'vscode';
import NewsService, {NewsRow} from './NewsService';

const CTX_KEY = 'ruyiNews.showUnreadOnly';

export default class NewsTree implements
    vscode.TreeDataProvider<vscode.TreeItem> {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private showUnreadOnly = false;

  constructor(private readonly svc: NewsService) {}

  /**
   * Toggle filter state between "all" and "unread only".
   */
  toggleFilter() {
    this.setFilterUnreadOnly(!this.showUnreadOnly);
  }

  /**
   * Explicitly set filter state and refresh the view.
   * @param flag false → show all news; true → show only unread news
   */
  setFilterUnreadOnly(flag: boolean) {
    this.showUnreadOnly = flag;
    void vscode.commands.executeCommand('setContext', CTX_KEY, flag);
    this.refresh();
  }

  refresh() {
    this._onDidChangeTreeData.fire();
  }

  async getChildren(): Promise<vscode.TreeItem[]> {
    try {
      const rows = await this.svc.list(this.showUnreadOnly);
      if (rows.length === 0) {
        return [this.infoItem(
            this.showUnreadOnly ? 'No unread news.' : 'No news items.')];
      }
      return rows.map(this.rowToItem);
    } catch (err: any) {
      void vscode.window.showErrorMessage(
          `Failed to load news: ${err?.message ?? String(err)}`);
      return [this.infoItem('Failed to load news. See OUTPUT for details.')];
    }
  }

  getTreeItem(e: vscode.TreeItem) {
    return e;
  }

  private rowToItem(r: NewsRow): vscode.TreeItem {
    const label = r.title?.trim() || `#${r.no}`;
    const item =
        new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None);
    item.description = r.date || '';
    item.tooltip = `${r.title || `#${r.no}`}${
        r.date ? `\n\nDate: ${r.date}` : ''}\nNo.: ${r.no}\nID: ${r.id}`;
    item.command = {
      command: 'ruyi.news.read',
      title: 'Read News',
      arguments: [r.no, r.title],
    };
    return item;
  }

  private infoItem(text: string): vscode.TreeItem {
    const item =
        new vscode.TreeItem(text, vscode.TreeItemCollapsibleState.None);
    item.contextValue = 'info';
    item.iconPath = new vscode.ThemeIcon('info');
    return item;
  }
}
