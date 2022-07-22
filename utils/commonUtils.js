/**
 * Copyright (c) Yahilo. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { transports } = require('winston')
const { logger } = require('./logger')

const addLog = (log, fileName = 'debug') => {
  const wTransport = new transports.File({ filename: `${fileName}.log` })
  logger.add(wTransport)
  logger.info(log)
  logger.remove(wTransport)
}

const clearLog = (fileName = 'debug') => {
  const wTransport = new transports.File({ filename: `${fileName}.log` })
  logger.add(wTransport)
  logger.clear()
  logger.remove(wTransport)
}

module.exports = {
  addLog,
  clearLog,
}
