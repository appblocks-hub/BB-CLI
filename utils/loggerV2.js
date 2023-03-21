/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { createLogger, transports, config, format } = require('winston')
const { shieldHTTP, gitGraphHTTP, gitRestHTTP } = require('./axiosInstances')
const curlirize = require('./curlirize/main')

/**
 *
 * @param {Array<string>} level
 * @returns
 */
const levelFilter = (levels) => format((info) => (levels.includes(info.level) ? info : false))()

class Logger {
  constructor(service) {
    this.service = service
    this.logger = createLogger({
      defaultMeta: { service },
      level: 'debug',
      levels: config.syslog.levels,
      // write all messages with levels in ('error','emerg','crit','alert') to errr.log
      // write all messages with levels in ('warning','notice','info')
      // write all messages with levels 'debug' to debug.log
      transports: [
        new transports.File({
          filename: 'error.log',
          level: 'error',
        }),
        new transports.File({
          filename: 'combined.log',
          format: format.combine(levelFilter(['warning', 'notice', 'info']), format.json()),
        }),
        new transports.File({
          filename: 'debug.log',
          format: format.combine(levelFilter(['debug']), format.json()),
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
      curlirize(shieldHTTP, this.curlirizeCallback)
      curlirize(gitGraphHTTP, this.curlirizeCallback)
      curlirize(gitRestHTTP, this.curlirizeCallback)
    }
  }
}

module.exports = { Logger, curlCb: new Logger().curlirizeCallback }
