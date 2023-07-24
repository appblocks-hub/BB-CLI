
/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const chalk = require('chalk')
const GitConfigFactory = require('../utils/gitManagers/gitConfigFactory')

const connect = async (service, options) => {
  try {
    const { error, manager } = await GitConfigFactory.init({ gitVendor: service })
    if (error) throw error

    await manager.login(options)
  } catch (err) {
    console.log(chalk.red(err.message))
  }
}

module.exports = connect
