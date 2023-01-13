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

const provisionApp = async (appId) => {
  deployConfig.init()
  const appConfig = await deployConfig.deployAppConfig

  if (appConfig?.app_id) {
    console.log(`${appConfig.app_name} app already exist`)
    process.exit(1)
  }

  try {
    spinnies.add('pa', { text: 'Provisioning app ' })
    const registerAppRes = await axios.post(
      appRegistryProvisionApp,
      { app_id: appId },
      {
        headers: getShieldHeader(),
      }
    )
    console.log('data - ', registerAppRes.data)
    const { data } = registerAppRes.config

    const { app_details, env_details, vm_info_id } = data

    let environments = {}

    if (env_details?.length) {
      environments = env_details.reduce((acc, env) => {
        let backend_url
        let frontend_url
        env.domain.forEach((d) => {
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

    const appData = {
      ...app_details,
      environments,
      vmInstance: !!vm_info_id,
    }
    deployConfig.createDeployConfig = appData

    spinnies.succeed('pa', { text: 'App provision success' })
  } catch (err) {
    spinnies.fail('pa', { text: err.message })
    console.log(err.message || err)
  }
}

module.exports = provisionApp
