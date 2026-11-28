// SPDX-License-Identifier: Apache-2.0
/**
 * RuyiSDK VS Code Extension - Curl Helper Functions
 *
 * Responsibilities:
 *  - Provide helper functions for parsing curl output and progress tracking.
 */

import { DownloadProgress } from './helpers'

/**
 * Parse a line of curl progress output and format its optional detail message.
 */
export function parseCurlProgressDetails(line: string): DownloadProgress | null {
  const fields = line.trim().split(/\s+/)
  if (fields.length < 12) return null

  const total = parseCurlSize(fields[1])
  const current = parseCurlSize(fields[3])
  const speed = parseCurlSize(fields[11])

  if ([total, current, speed].some(Number.isNaN)) {
    return null
  }

  return { total, current, speed }
}

function parseCurlSize(value: string): number {
  const match = value.match(/^(\d+(?:\.\d+)?)([kKmMgGtTpP]?)$/)
  if (!match) return Number.NaN

  const units = ['', 'k', 'm', 'g', 't', 'p']
  const unitIndex = units.indexOf(match[2].toLowerCase())
  if (unitIndex === -1) return Number.NaN

  return Number.parseFloat(match[1]) * Math.pow(1024, unitIndex)
}
