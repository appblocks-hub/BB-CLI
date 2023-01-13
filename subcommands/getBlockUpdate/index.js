/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { spinnies } = require('../../loader')
const { appConfig } = require('../../utils/appconfigStore')
const { getBlockDetails } = require('../../utils/registryUtils')
const { pullBlockUpdate } = require('./util')

const getBlockUpdate = async (componentName, options, { cwd = '.' }) => {
  spinnies.add('blockExistsCheck', { text: 'Getting block details ' })

  try {
    const {
      status,
      data: { err, msg, data: blockDetails },
    } = await getBlockDetails(componentName)

    if (status === 204) {
      spinnies.fail('blockExistsCheck', { text: `${componentName} doesn't exists in block repository` })
      return
    }
    if (err) {
      throw new Error(msg).message
    }

    await appConfig.init(cwd, null, 'get-update')

    spinnies.remove('blockExistsCheck')

    if (blockDetails.BlockType === 1) {
      throw new Error('Appblock update is not supported')
    }

    if (!appConfig.isInAppblockContext) {
      throw new Error('Need to be inside an Appblock to pull other blocks')
    }

    await pullBlockUpdate({ blockDetails, cwd, appConfig })
  } catch (err) {
    spinnies.add('blockExistsCheck')
    let message = err.message || err

    if (err.response?.status === 401 || err.response?.status === 403) {
      message = `Access denied for block ${componentName}`
    }

    spinnies.fail('blockExistsCheck', { text: message })
    spinnies.remove('blockExistsCheck')
  }
}

module.exports = getBlockUpdate
