/* eslint-disable no-param-reassign */
/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/* eslint-disable class-methods-use-this */

const { spinnies } = require('../../../loader')
const { getDependencies, getDependencyIds } = require('../utils/dependencyUtil')
const { getLanguageVersionData } = require('../../../utils/languageVersion')
const { createZip } = require('../utils')
const GitConfigFactory = require('../../../utils/gitManagers/gitConfigFactory')
const BlockConfigManager = require('../../../utils/configManagers/blockConfigManager')

class HandlePublishBlock {
  /**
   *
   * @param {PublishCore} core
   */
  apply(publishCore) {
    publishCore.hooks.beforePublish.tapPromise('HandlePublishBlock', async (core) => {
      const { manager, versionData } = core
      if (!(manager instanceof BlockConfigManager)) return

      const blockManager = manager

      const { name: blockName, supportedAppblockVersions, source, repoType } = blockManager.config
      const version = versionData.version_number

      if (!supportedAppblockVersions) {
        throw new Error(`Please set-appblock-version and try again`)
      }

      let appblockVersionIds

      // ========= languageVersion ========================
      const { languageVersionIds, languageVersions } = await getLanguageVersionData({
        blockDetails: { directory: blockManager.directory, meta: blockManager.config },
        appblockVersionIds,
        supportedAppblockVersions,
        noWarn: true,
      })

      let dependency_ids = []
      const { dependencies } = await getDependencies({
        blockDetails: { directory: blockManager.directory, meta: blockManager.config },
      })
      spinnies.add('p1', { text: `Getting dependency details for version ${version}` })
      // eslint-disable-next-line prefer-const
      const { depIds } = await getDependencyIds({
        languageVersionIds,
        dependencies,
        languageVersions,
        noWarn: true,
        blockName,
      })
      spinnies.remove('p1')
      dependency_ids = depIds

      spinnies.add('p1', { text: `Uploading new version ${version}` })

      if (repoType === 'multi') {
        const { manager: Git, error: gErr } = await GitConfigFactory.init({
          cwd: blockManager.directory,
          gitUrl: source.ssh,
        })
        if (gErr) throw gErr

        try {
          await Git.fetch('--all --tags')
          Git.checkoutTagWithNoBranch(version)
          // eslint-disable-next-line no-param-reassign
          core.zipFile = await createZip({ blockName, directory: blockManager.directory, source, version })
          Git.undoCheckout()
        } catch (error) {
          Git.undoCheckout()
          throw error
        }
      }

      core.sourceCodeData = {
        block_type: blockManager.config.type,
        block_id: blockManager.config.blockId,
        block_name: blockName,
        block_version: version,
      }

      core.publishData = {
        dependency_ids,
        block_id: blockManager.config.blockId,
        block_version_id: versionData.id,
        appblock_version_ids: appblockVersionIds,
        language_version_ids: languageVersionIds,
      }

      if (supportedAppblockVersions && !core.publishData.appblock_version_ids) {
        core.publishData.appblock_versions = supportedAppblockVersions
        delete core.publishData.appblock_version_ids
      }
    })
  }
}

module.exports = HandlePublishBlock
