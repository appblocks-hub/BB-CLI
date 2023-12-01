/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */

const { existsSync, readFile } = require('fs')
const { readInput } = require('../../../utils/questionPrompts')
const { getAllBlockVersions } = require('../../../utils/registryUtils')

class HandleBeforeSetPreviewEnv {
  /**
   *
   * @param {SetPreviewEnvCore} core
   */
  apply(setPreviewEnvCore) {
    setPreviewEnvCore.hooks.beforeSetPreviewEnv.tapPromise('HandleBeforeSetPreviewEnv', async (core) => {
      const { manager, cmdOpts, cmdArgs } = core

      const envPath = cmdOpts.filePath

      if (cmdArgs.length > 0 && envPath !== '.env.preview') {
        throw new Error(`Found both arguments and file path.\nPlease provide either variables as arguments or file`)
      }

      if (cmdArgs.length > 0) {
        core.variableData = cmdArgs
      } else {
        if (!existsSync(envPath)) throw new Error(`File not found`)
        const envFileData = await readFile(envPath, 'utf8')
        core.variableData = envFileData.split('\n')
      }

      const { blockId } = manager.config
      core.spinnies.add('bv', { text: `Checking block versions` })
      const bkRes = await getAllBlockVersions(blockId)
      core.spinnies.remove('bv')

      const bkResData = bkRes.data?.data || []

      if (bkResData.length < 1) {
        throw new Error('No block versions found')
      }

      const blockVersions = bkResData.map((d) => ({
        name: d.version_number,
        value: d.id,
      }))

      core.blockVersionId = await readInput({
        type: 'list',
        name: 'blockVersionId',
        message: 'Select the block version',
        choices: blockVersions,
      })

      core.variableData = core.variableData.reduce((a, eData) => {
        const equalIndex = eData.indexOf('=')
        const key = eData.substring(0, equalIndex)
        const value = eData.substring(equalIndex + 1)
        if (key?.length) a.push({ key, value })
        return a
      }, [])
    })
  }
}

module.exports = HandleBeforeSetPreviewEnv
