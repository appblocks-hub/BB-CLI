/* eslint-disable no-param-reassign */
/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const path = require('path')
const chalk = require('chalk')
const { rmSync, existsSync, cpSync, symlinkSync } = require('fs')
const { runBash } = require('../../../../bash')
const { startJsProgram } = require('../utils')
const generateElementsEmulator = require('./generateElementsEmulator')
const { mergeDatas } = require('./mergeDatas')
const { emulateElements, stopEmulatedElements, packageInstall, buildBlock } = require('./util')
const { upsertEnv } = require('../../../../../utils/envManager')
const { BB_FOLDERS, getBBFolderPath } = require('../../../../../utils/bbFolders')

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

    if (!core.cmdOpts?.subContainer) {
      for (const block of containerBlocks) {
        if (path.dirname(block.directory) !== path.resolve()) continue
        containerBlocks = [block]
      }
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

    const packageEnvPrefix = core.packageManager.config.name.toUpperCase()
    const envPrefixes = [packageEnvPrefix]

    let emData = {}
    let errorBlocks = []
    if (elementsBlocks?.length) {
      const emElPort = ports?.emElements[0]

      const envUpdateData = {
        [`BB_${packageEnvPrefix}_ELEMENTS_URL`]: `http://localhost:${emElPort}/remoteEntry.js`,
        // [`BB_${packageEnvPrefix}_DEP_LIB_URL`]: `http://localhost:${emElPort}/remoteEntry.js`,
      }

      for (const { packageManager } of core.subPackages) {
        const pkEnvPrefix = packageManager.config.name.toUpperCase()
        envPrefixes.push(pkEnvPrefix)
        // const relPath = path.relative(path.resolve(), pack.directory)
        envUpdateData[`BB_${pkEnvPrefix}_ELEMENTS_URL`] = `http://localhost:${emElPort}/remoteEntry.js`
        // envUpdateData[`BB_${pkEnvPrefix}_DEP_LIB_URL`] = `http://localhost:${emElPort}/remoteEntry.js`
      }

      for (const block of containerBlocks) {
        const containerUrl = `http://localhost:${block.availablePort}`
        if (path.dirname(block.directory) !== path.resolve()) {
          const { err, data } = await block.findMyParentPackage()
          if (err) console.log(chalk.dim(`Error getting parent package of block ${block.config.name}`))
          else {
            const subPackageName = data.parentPackageConfig.name.toUpperCase()
            envUpdateData[`BB_${subPackageName}_CONTAINER_URL`] = containerUrl
          }
        } else {
          envUpdateData[`BB_${packageEnvPrefix}_CONTAINER_URL`] = containerUrl
        }
      }

      const updatedEnv = await upsertEnv('view', envUpdateData, env, envPrefixes)

      core.envWarning.keys = core.envWarning.keys.concat(updatedEnv.envWarning.keys)
      core.envWarning.prefixes = core.envWarning.prefixes.concat(updatedEnv.envWarning.prefixes)

      const emEleFolder = getBBFolderPath(BB_FOLDERS.ELEMENTS_EMULATOR, relativePath)

      if (core.cmdOpts?.force) {
        if (existsSync(emEleFolder)) rmSync(emEleFolder, { recursive: true })
      }

      core.spinnies.update('singleBuild', { text: `Generating elements emulator` })
      await generateElementsEmulator(emEleFolder, { emPort: emElPort, depLib })

      if (updatedEnv?.envString) {
        try {
          let viewEnvPath = path.join(path.resolve(), `.env.view`)
          if (env && existsSync(path.join(viewEnvPath, env))) viewEnvPath = path.join(viewEnvPath, env)
          symlinkSync(viewEnvPath, path.join(emEleFolder, '.env'))
          for (const block of containerBlocks) {
            symlinkSync(viewEnvPath, path.join(emEleFolder, block.directory, '.env'))
          }
        } catch (error) {
          if (error.code !== 'EEXIST') throw error
        }
      }

      core.spinnies.update('singleBuild', { text: `Merging elements` })
      errorBlocks = await mergeDatas(elementsBlocks, emEleFolder, depLib, env)

      await packageInstall(emEleFolder, elementsBlocks)

      if (buildOnly) {
        const bashRes = await runBash(`npm run build`, emEleFolder)
        if (bashRes.status !== 'success') {
          core.spinnies.fail('singleBuild', { text: `Error in build: ${bashRes.msg}` })
          return { error: bashRes.msg }
        }

        core.spinnies.succeed('singleBuild', { text: `Elements build success` })

        const containerBuildData = []
        for (const block of containerBlocks) {
          core.spinnies.add('containerBuild', { text: `Building  ${block.config.name} container` })
          const { blockBuildFolder, error } = await buildBlock(block, {}, env)
          if (error) {
            core.spinnies.fail('containerBuild', { text: `${block.config.name} build failed` })
            return { error }
          }
          if (block.config.id === containerBlocks[0].config.id) {
            cpSync(path.join(blockBuildFolder), getBBFolderPath(BB_FOLDERS.CONTAINER_BUILD, relativePath), {
              recursive: true,
            })
          }
          containerBuildData.push({ blockBuildFolder, error })
          core.spinnies.succeed('containerBuild', { text: `${block.config.name} container build success` })
        }

        return {
          elementsBuildFolder: path.join(emEleFolder, 'dist'),
          emEleFolder,
          containerBlocks,
          containerBuildData,
        }
      }

      core.spinnies.update('singleBuild', { text: `Starting elements emulator` })
      await elementsBlocks[0]?.portKey?.abort()
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
    for (const block of containerBlocks) {
      await block.portKey?.abort()
      containerProcessData = await startJsProgram(core, block, block.availablePort)
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
