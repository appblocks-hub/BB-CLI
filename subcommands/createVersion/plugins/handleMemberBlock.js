/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */

const semver = require('semver')
const { spinnies } = require('../../../loader')
const { ensureReadMeIsPresent } = require('../../../utils/fileAndFolderHelpers')
const { isCleanBlock } = require('../../../utils/gitCheckUtils')
const { readInput } = require('../../../utils/questionPrompts')
const { checkLangDepSupport } = require('../utils')
const { getAllBlockVersions } = require('../../../utils/registryUtils')
const BlockConfigManager = require('../../../utils/configManagers/blockConfigManager')

class HandleMemberBlock {
  /**
   *
   * @param {CreateVersionCore} core
   */
  apply(createVersionCore) {
    createVersionCore.hooks.beforeCreateVersion.tapPromise('HandleMemberBlock', async (core) => {
      const { manager, cmdOpts } = core
      if (!(manager instanceof BlockConfigManager)) return

      const blockManager = manager
      const blockConfig = manager.config

      const { name: blockName, supportedAppblockVersions, blockId } = blockConfig
      // const { repoType, name: blockName, supportedAppblockVersions, blockId, orphanBranchFolder } = blockConfig
      const { force, version: passedVersion, versionNote: passedVersionNote } = cmdOpts || {}

      spinnies.add('bv', { text: `Checking block versions` })
      const bkVersions = await getAllBlockVersions(blockId)
      spinnies.remove('bv')
      const latestVersion = bkVersions.data?.data?.[0]?.version_number
      if (latestVersion) console.log(`Latest created version is ${latestVersion}`)

      isCleanBlock(blockManager.directory, blockName)

      // ------------------------------------------ //
      const [readmePath] = ensureReadMeIsPresent(blockManager.directory, blockName, false)
      if (!readmePath) throw new Error('Make sure to add a README.md ')

      if (!blockId) {
        throw new Error('No blockId found in config! Make sure block is synced')
      }

      // check for abVersion langVersion Dependencies support for block
      let appblockVersionIds

      if (!supportedAppblockVersions) {
        throw new Error(`Please set appblock version and try again`)
      }

      // ========= check language & dependencies support ========================
      await checkLangDepSupport({ force, blockManager, appblockVersionIds, supportedAppblockVersions })

      spinnies.stopAll()
      const version =
        passedVersion ||
        (await readInput({
          name: 'version',
          message: 'Enter the version',
          validate: (ans) => {
            if (!semver.valid(ans)) return 'Invalid version! Please use semantic versioning (major.minor.patch)'
            if (latestVersion && semver.lt(semver.clean(ans), semver.clean(latestVersion))) {
              return `Last created version is ${latestVersion}`
            }
            return true
          },
          default: latestVersion ? semver.inc(latestVersion, 'patch') : '0.0.1',
        }))

      if (!semver.valid(version)) {
        throw new Error('Invalid version! Please use semantic versioning (major.minor.patch)')
      }

      const versionNote =
        passedVersionNote ||
        (await readInput({
          name: 'versionNote',
          message: 'Enter the version note (defaults to empty)',
        }))

      core.versionData = {
        version,
        versionNote,
      }

      const blockConfigData = { ...blockConfig }
      delete blockConfigData.orphanBranchFolder
      delete blockConfigData.workSpaceFolder

      // Update source code to appblock cloud
      spinnies.add('cv', { text: `Registering new version ${version}` })

      core.createVersionData = {
        block_id: blockId,
        version_no: semver.parse(version).version,
        status: 1,
        release_notes: versionNote,
        app_config: blockConfigData,
        parent_block_ids: blockConfigData.parentBlockIDs || [],
      }

      if (supportedAppblockVersions && appblockVersionIds?.length < 1) {
        core.createVersionData.appblock_versions = supportedAppblockVersions
        delete core.createVersionData.appblock_version_ids
      }
    })
  }
}

module.exports = HandleMemberBlock
