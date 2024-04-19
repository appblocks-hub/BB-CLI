/* eslint-disable no-param-reassign */
/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/* eslint-disable class-methods-use-this */
const path = require('path')
const { readFileSync } = require('fs')
const { spinnies } = require('../../../loader')
const { getLanguageVersionData } = require('../../../utils/languageVersion')
const { createZip, buildBlockTypesMap } = require('../utils')
const { BB_EXCLUDE_FILES_FOLDERS } = require('../../../utils/bbFolders')
const PackageConfigManager = require('../../../utils/configManagers/packageConfigManager')
const ContainerizedPackageConfigManager = require('../../../utils/configManagers/containerizedPackageConfigManager')

class HandlePublishPackageBlock {
  /**
   *
   * @param {PublishCore} core
   */
  apply(publishCore) {
    publishCore.hooks.beforePublish.tapPromise('HandlePublishPackageBlock', async (core) => {
      const { manager, versionData } = core
      if (!(manager instanceof PackageConfigManager) && !(manager instanceof ContainerizedPackageConfigManager)) return

      const packageManager = manager

      const {
        supportedAppblockVersions,
        name: blockName,
        blockId: pkBlockId,
        repoType,
        source,
        dependencies,
      } = packageManager.config

      if (!supportedAppblockVersions) {
        throw new Error(`Please set-appblock-version and try again`)
      }

      if (repoType === 'multi') {
        spinnies.add('p1', { text: `Uploading new version ${versionData.version_number}` })
        const ignoresApCreated = BB_EXCLUDE_FILES_FOLDERS
        const gitignorePath = path.join('.', '.gitignore')
        const gitignoreData = readFileSync(gitignorePath).toString()
        const ignoreDependencies = Object.values(dependencies).map((v) => `${v.directory}/`)
        const excludePaths = ignoresApCreated
          .concat(ignoreDependencies)
          .reduce((acc, ig) => {
            if (acc.split('\n').includes(ig)) return acc
            return `${acc}\n${ig}`
          }, gitignoreData)
          .split('\n')
          .map((ex) => ex.replaceAll(/\/|(\.)\.(?=\/)|\*/g, '').replaceAll('..', '.'))
          .filter((e) => e !== '')

        core.zipFile = await createZip({
          blockName,
          directory: '.',
          source,
          version: versionData.version_number,
          excludePaths,
        })
      }

      const blockTypesMap = {}

      await buildBlockTypesMap({ packageManager, blockTypesMap })

      core.sourceCodeData = {
        block_type: 'package',
        block_id: pkBlockId,
        block_name: blockName,
        block_version: versionData.version_number,
      }

      // ========= languageVersion ========================
      const { languageVersionIds } = await getLanguageVersionData({ supportedAppblockVersions })

      core.publishData = {
        block_id: pkBlockId,
        block_version_id: versionData.id,
        appblock_versions: supportedAppblockVersions,
        language_version_ids: languageVersionIds,
        block_types_map: blockTypesMap,
      }
    })
  }
}
module.exports = HandlePublishPackageBlock
