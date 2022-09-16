/* eslint-disable no-promise-executor-return */
/* eslint-disable arrow-body-style */
/* eslint-disable no-async-promise-executor */
/* eslint-disable consistent-return */

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { readFileSync, rm } = require('fs')
const path = require('path')
const chalk = require('chalk')
const { default: axios } = require('axios')
const { getBlockDetails } = require('./registryUtils')
const {
  appRegistryCopyObject,
  appRegistryCreateBucket,
  appRegistryCreateHostDns,
  appRegistryCreateVmInstance,
  appRegistryAddVmEnvUser,
  appRegistryDeployFunctions,
  appRegistryCreateDiployHistory,
  appRegistryCheckAppEnvExist,
} = require('./api')
const { getShieldHeader } = require('./getHeaders')
const { spinnies } = require('../loader')
const deployblockConfigManager = require('./deployConfig-manager')

const getBlockConfig = () => {
  // if no appblock config file found, throw

  try {
    return JSON.parse(readFileSync('appblock.config.json'))
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log(chalk.red(`appblock.config.json missing`))
      process.exit(1)
    }
    console.log('Something went wrong\n')
    console.log(err)
    process.exit(1)
  }
}

const getBlockId = async (blockName) => {
  try {
    const resp = await getBlockDetails(blockName)
    if (resp.status === 204) throw new Error(`${blockName} doesn't exists in block repository`).message

    const { data } = resp
    if (data.err) {
      throw new Error('Something went wrong from our side\n', data.msg).message
    }

    return data.data.ID
  } catch (err) {
    console.log(`Something went wrong while getting details of block:${blockName} -- ${err} `)
    process.exit(1)
  }
}

const getEnvDatas = (appData, deployId, deployType) => {
  return new Promise(async (resolve) => {
    const [envName, envData] = Object.entries(appData.environments).find(([, edata]) => edata.uploads?.[deployId]) || []

    if (!envData) {
      console.log(chalk.red(`\nEnvironment not exist. Please create-env and try again`))
      process.exit(1)
    }

    // Only FE view modules
    const keys = envData.uploads[deployId].reduce((acc, object_key) => {
      if (object_key.includes(deployType)) acc.push(object_key)
      return acc
    }, [])

    resolve({ appData, envData, envName, keys })
  })
}

const viewsDeploy = (options) => {
  return new Promise(async (resolve, reject) => {
    const { appData, deployId } = options

    try {
      const { envData, envName, keys } = await getEnvDatas(appData, deployId, 'view')

      let updateAppData = { ...appData }

      // Return if nothing to deploy for view
      if (!keys.length) return resolve(appData)

      spinnies.add('dep', { text: `Deploying views to ${envName}` })

      const { bucket = envData.frontend_url, host = false, environment_id, frontend_url } = envData

      if (!frontend_url) {
        console.log(chalk.red(`\nIssue with frontend_url. Please check the environment`))
        process.exit(1)
      }

      if (!host) {
        await axios.post(
          appRegistryCreateBucket,
          {
            app_name: appData.app_name,
            environment_name: envName,
            environment_id,
            domain_url: bucket,
          },
          {
            headers: getShieldHeader(),
          }
        )

        await axios.post(
          appRegistryCreateHostDns,
          {
            app_id: appData.app_id,
            environment_id,
            domain_url: frontend_url,
            static_url: true,
          },
          {
            headers: getShieldHeader(),
          }
        )

        updateAppData = {
          ...appData,
          environments: {
            ...appData.environments,
            [envName]: {
              ...appData.environments[envName],
              bucket,
              host: true,
            },
          },
        }
      }

      await axios.post(
        appRegistryCopyObject,
        { keys, bucket: frontend_url, deploy_id: deployId },
        { headers: getShieldHeader() }
      )

      resolve(updateAppData)

      console.log(chalk.green(`Views will be live at https://${frontend_url} in few minutes`))
    } catch (err) {
      reject(err)
    }
  })
}

