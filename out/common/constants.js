"use strict";
// SPDX-License-Identifier: Apache-2.0
/**
 * RuyiSDK VS Code Extension - Common Constants
 *
 * Responsibilities:
 *  - Define shared error codes and constants used across the extension
 *  - Provide standard timeout values for command execution
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LONG_CMD_TIMEOUT_MS = exports.DEFAULT_CMD_TIMEOUT_MS = exports.SHORT_CMD_TIMEOUT_MS = exports.ERR_RUYI_NOT_FOUND = exports.ERR_NOT_SUPPORTED = void 0;
/** Error code constants */
exports.ERR_NOT_SUPPORTED = -126; // Platform not supported
exports.ERR_RUYI_NOT_FOUND = -127; // Ruyi command not found
/** Command execution timeouts */
exports.SHORT_CMD_TIMEOUT_MS = 5000; // quick checks (e.g. `ruyi --version`)
exports.DEFAULT_CMD_TIMEOUT_MS = 10000; // most commands
exports.LONG_CMD_TIMEOUT_MS = 60000; // long tasks (e.g. pip install/upgrade)
//# sourceMappingURL=constants.js.map