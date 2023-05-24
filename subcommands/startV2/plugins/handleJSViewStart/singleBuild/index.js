/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const path = require('path')
const chalk = require('chalk')
const { runBash } = require('../../../../bash')
const { startJsProgram } = require('../utils')
const generateElementsEmulator = require('./generateElementsEmulator')
const { mergeDatas } = require('./mergeDatas')
const { emulateElements, stopEmulatedElements, packageInstall } = require('./util')
const { spinnies } = require('../../../../../loader')

const singleBuild = async ({ core, ports, blocks, buildOnly = false, env }) => {
  const relativePath = path.resolve()

  try {
    spinnies.add('singleBuild', { text: `Preparing blocks for single build` })

    let { elementsBlocks, containerBlocks, depLibBlocks } = blocks || {}

    if (!blocks) {
      const viewBlocks = [...(await core.packageConfigManger.uiBlocks())]
      elementsBlocks = viewBlocks.filter(({ meta }) => meta.type === 'ui-elements')
      depLibBlocks = viewBlocks.filter(({ meta }) => meta.type === 'ui-dep-lib')
      containerBlocks = viewBlocks.filter(({ meta }) => meta.type === 'ui-container')
    }

    if (!elementsBlocks?.length) return { error: `No element blocks found` }
    if (!containerBlocks) return { error: `No container block found` }

    const containerBlock = containerBlocks[0]
    if (containerBlocks.length > 1) {
      console.log(
        chalk.yellow(`Found multiple container blocks, Continuing with ${containerBlock.config.name} container`)
      )
    }

    const depLib = depLibBlocks[0]
    if (depLibBlocks.length > 1) {
      console.log(
        chalk.yellow(`Found multiple dependency library blocks, Continuing with ${depLib.config.name} container`)
      )
    }

    const emElPort = ports?.emElements[0] || 4200
    const containerPort = ports?.container[0] || 3000

    const emEleFolderName = '._ab_em_elements'
    const emEleFolder = path.join(relativePath, emEleFolderName)

    spinnies.update('singleBuild', { text: `Generating elements emulator` })
    await generateElementsEmulator(emEleFolder, { emPort: emElPort, depLib })

    spinnies.update('singleBuild', { text: `Merging elements` })
    const errorBlocks = await mergeDatas(elementsBlocks, emEleFolder, depLib, env)

    await packageInstall(emEleFolder, elementsBlocks)

    if (buildOnly) {
      const bashRes = await runBash(`npm run build`, emEleFolder)
      if (bashRes.status !== 'success') {
        spinnies.succeed('singleBuild', { text: `Error in build: ${bashRes.msg}` })
        return { error: bashRes.msg }
      }

      spinnies.succeed('singleBuild', { text: `Elements build success` })
      return {
        elementsBuildFolder: path.join(emEleFolder, 'dist'),
        emEleFolder,
        containerBlock,
      }
    }

    spinnies.update('singleBuild', { text: `Starting elements emulator` })
    const emData = await emulateElements(emEleFolder, emElPort)

    if (emData.exitCode === null) {
      elementsBlocks.forEach((blockManager) => {
        if (errorBlocks.includes(blockManager.config.name)) return
        blockManager.updateLiveConfig({
          pid: emData.pid || null,
          isOn: true,
          singleBuild: true,
          port: emElPort || null,
          log: {
            out: `./logs/out/elements.log`,
            err: `./logs/err/elements.log`,
          },
        })
      })
    } else {
      spinnies.fail('singleBuild', { text: `Error in single build process. Please check logs` })
      process.exit(1)
    }

    let sMsg = `Elements emulated at http://localhost:${emElPort}/remoteEntry.js`
    if (errorBlocks?.length > 0) sMsg += ` with above errors`

    spinnies.succeed('singleBuild', { text: sMsg })

    const containerProcessData = await startJsProgram(core, containerBlock, containerPort)
    return { emData, containerProcessData, errorBlocks }
  } catch (error) {
    await stopEmulatedElements({ rootPath: relativePath })

    spinnies.add('singleBuild', { text: error.message })
    spinnies.fail('singleBuild', { text: error.message })

    throw error
  }
}

module.exports = singleBuild
