/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { createLogger, transports } = require('winston')
const { shieldHTTP, gitHTTP, gitRestHTTP } = require('./axiosInstances')
const curlirize = require('./curlirize/main')

class Logger {
  constructor(service) {
    this.service = service
    this.logger = createLogger({
      defaultMeta: service,
      transports: [
        new transports.File({ filename: 'debug.log', level: 'debug' }),
        new transports.File({ filename: 'combined.log', level: 'warning' }),
        new transports.File({ filename: 'error.log', level: 'emerg' }),
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
      curlirize(gitHTTP, this.curlirizeCallback)
      curlirize(gitRestHTTP, this.curlirizeCallback)
    }
  }
}

module.exports = { Logger, curlCb: new Logger().curlirizeCallback }
