/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable */
const config = {
  app_id: 'app_id',
  environments: {
    dev: {
      environment_id: 'environment_id',
      uploads: ['upload_url'],
      backend_url: 'app-dev-functions.Appblocks.com',
      frontend_url: 'app-dev.Appblocks.com',
      uploads: {
        upload_id: ['app-app_id/environment_id/functions/blockId/version/test_block-.zip'],
      },
      bucket: 'app-dev.Appblocks.com',
    },
  },
}

const deployAppConfig = config
const uiBlocks = jest.fn()
const allBlockNames = jest.fn()
const env = jest.fn()
const createDeployConfig = jest.fn()
const init = jest.fn()
const upsertDeployConfig = jest.fn()
const readDeployAppConfig = jest.fn()
const _write = jest.fn()

const mock = {
  deployAppConfig,
  uiBlocks,
  allBlockNames,
  env,
  createDeployConfig,
  init,
  upsertDeployConfig,
  readDeployAppConfig,
  _write,
  config,
}

module.exports = mock