const functionsDeploy = (options) => {
  return new Promise(async (resolve, reject) => {
    const { appData, deployId, deployType } = options

    try {
      const { envData, envName, keys } = await getEnvDatas(appData, deployId, 'functions')

      // Return if nothing to deploy for functions
      if (!keys.length) return resolve(appData)

      spinnies.add('dep', { text: `Deploying functions to ${envName}` })

      let { vmInstance = false } = appData
      const { vmUser, environment_id, backend_url } = envData
      const updateAppData = { ...appData }

      if (!backend_url) {
        console.log(chalk.red(`\nIssue with backend_url. Please check the environment`))
        process.exit(1)
      }

      let vmExist = vmInstance
      let vmUserExist = vmUser

      if (!vmInstance) {
        const res = await axios.post(
          appRegistryCreateVmInstance,
          {
            app_name: appData.app_name,
            environment_name: envName,
            app_id: appData.app_id,
            environment_id,
            backend_url,
            deploy_type: deployType,
            deploy_id: deployId,
            lang: 'js',
          },
          {
            headers: getShieldHeader(),
          }
        )
        vmExist = res.data.exist

        vmInstance = true
        updateAppData.environments[envName].vmUser = true
      }

      if (!vmUser && vmExist) {
        const vmUserRes = await axios.post(
          appRegistryAddVmEnvUser,
          {
            app_id: appData.app_id,
            environment_name: envName,
            environment_id,
            deploy_type: deployType,
            deploy_id: deployId,
            lang: 'js',
          },
          {
            headers: getShieldHeader(),
          }
        )

        vmUserExist = vmUserRes.data.exist

        updateAppData.environments[envName].vmUser = true
      }

      if (vmExist && vmUserExist) {
        await axios.post(
          appRegistryDeployFunctions,
          {
            app_id: appData.app_id,
            environment_name: envName,
            environment_id,
            deploy_type: deployType,
            deploy_id: deployId,
            lang: 'js',
          },
          {
            headers: getShieldHeader(),
          }
        )
      }

      console.log(chalk.green(`Functions will be live at https://${backend_url} in few minutes`))

      resolve({ ...updateAppData, vmInstance })
    } catch (err) {
      reject(err)
    }
  })
}

const createDeployHistory = (options) => {
  return new Promise(async (resolve, reject) => {
    try {
      const { deployId, releaseNote, tags } = options

      await axios.post(
        appRegistryCreateDiployHistory,
        {
          deploy_id: deployId,
          release_notes: releaseNote,
          tags,
        },
        {
          headers: getShieldHeader(),
        }
      )
      resolve(true)
    } catch (error) {
      reject(error)
    }
  })
}

const checkAppEnvExist = (appData, deployId) => {
  return new Promise(async (resolve) => {
    try {
      spinnies.add('dep', { text: `Checking app details` })
      const envData = Object.values(appData.environments).find((env) => env.uploads?.[deployId])
      const {
        data: { data },
      } = await axios.post(
        `${appRegistryCheckAppEnvExist}`,
        {
          app_id: appData.app_id,
          environment_id: envData.environment_id,
        },
        {
          headers: getShieldHeader(),
        }
      )

      const resData = data

      if (!resData.app_exist || !resData.env_exist) {
        spinnies.fail('dep', { text: ` ${!resData.app_exist ? 'App' : 'Environment'} does not exist` })
        const dpath = path.resolve(deployblockConfigManager.configName)
        rm(dpath, () => {
          process.exit(1)
        })
      }
      resolve(true)
    } catch (error) {
      spinnies.fail('dep', { text: 'Error getting app data' })
      resolve(true)
      process.exit(1)
    }
  })
}

module.exports = {
  viewsDeploy,
  createDeployHistory,
  functionsDeploy,
  getBlockConfig,
  getBlockId,
  checkAppEnvExist,
}

// if (envData.distribution) {
//   console.log('Host update')
//   return
// }

// const createDistributionRes = await axios.post(
//   appRegistryCreateDistribution,
//   {
//     app_id: appData.app_id,
//     environment_id: envData.environment_id,
//   },
//   {
//     headers: getShieldHeader(),
//   }
// )
// console.log(
//   '🚀 ~ file: deployUtil.js ~ line 193 ~ awsDeploy ~ createDistributionRes',
//   createDistributionRes.data
// )

// const setEnvZip = async (enviroment, zipFolder) => {
//   // if no appblock config file found, throw
//   try {
//     const envFiles = {
//       dev: ['.env.functions', '.env.view'],
//       stag: ['.env.functions.stag', '.env.view.stag'],
//       prod: ['.env.functions.prod', '.env.view.prod'],
//     }

//     const envFile = envFiles[enviroment]
//     const zipEnvs = envFile.forEach((acc, f) => {
//       if (!existsSync(`./${f}`)) {
//         console.log(chalk.red(`\nEnviroment ${f} file not found !!!`))
//         process.exit(1)
//       }
//       return `${acc}./${f} `
//     }, '')
//     const zipFile = `${zipFolder}/env.zip`
//     childProcess.execSync(`zip -r ${zipFile} ${zipEnvs}`)

//     return zipFile
//   } catch (err) {
//     console.log('Something went wrong\n')
//     console.log(err)
//     process.exit(1)
//   }
// }
