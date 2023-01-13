/* eslint-disable no-param-reassign */
/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const chalk = require('chalk')
const { viewsDeploy, functionsDeploy, createDeployHistory, checkAppEnvExist } = require('../util')
const { readInput } = require('../../../utils/questionPrompts')

const { spinnies } = require('../../../loader')

const abPremDeploy = async ({ argOpitons, deployConfigManager }) => {
  const appData = deployConfigManager.deployAppConfig
  const { releaseVersion, releaseNote } = argOpitons

  const deployableData = Object.values(appData.environments).reduce((acc, envData) => {
    if (envData.uploads) {
      const deployIds = Object.keys(envData.uploads)
      if (deployIds.length) return [...acc, ...deployIds]
    }
    return acc
  }, [])

  if (!deployableData.length) {
    console.log(chalk.red(`No uploads found for deploy\n`))
    process.exit(1)
  }

  const deployId = await readInput({
    type: 'list',
    name: 'deployId',
    message: 'Select the deployment',
    choices: deployableData.map((v) => ({
      name: v,
      value: v,
    })),
    default: deployableData[0],
  })

  const deployType = await readInput({
    type: 'list',
    name: 'deployType',
    message: 'Select the deployment type',
    choices: [
      {
        name: 'Update exitsting deployment',
        value: 0,
      },
      {
        name: 'Clear all and deploy as new',
        value: 1,
      },
    ],
    default: 0,
  })

  // if (!releaseVersion) {
  //   releaseVersion = await readInput({
  //     name: 'releaseVersion',
  //     message: 'Enter the release version',
  //   })
  // }

  // if (!releaseNote) {
  //   releaseNote = await readInput({
  //     name: 'releaseNote',
  //     message: 'Enter the release note',
  //   })
  // }

  try {
    spinnies.add('dep', { text: 'Preparing to deploying' })

    // Check if app and env exist in server
    await checkAppEnvExist(appData, deployId)

    const viewUpdatedAppData = await viewsDeploy({
      appData,
      deployId,
      deployType,
      releaseVersion,
      releaseNote,
    })

    const functionsUpdatedAppData = await functionsDeploy({
      appData: viewUpdatedAppData,
      deployId,
      deployType,
      releaseVersion,
      releaseNote,
    })

    // Create deploy history
    await createDeployHistory({ deployId, releaseNote, tags: '' })

    // Remove deployed
    const updateEnv = Object.entries(functionsUpdatedAppData.environments).reduce((acc, [envName, envData]) => {
      const envUpdate = { ...envData }
      if (envUpdate.uploads?.[deployId]) {
        delete envUpdate.uploads?.[deployId]
      }
      acc[envName] = envUpdate
      return acc
    }, {})

    deployConfigManager.upsertDeployConfig = {
      data: {
        ...functionsUpdatedAppData,
        environments: updateEnv,
      },
    }

    spinnies.succeed('dep', { text: 'Deployed successfully' })
  } catch (err) {
    console.error(err)
    const errMsg = `Deployment failed ${err.message}`
    spinnies.fail('dep', { text: errMsg })
  }
}

module.exports = abPremDeploy
