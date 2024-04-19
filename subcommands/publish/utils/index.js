const { execSync } = require('child_process')
const { mkdirSync, existsSync } = require('fs')
const path = require('path')
const { spinnies } = require('../../../loader')
const { listAppblockVersions } = require('../../../utils/api')
const { post } = require('../../../utils/axios')
const { isClean, getLatestVersion } = require('../../../utils/gitCheckUtils')
const { readInput } = require('../../../utils/questionPrompts')
const { getAllBlockVersions } = require('../../../utils/registryUtils')
const { getBBFolderPath, BB_FOLDERS, BB_FILES } = require('../../../utils/bbFolders')
const PackageConfigManager = require('../../../utils/configManagers/packageConfigManager')
const ContainerizedPackageConfigManager = require('../../../utils/configManagers/containerizedPackageConfigManager')

const getPublishedVersion = (name, directory) => {
  try {
    if (!isClean(directory))
      return {
        success: false,
        msg: `Has uncommitted changes -> directory ${directory} `,
      }
    const latestVersion = getLatestVersion(directory)
    return { success: true, latestVersion }
  } catch (error) {
    return { success: false, msg: `${error.message} -> block ${name} ` }
  }
}

const createZip = async ({ blockName, directory, version, excludePaths = [], rootDir }) => {
  try {
    const dir = `${directory}`
    const rootDirectory = rootDir || path.resolve('.')
    const bbTempPath = getBBFolderPath(BB_FOLDERS.TEMP, rootDirectory)
    const ZIP_TEMP_FOLDER = path.join(bbTempPath, BB_FILES.UPLOAD, blockName || '')

    const EXCLUDE_IN_ZIP = [
      'node_modules/*',
      '.git/*',
      '**/node_modules/*',
      '**/.git/*',
      '.env*',
      ...excludePaths,
    ].reduce((acc, ele) => `${acc} -x '${ele}'`)

    if (!existsSync(ZIP_TEMP_FOLDER)) mkdirSync(ZIP_TEMP_FOLDER, { recursive: true })

    const zipFile = path.join(ZIP_TEMP_FOLDER, `${version}.zip`)

    execSync(`cd ${dir} && zip -r ${zipFile} . ${EXCLUDE_IN_ZIP}`)

    return zipFile
  } catch (error) {
    error.type = 'CREATE_ZIP'
    throw error
  }
}

const getAllAppblockVersions = async (options) => {
  const { data, error } = await post(listAppblockVersions, options || {})

  if (error) throw new Error(error)

  return data
}

const getAppblockVersionData = async () => {
  /**
   * For headless CLI operation
   */
  // console.log(typeof process.env.BB_CLI_RUN_HEADLESS)
  if (process.env.BB_CLI_RUN_HEADLESS === 'true') {
    return { appblockVersions: global.HEADLESS_CONFIGS.appblockVersion }
  }
  spinnies.add('abVersion', { text: `Getting appblock versions` })
  const abVersions = await getAllAppblockVersions()
  spinnies.remove('abVersion')

  const choices = abVersions.data?.map(({ version, id }) => ({
    name: version,
    value: { id, version },
  }))

  if (!choices) {
    throw new Error('Error getting appblocks versions')
  }

  const appblockVersions = await readInput({
    type: 'checkbox',
    name: 'abVersions',
    message: 'Select the appblock version',
    choices,
    validate: (input) => {
      if (!input || input?.length < 1) return `Please add a appblock version`
      return true
    },
  })
  return { appblockVersions }
}

const getBlockVersions = async (blockId, version) => {
  spinnies.add('bv', { text: `Getting block versions` })
  const { data } = await getAllBlockVersions(blockId, {
    status: [1],
  })
  spinnies.remove('bv')

  const blockVersions = data?.data || []

  if (blockVersions.length < 1) {
    throw new Error('No unreleased block versions found. Please create version and try again.')
  }

  let versionData
  if (version) {
    versionData = blockVersions.find((v) => v.version_number === version)
    if (!versionData) throw new Error(`No unreleased version found for ${version}`)
  } else {
    versionData = await readInput({
      name: 'versionData',
      type: 'list',
      message: 'Select a version to publish',
      choices: blockVersions.map((v) => ({
        name: v.version_number,
        value: v,
      })),
      validate: (ans) => {
        if (!ans) return 'Invalid version'
        return true
      },
    })
  }

  return versionData
}

const buildBlockTypesMap = async (options) => {
  const { packageManager, blockTypesMap } = options

  const packageConfig = packageManager.config

  if (!(packageManager instanceof PackageConfigManager || packageManager instanceof ContainerizedPackageConfigManager)) {
    throw new Error('Error parsing package block')
  }

  if (!blockTypesMap[packageConfig.type]) {
    blockTypesMap[packageConfig.type] = true
  }

  if (packageConfig.type !== 'containerized')
    for await (const blockManager of packageManager.getDependencies()) {
      if (!blockManager?.config) continue

      // copying package config parent block name for transferring to the next package block
      const currentConfig = blockManager.config

      if (currentConfig.type === 'package') {
        await buildBlockTypesMap({
          packageManager: blockManager,
          blockTypesMap,
        })
      } else {
        // eslint-disable-next-line no-lonely-if
        if (!blockTypesMap[currentConfig.type]) {
          blockTypesMap[currentConfig.type] = true
        }
      }
    }
}

module.exports = {
  getPublishedVersion,
  createZip,
  getAppblockVersionData,
  getAllAppblockVersions,
  getBlockVersions,
  buildBlockTypesMap,
}
