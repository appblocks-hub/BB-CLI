/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const path = require('path')
const chalk = require('chalk')
const { writeFileSync } = require('fs')
const { runBash } = require('../../../../bash')
const { startJsProgram } = require('../utils')
const generateElementsEmulator = require('./generateElementsEmulator')
const { mergeDatas } = require('./mergeDatas')
const { emulateElements, stopEmulatedElements, packageInstall } = require('./util')
const { upsertEnv } = require('../../../../../utils/envManager')

const singleBuild = async ({ core, ports, blocks, buildOnly = false, env }) => {
  const relativePath = path.resolve()

  try {
    core.spinnies.add('singleBuild', { text: `Preparing blocks for single build` })

    let { elementsBlocks, containerBlocks, depLibBlocks } = blocks || {}

    if (!blocks) {
      const viewBlocks = [...(await core.packageManager.uiBlocks())]
      elementsBlocks = viewBlocks.filter(({ meta }) => meta.type === 'ui-elements')
      depLibBlocks = viewBlocks.filter(({ meta }) => meta.type === 'ui-dep-lib')
      containerBlocks = viewBlocks.filter(({ meta }) => meta.type === 'ui-container')
    }

    let containerBlock = containerBlocks[0]
    for (const block of containerBlocks) {
      if (path.dirname(block.directory) !== path.resolve()) continue
      containerBlock = block
    }

    if (containerBlocks.length > 1) {
      console.log(chalk.yellow(`Found multiple container blocks, Continuing with ${containerBlock.config.name} block`))
    }

    let depLib = depLibBlocks[0]
    for (const block of depLibBlocks) {
      if (path.dirname(block.directory) !== path.resolve()) continue
      depLib = block
    }
    if (depLibBlocks.length > 1) {
      console.log(
        chalk.yellow(`Found multiple dependency library blocks, Continuing with ${depLib.config.name} container`)
      )
    }

    const containerPort = ports?.container[0]
    let emData = {}
    let errorBlocks = []
    if (elementsBlocks?.length) {
      const emElPort = ports?.emElements[0]

      const rootPackageName = core.packageConfig.name.toUpperCase()
      const updatedEnv = await upsertEnv(
        'view',
        {
          [`BB_CONTAINER_URL`]: `http://localhost:${containerPort}/remoteEntry.js`,
          [`BB_ELEMENTS_URL`]: `http://localhost:${emElPort}/remoteEntry.js`,
          [`BB_DEP_LIB_URL`]: `http://localhost:${emElPort}/remoteEntry.js`,
        },
        env,
        rootPackageName
      )

      const emEleFolderName = '._ab_em_elements'
      const emEleFolder = path.join(relativePath, emEleFolderName)

      core.spinnies.update('singleBuild', { text: `Generating elements emulator` })
      await generateElementsEmulator(emEleFolder, { emPort: emElPort, depLib })

      if (updatedEnv?.envString) {
        writeFileSync(path.join(emEleFolder, '.env'), updatedEnv.envString)
        writeFileSync(path.join(containerBlock.directory, '.env'), updatedEnv.envString)
      }

      core.spinnies.update('singleBuild', { text: `Merging elements` })
      errorBlocks = await mergeDatas(elementsBlocks, emEleFolder, depLib, env)

      await packageInstall(emEleFolder, elementsBlocks)

      if (buildOnly) {
        const bashRes = await runBash(`npm run build`, emEleFolder)
        if (bashRes.status !== 'success') {
          core.spinnies.succeed('singleBuild', { text: `Error in build: ${bashRes.msg}` })
          return { error: bashRes.msg }
        }

        core.spinnies.succeed('singleBuild', { text: `Elements build success` })
        return {
          elementsBuildFolder: path.join(emEleFolder, 'dist'),
          emEleFolder,
          containerBlock,
        }
      }

      core.spinnies.update('singleBuild', { text: `Starting elements emulator` })
      emData = await emulateElements(emEleFolder, emElPort)

      if (emData.exitCode === null) {
        elementsBlocks.forEach((blockManager) => {
          if (errorBlocks.includes(blockManager.config.name)) return
          blockManager.updateLiveConfig({
            isOn: true,
            singleInstance: true,
            pid: emData.pid || null,
            port: emElPort || null,
            log: emData.logPaths,
          })
        })
      } else {
        core.spinnies.fail('singleBuild', { text: `Error in single build process. Please check logs` })
        throw new Error('Error in single build process. Please check logs')
      }

      let sMsg = `Elements emulated at http://localhost:${emElPort}/remoteEntry.js`
      if (errorBlocks?.length > 0) sMsg += ` with above errors`

      core.spinnies.succeed('singleBuild', { text: sMsg })
    }

    let containerProcessData = {}
    if (containerBlock) {
      containerProcessData = await startJsProgram(core, containerBlock, containerPort)
    }

    return { emData, containerProcessData, errorBlocks }
  } catch (error) {
    await stopEmulatedElements({ rootPath: relativePath })

    core.spinnies.add('singleBuild', { text: error.message })
    core.spinnies.fail('singleBuild', { text: error.message })

    throw error
  }
}

module.exports = singleBuild
