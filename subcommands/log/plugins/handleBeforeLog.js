/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */

const { BB_FILES, generateErrLogPath, generateOutLogPath } = require('../../../utils/bbFolders')

class HandleBeforeLog {
  /**
   *
   * @param {LogCore} core
   */
  apply(logCore) {
    logCore.hooks.beforeLog.tapPromise('HandleBeforeLog', async (core) => {
      const { manager: cm, cmdArgs, cmdOpts } = core
      const [blockName] = cmdArgs || []
      const { out, err } = cmdOpts || {}

      let manager = cm
      let blockManager

      const { ELEMENTS_LOG, FUNCTIONS_LOG } = BB_FILES

      const fnOutLogs = generateOutLogPath(FUNCTIONS_LOG)
      const fnErrLogs = generateErrLogPath(FUNCTIONS_LOG)

      const eleOutLogs = generateOutLogPath(ELEMENTS_LOG)
      const eleErrLogs = generateErrLogPath(ELEMENTS_LOG)

      if (blockName) {
        const bManager = await manager.getAnyBlock(blockName)
        if (!bManager) {
          throw new Error(`Block doesn't exist`)
        }

        if (bManager.isBlockConfigManager && !bManager.isLive) {
          throw new Error(`${blockName} is not live.`)
        }

        if (bManager.isPackageConfigManager) {
          manager = bManager
        } else blockManager = bManager
      }

      if (blockManager) {
        console.log(`Showing log of ${blockName}`)
        const appLiveData = blockManager.liveDetails
        const blockType = blockManager.config.type
        const logOutPath = blockType === 'function' ? fnOutLogs : appLiveData.log.out
        const logErrPath = blockType === 'function' ? fnErrLogs : appLiveData.log.err

        if (err) {
          core.filesToWatch.push(logErrPath)
        }
        if (out) {
          core.filesToWatch.push(logErrPath)
        }

        if (!err && !out) {
          core.filesToWatch.push(logOutPath, logErrPath)
        }
      } else {
        const containerData = [...(await manager.uiBlocks())].find(({ config }) => config.type === 'ui-container')
        const containerLiveData = containerData?.liveDetails || {}

        if (err) {
          if (containerLiveData?.log) core.filesToWatch.push(containerLiveData.log.err)
          core.filesToWatch.push(fnOutLogs, eleOutLogs, fnErrLogs, eleErrLogs)
        }
        if (out) {
          if (containerLiveData?.log) core.filesToWatch.push(containerLiveData.log.out)
          core.filesToWatch.push(fnOutLogs, eleOutLogs, fnErrLogs, eleErrLogs)
        }
        if (!err && !out) {
          if (containerLiveData?.log) core.filesToWatch.push(containerLiveData.log.err, containerLiveData.log.out)
          core.filesToWatch.push(fnOutLogs, eleOutLogs, fnErrLogs, eleErrLogs)
        }
      }
    })
  }
}

module.exports = HandleBeforeLog
