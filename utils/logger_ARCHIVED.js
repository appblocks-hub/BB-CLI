/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { createLogger } = require('winston')

const logger = createLogger({
  transports: [
    //    new transports.Console()
    // new transports.File({ filename: 'combined.log' }),
  ],
})
module.exports = { logger }
