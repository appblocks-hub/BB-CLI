/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */
const path = require('path')
const { writeFileSync, existsSync, readFileSync } = require('fs')
const GitConfigFactory = require('../../../utils/gitManagers/gitConfigFactory')
const { BB_EXCLUDE_FILES_FOLDERS } = require('../../../utils/bbFolders')
const PackageConfigManager = require('../../../utils/configManagers/packageConfigManager')

class HandleAfterCreateVersion {
  /**
   *
   * @param {CreateVersionCore} core
   */
  apply(createVersionCore) {
    createVersionCore.hooks.afterCreateVersion.tapPromise('HandleAfterCreateVersion', async (core) => {
      const { manager, versionData } = core

      const { name: componentName, source, repoType, orphanBranchFolder } = manager.config
      const { version, versionNote, versionId } = versionData

      const managerConfigData = { ...manager.config }
      
      delete managerConfigData.orphanBranchFolder
      delete managerConfigData.workSpaceFolder

      managerConfigData.version = version
      managerConfigData.versionId = versionId

      if (repoType === 'mono') {
        try {
          // handle mono repo git flow
          const parentBranch = source.branch
          const releaseBranch = `block_${componentName}@${version}`

          const { manager: Git, error } = await GitConfigFactory.init({
            cwd: orphanBranchFolder,
            gitUrl: source.ssh,
          })
          if (error) throw error
          await Git.createReleaseBranch(releaseBranch, parentBranch)

          writeFileSync(path.join(orphanBranchFolder, manager.configName), JSON.stringify(managerConfigData, null, 2))

          await Git.stageAll()
          await Git.commit(`release branch for block for version ${version}`)
          await Git.push(releaseBranch)
        } catch (err) {
          if (!['already exists', 'tree clean'].some((e) => err.message.includes(e))) {
            throw err
          }
        }

        return
      }

      if (repoType === 'multi') {
        const ignoresApCreated = BB_EXCLUDE_FILES_FOLDERS

        if (manager instanceof PackageConfigManager) {
          const gitignorePath = path.join('.', '.gitignore')
          const gitignoreData = existsSync(gitignorePath) ? readFileSync(gitignorePath).toString() : ''

          const ignoreDependencies = Object.values(managerConfigData.dependencies).map((v) => `${v.directory}/`)
          const newGitIgnore = ignoresApCreated.concat(ignoreDependencies).reduce((acc, ig) => {
            if (acc.split('\n').includes(ig)) return acc
            return `${acc}\n${ig}`
          }, gitignoreData)
          // eslint-disable-next-line no-unreachable
          writeFileSync(gitignorePath, newGitIgnore)
        }

        core.spinnies.update('cv', { text: `Tagging new version ${version}` })

        const { manager: Git, error } = await GitConfigFactory.init({
          cwd: manager.directory,
          gitUrl: managerConfigData.source.ssh,
        })
        if (error) throw error

        await Git.addTag(version, versionNote)
        await Git.pushTags()
      }
    })
  }
}

module.exports = HandleAfterCreateVersion
