// SPDX-License-Identifier: Apache-2.0

/** Formats a byte count using IEC (binary) units. */
export function formatSize(bytes: number): string {
  if (!isFinite(bytes)) return String(bytes)
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB']
  if (bytes === 0) return '0 B'
  const absBytes = Math.abs(bytes)
  const idx = Math.max(0, Math.min(Math.floor(Math.log2(absBytes) / 10), units.length - 1))
  const value = bytes / Math.pow(1024, idx)
  const rounded = Math.round(value) === value ? value.toFixed(0) : value.toFixed(2).replace(/\.?(0+)$/, '')
  return `${rounded} ${units[idx]}`
}
