/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const axios = require('axios')
const {
  appBlockGetBlockDetails,
  appBlockUpdateReadme,
  appBlockGetAppConfig,
  appBlockGetBlockMetadata,
  appBlockGetAllBlockVersions,
  appBlockCreateVariant,
} = require('./api')
const { getShieldHeader } = require('./getHeaders')

const getAllBlockVersions = (block_id, otpions = {}) =>
  axios.post(
    appBlockGetAllBlockVersions,
    {
      page_limit: 20,
      offset: 0,
      block_id,
      ...otpions,
    },
    { headers: getShieldHeader() }
  )

const addANewBlockVariant = ({ block_id, parent_id, version_id }) =>
  axios.post(
    appBlockCreateVariant,
    {
      block_id,
      parent_id,
      version_id,
    },
    { headers: getShieldHeader() }
  )

const getBlockDetails = (componentName) =>
  axios.post(
    appBlockGetBlockDetails,
    {
      block_name: componentName,
    },
    { headers: getShieldHeader() }
  )

const getBlockMetaData = (block_id) =>
  axios.post(
    appBlockGetBlockMetadata,
    {
      block_id,
    },
    { headers: getShieldHeader() }
  )

const updateReadme = (blockId, blockVerionId, key) =>
  axios.post(
    appBlockUpdateReadme,
    {
      block_version_id: blockVerionId,
      block_id: blockId,
      readme_url: key,
    },
    { headers: getShieldHeader() }
  )

const getAppConfigFromRegistry = (id) =>
  axios.post(appBlockGetAppConfig, { block_id: id }, { headers: getShieldHeader() })

/**
 *
 * @param {String} id app id
 * @returns {import('./jsDoc/types').blockMetaData}
 */
async function getConfigFromRegistry(id) {
  try {
    const res = await getAppConfigFromRegistry(id)
    if (res.status === 204) {
      console.log(`No appconfig found in registry.`)
      return null
    }
    if (res.data.err) {
      return null
    }
    return res.data.data.app_config
  } catch (err) {
    return null
  }
}

module.exports = {
  getBlockDetails,
  getBlockMetaData,
  addANewBlockVariant,
  getAllBlockVersions,
  getConfigFromRegistry,
  updateReadme,
  getAppConfigFromRegistry,
}
