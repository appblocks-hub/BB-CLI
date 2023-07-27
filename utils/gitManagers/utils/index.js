/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Throws method is not implemented error
 */
const noMethodImplementedError = (gitVendor) => {
  const fnName = getFunctionNameFromStackTrace()
  throw new Error(`Method${fnName || ' '}not implemented ${gitVendor ? `for ${gitVendor}` : ''}`)
}

function getFunctionNameFromStackTrace() {
  const errorStack = new Error().stack
  const regex = /at\s+([\w.]+)/g;
  const match = errorStack.match(regex)

  if (match && match.length >= 2) {
    const functionNameWithFilePath = match[2];
    const functionName = functionNameWithFilePath.split('.').pop();
    return ` ${functionName} `;
  }

  return null
}

module.exports = { noMethodImplementedError }
