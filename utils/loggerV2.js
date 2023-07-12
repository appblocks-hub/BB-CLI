/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const path = require('path')
const { createLogger, transports, config, format } = require('winston')
const curlirize = require('./curlirize/main')
const { axios } = require('./axiosInstances')
const { BB_FOLDERS,  getSystemTempFolderPath } = require('./bbFolders')

/**
 *
 * @param {Array<string>} level
 * @returns
 */
const levelFilter = (levels) => format((info) => (levels.includes(info.level) ? info : false))()

const myFormat = format.printf(({ level, message, label, timestamp }) => `${timestamp} [${label}] ${level}: ${message}`)
class Logger {
  constructor(service) {
    this.service = service

    const cliRunTimeLogsPath = getSystemTempFolderPath(BB_FOLDERS.RUN_TIME_LOGS)

    this.logger = createLogger({
      defaultMeta: { service },
      level: 'debug',
      levels: config.syslog.levels,
      transports: [
        new transports.File({
          filename: path.join(cliRunTimeLogsPath, 'error.log'),
          level: 'error',
        }),
        new transports.File({
          filename: path.join(cliRunTimeLogsPath, 'combined.log'),
          format: format.combine(levelFilter(['warning', 'notice', 'info']), format.json()),
        }),
        new transports.File({
          filename: path.join(cliRunTimeLogsPath, 'debug.log'),
          format: format.combine(levelFilter(['debug']), myFormat),
        }),
      ],
    })
    this.setUpCurlirize()
  }

  curlirizeCallback(curlResult, err) {
    const { command } = curlResult
    if (err) {
      this.logger.debug(err)
    } else {
      this.logger.debug(command)
    }
  }

  setUpCurlirize() {
    if (process.env?.BB_DEBUG) {
      curlirize(axios, this.curlirizeCallback.bind(this))
    }
  }
}

module.exports = { Logger, curlCb: new Logger().curlirizeCallback }
