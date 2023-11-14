/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const GitConfigFactory = require('../../utils/gitManagers/gitConfigFactory')
const { feedback } = require('../../utils/cli-feedback')

const disconnect = async (service) => {
  try {
    const { error, manager } = await GitConfigFactory.init({ gitVendor: service })
    if (error) throw error

    await manager.disconnect()
    feedback({ type: 'success', message: 'User disconnected successfully' })
  } catch (err) {
    feedback({ type: 'error', message: err.message })
  }
}

module.exports = disconnect
