/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { default: axios } = require('axios')
const chalk = require('chalk')
const { readInput } = require('../utils/questionPrompts')
const { getShieldHeader } = require('../utils/getHeaders')
const { appRegistryCreateEnv, appRegistryCheckDomainName } = require('../utils/api')

const deployConfig = require('./deploy/manager')
const { spinnies } = require('../loader')

const envCreate = async () => {
  deployConfig.init()
  const appConfig = deployConfig.deployAppConfig

  const appId = appConfig?.app_id
  if (!appId) {
    console.log(chalk.red(`Please create app before upload..\n`))
    process.exit(1)
  }

  const envNames = Object.keys(appConfig.environments)

  const envName = await readInput({
    name: 'envName',
    message: 'Enter the environment name',
    validate: async (ans) => {
      if (envNames.includes(ans)) return `${ans} already  exist`
      return true
    },
  })

  const subDomain = await readInput({
    name: 'subDomain',
    message: 'Enter the environment sub domain',
    validate: async (ans) => {
      try {
        // if (/[a-z\-]+/g.test(ans)) {
        //   return `Should only contain aplha numeric characters, hyphen`
        // }
        const subDomainCheck = await axios.post(
          appRegistryCheckDomainName,
          { sub_domain: ans },
          {
            headers: getShieldHeader(),
          }
        )
        if (subDomainCheck.data?.data?.exists) return `${ans} already taken`
        return true
      } catch (error) {
        console.log(`Error checking domain name exist`, error)
        return `Error checking domain name exist`
      }
    },
    default: `${appConfig.app_name}-${envName}`,
  })

  const createData = {
    app_id: appId,
    sub_domain: subDomain,
    environment_name: envName,
  }

  try {
    spinnies.add('ce', { text: `Creating ${envName} environment..` })

    const createEnvRes = await axios.post(appRegistryCreateEnv, createData, {
      headers: getShieldHeader(),
    })

    const { app_id, ...newEnvData } = createEnvRes.data.data

    deployConfig.upsertDeployConfig = {
      name: 'environments',
      data: { ...appConfig.environments, [envName]: newEnvData },
    }

    spinnies.succeed('ce', {
      text: `Created ${envName} environment successfully`,
    })
  } catch (err) {
    console.log(err.message || err)
    console.log('Something went wrong while creating!')
  }

  // const appConfig = getBlockConfig()
  // const blockId = await getBlockId(appConfig.name)
  // console.log("🚀 ~ file: envCreate.js ~ line 30 ~ envCreate ~ blockId", blockId)
}

module.exports = envCreate
