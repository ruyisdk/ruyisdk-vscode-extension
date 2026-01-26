// SPDX-License-Identifier: Apache-2.0
/**
 * RuyiSDK VS Code Extension - Venv Module - State Management
 *
 * Provides centralized state management for virtual environments.
 * Implements the Observer pattern to notify listeners of state changes.
 */

import * as path from 'path'

import { logger } from '../../../common/logger'

import type { VenvStateListener } from './types'

/**
 * Centralized state manager for Ruyi virtual environments.
 * This class manages the current active venv and notifies listeners of changes.
 * Uses the Singleton pattern to ensure a single source of truth.
 */
class VenvStateManager {
  private currentVenv: string | null = null
  private listeners: Set<VenvStateListener> = new Set()

  /**
   * Get the current active virtual environment path.
   * @returns The path to the active venv, or null if none is active.
   */
  getCurrentVenv(): string | null {
    return this.currentVenv
  }

  /**
   * Set the current active virtual environment path and notify all listeners.
   * @param venvPath The path to the venv to activate, or null to deactivate.
   */
  setCurrentVenv(venvPath: string | null): void {
    // Normalize paths for consistent comparison
    const normalizedNew = venvPath ? path.normalize(venvPath) : null
    const normalizedCurrent = this.currentVenv ? path.normalize(this.currentVenv) : null

    if (normalizedCurrent === normalizedNew) {
      return // No change, skip notification
    }

    this.currentVenv = venvPath
    this.notifyListeners()
  }

  /**
   * Subscribe to venv state changes.
   * @param listener The callback function to invoke when state changes.
   * @returns A function to unsubscribe this listener.
   */
  subscribe(listener: VenvStateListener): () => void {
    this.listeners.add(listener)
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * Notify all listeners of the current state.
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener(this.currentVenv)
      }
      catch (error) {
        logger.error('Error in venv state listener:', error)
      }
    })
  }

  /**
   * Get the number of active listeners (for debugging/testing).
   */
  getListenerCount(): number {
    return this.listeners.size
  }
}

/**
 * Singleton instance of the venv state manager.
 * Use this instance throughout the application for state management.
 */
export const venvState = new VenvStateManager()
