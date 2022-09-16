/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const axios = require('axios')
const { appBlockGetBlockDetails, appBlockUpdateReadme, appBlockGetAppConfig } = require('./api')
const { getShieldHeader } = require('./getHeaders')

const headers = getShieldHeader()

// TODO -- use this in pull also
const getBlockDetails = (componentName) =>
  axios.post(
    appBlockGetBlockDetails,
    {
      block_name: componentName,
    },
    { headers }
  )

const updateReadme = (blockId, key, visibility) =>
  axios.post(
    appBlockUpdateReadme,
    {
      block_id: blockId,
      readme_url: key,
      visibility,
    },
    { headers }
  )

const getAppConfigFromRegistry = (id) => axios.post(appBlockGetAppConfig, { block_id: id }, { headers })

module.exports = {
  getBlockDetails,
  updateReadme,
  getAppConfigFromRegistry,
}
