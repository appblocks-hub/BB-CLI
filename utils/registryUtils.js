/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// const axios = require('axios')
const { axios } = require('./axiosInstances')
const { headLessConfigStore } = require('../configstore')
const {
  appBlockGetBlockDetails,
  appBlockUpdateReadme,
  appBlockGetAppConfig,
  appBlockGetBlockMetadata,
  appBlockGetAllBlockVersions,
  appBlockCreateVariant,
  getBlockFromStore,
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

const getBlockFromStoreFn = async (blockName, spaceName, rootPackageName) => {
  try {
    const { status, data } = await axios.post(
      getBlockFromStore,
      {
        block_name: blockName,
        space_name: spaceName,
        root_package_name: rootPackageName,
      },
      { headers: getShieldHeader() }
    )

    return { status, data: { err: null, data } }
  } catch (err) {
    return { status: 204, data: { err, data: null } }
  }
}

// This api will check the block name against default space_id if space_name is not passed
const getBlockDetails = (componentName) => {
  let [spaceName, blockName] = componentName.split('/')

  spaceName = spaceName.replace('@', '')

  if (!blockName) {
    blockName = spaceName
    spaceName = headLessConfigStore().get('currentSpaceName')
  }

  return axios.post(
    appBlockGetBlockDetails,
    {
      block_name: blockName,
      space_name: spaceName,
    },
    { headers: getShieldHeader() }
  )
}

// This api will check the block name against default space_id if space_name is not passed
const getBlockDetailsV2 = ({ spaceName, blockName, blockVersion, rootPackageName }) => {
  const postData = {
    block_name: blockName,
    space_name: spaceName,
  }

  if (rootPackageName) postData.root_package_name = rootPackageName
  if (blockVersion) postData.block_version = blockVersion

  return axios.post(appBlockGetBlockDetails, postData, { headers: getShieldHeader() })
}

const getBlockMetaData = (block_id, space_name) => {
  const postData = { block_id }
  if (space_name) postData.space_name = space_name
  return axios.post(appBlockGetBlockMetadata, postData, { headers: getShieldHeader() })
}

const updateReadme = (blockId, blockVersionId, key) =>
  axios.post(
    appBlockUpdateReadme,
    {
      block_version_id: blockVersionId,
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
 * @returns {Promise<import('./jsDoc/types').blockMetaData?>}
 */
async function getConfigFromRegistry(id) {
  try {
    const res = await getAppConfigFromRegistry(id)
    if (res.status === 204) {
      // console.log(`No appconfig found in registry.`)
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
  getBlockFromStoreFn,
  getBlockDetailsV2,
}
