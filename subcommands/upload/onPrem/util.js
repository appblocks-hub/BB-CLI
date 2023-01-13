/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
const deployblockConfigManager = require('../../deploy/manager')

const getExistingOPDDetails = async ({ appId, envId }) => {
  const deployedContent = await deployblockConfigManager.readOnPremDeployedConfig()
  return Object.fromEntries(Object.entries(deployedContent).filter((e) => e.appId === appId && e.envId === envId))
}

const saveOPDData = async ({ saveData }) => {
  const existingData = getExistingOPDDetails({})
  existingData[saveData.name] = saveData
  await deployblockConfigManager.writeOnPremDeployedConfig()
}

module.exports = { getExistingOPDDetails, saveOPDData }
