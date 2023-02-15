/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable camelcase */
const { default: axios } = require('axios')
const { appRegistryProvisionApp } = require('../utils/api')
const { getShieldHeader } = require('../utils/getHeaders')
const deployConfig = require('./deploy/manager')
const { spinnies } = require('../loader')
const { appConfig } = require('../utils/appconfigStore')

const provisionApp = async (appId) => {
  await appConfig.init()
  await deployConfig.init()

  if (deployConfig.deployAppConfig?.app_id) {
    console.log(`${deployConfig.deployAppConfig.app_name} app already exist`)
    process.exit(1)
  }

  spinnies.add('pa', { text: 'Provisioning app ' })

  try {
    const registerAppRes = await axios.post(
      appRegistryProvisionApp,
      {
        app_id: appId,
        package_block_id: appConfig.packageBlockId,
      },
      {
        headers: getShieldHeader(),
      }
    )

    if (!registerAppRes?.data?.data) {
      throw new Error(`Error getting app details`)
    }

    const { app_id, app_name, env_details, vm_info_id } = registerAppRes.data.data

    let environments = {}

    if (env_details?.length) {
      environments = env_details.reduce((acc, env) => {
        let backend_url
        let frontend_url
        env.domain?.forEach((d) => {
          if (d.type === 0) frontend_url = d.url
          else backend_url = d.url
        })

        // const uploads = env.uploads.reduce((ac, u) => ({ ...ac, [u.id]: [] }), {})

        return {
          ...acc,
          [env.name]: {
            environment_id: env.id,
            backend_url,
            frontend_url,
            // uploads,
            vmUser: !!env.vmUser,
          },
        }
      }, {})
    }

    const appData = { app_id, app_name, environments, vmInstance: !!vm_info_id }
    deployConfig.createDeployConfig = appData

    spinnies.succeed('pa', { text: 'App provision success' })
  } catch (err) {
    const errMsg = err.response?.data?.msg || err.message
    spinnies.fail('pa', { text: errMsg })
  }
}

module.exports = provisionApp
