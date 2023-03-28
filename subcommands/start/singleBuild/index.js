/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { existsSync, rmSync } = require('fs')
const path = require('path')
const { runBash } = require('../../bash')
const { startBlock } = require('../util')
const generateElementsEmulator = require('./generateElementsEmulator')
const { mergeDatas } = require('./mergeDatas')
const { emulateElements, stopEmulatedElements, packageInstall } = require('./util')
const { spinnies } = require('../../../loader')

const singleBuild = async ({ appConfig, ports, buildOnly = false }) => {
  const relativePath = path.resolve()

  try {
    spinnies.add('singleBuild', { text: `Preparing blocks for single build` })

    const viewBlocks = [...appConfig.uiBlocks]
    const elementBlocks = viewBlocks.filter(({ meta }) => meta.type === 'ui-elements')
    const depLib = viewBlocks.filter(({ meta }) => meta.type === 'ui-dep-lib')[0]
    const containerBlock = viewBlocks.filter(({ meta }) => meta.type === 'ui-container')[0]

    if (!elementBlocks?.length) return `No element blocks found`
    if (!containerBlock) return `No container block found`

    const emElPort = ports?.emElements[0] || 4200
    const containerPort = ports?.container[0] || 3000

    const emEleFolderName = '._ab_em_elements'
    const emEleFolder = path.join(relativePath, emEleFolderName)

    if (existsSync(emEleFolder)) rmSync(emEleFolder, { recursive: true, force: true })

    spinnies.update('singleBuild', { text: `Generating elements emulator` })
    await generateElementsEmulator(emEleFolder, { emPort: emElPort, depLib })

    spinnies.update('singleBuild', { text: `Merging elements` })
    const errorBlocks = await mergeDatas(elementBlocks, emEleFolder, depLib)

    spinnies.update('singleBuild', { text: `Installing dependencies for elements emulator` })
    await packageInstall(emEleFolder, elementBlocks)

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
      elementBlocks.forEach((bk) => {
        if (errorBlocks.includes(bk.meta.name)) return
        // eslint-disable-next-line no-param-reassign
        appConfig.startedBlock = {
          name: bk.meta.name,
          pid: emData.pid || null,
          isOn: true,
          singleBuild: true,
          port: emElPort || null,
          log: {
            out: `./logs/out/elements.log`,
            err: `./logs/err/elements.log`,
          },
        }
      })
    } else {
      spinnies.fail('singleBuild', { text: `Error in single build process. Please check logs` })
      process.exit(1)
    }

    let sMsg = `Elements emulated at http://localhost:${emElPort}/remoteEntry.js`
    if (errorBlocks?.length > 0) sMsg += ` with above errors`

    spinnies.succeed('singleBuild', { text: sMsg })

    const containerProcessData = await startBlock(containerBlock.meta.name, containerPort)
    return { emData, containerProcessData, errorBlocks }
  } catch (error) {
    await stopEmulatedElements({ rootPath: relativePath })

    spinnies.add('singleBuild', { text: error.message })
    spinnies.fail('singleBuild', { text: error.message })

    throw error
  }
}

module.exports = singleBuild
