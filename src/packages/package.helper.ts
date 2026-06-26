// SPDX-License-Identifier: Apache-2.0

export function formatSize(bytes: number): string {
  if (!isFinite(bytes)) return String(bytes)
  const units = ['B', 'kB', 'MB', 'GB', 'TB', 'PB']
  if (bytes === 0) return '0 B'
  const absBytes = Math.abs(bytes)
  const idx = Math.min(Math.floor(Math.log10(absBytes) / 3), units.length - 1)
  const value = bytes / Math.pow(1000, idx)
  const rounded = Math.round(value) === value ? value.toFixed(0) : value.toFixed(2).replace(/\.?(0+)$/, '')
  return `${rounded} ${units[idx]}`
}
