/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable */

const viewsDeploy = jest.fn()
const getEnvDatas = jest.fn()
const createDeployHistory = jest.fn()
const functionsDeploy = jest.fn()
const getBlockConfig = jest.fn()
const getBlockId = jest.fn()
const checkAppEnvExist = jest.fn()

module.exports = {
  viewsDeploy,
  getEnvDatas,
  createDeployHistory,
  functionsDeploy,
  getBlockConfig,
  getBlockId,
  checkAppEnvExist,
}
