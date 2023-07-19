const { existsSync, mkdirSync } = require('fs')
const { tmpdir } = require('os')
const path = require('path')
const { createFileSync } = require('./fileAndFolderHelpers')

const BB_FOLDERS = {
  BB: '._bb_',
  TEMP: 'tmp',
  LOGS: 'logs',
  OUT: 'out',
  ERR: 'err',
  DEPLOY_BACKUP: 'deploy_backup',
  ON_PREMISE: 'on_prem',
  PUSH_LOGS: 'push_logs',
  SYNC_LOGS: 'sync_logs',
  BB_MODULES: 'bb_modules',
  RUN_TIME_LOGS: 'cli_run_time_logs',
  FUNCTIONS_EMULATOR: 'functions_emulator',
  ELEMENTS_EMULATOR: 'elements_emulator',
}

const BB_FILES = {
  DEPLOY_CONFIG: 'deploy.config.json',
  DEPLOYED_CONFIG: '.deployed.config.json',
  FUNCTIONS_LOG: 'function.log',
  ELEMENTS_LOG: 'elements.log',
  WORKSPACE: 'workspace',
  UPLOAD: 'upload',
}

const getBBFolderPath = (folderName, root) => {
  if (root) return path.join(root, BB_FOLDERS.BB, folderName)
  return path.resolve(BB_FOLDERS.BB, folderName)
}

const getSystemTempFolderPath = (folderName) => {
  const tmpPath = path.resolve(tmpdir(), BB_FOLDERS.BB, folderName)
  if (!existsSync(tmpPath)) mkdirSync(tmpPath, { recursive: true })
  return tmpPath
}

const generateErrLogPath = (fileName, root) => {
  const logsPath = getBBFolderPath(BB_FOLDERS.LOGS, root)
  const errLogPath = path.resolve(logsPath, BB_FOLDERS.ERR, fileName)
  const dirName = path.dirname(errLogPath)

  if (!existsSync(dirName)) mkdirSync(dirName, { recursive: true })
  if (!existsSync(errLogPath)) createFileSync(errLogPath, '')

  return errLogPath
}

const generateOutLogPath = (fileName, root) => {
  const logsPath = getBBFolderPath(BB_FOLDERS.LOGS, root)
  const outLogPath = path.resolve(logsPath, BB_FOLDERS.OUT, fileName)
  const dirName = path.dirname(outLogPath)

  if (!existsSync(dirName)) mkdirSync(dirName, { recursive: true })
  if (!existsSync(outLogPath)) createFileSync(outLogPath, '')

  return outLogPath
}

const BB_EXCLUDE_FILES_FOLDERS = [BB_FOLDERS.BB, '.env.function*', '.env.view*', BB_FILES.DEPLOYED_CONFIG]

module.exports = {
  BB_FILES,
  BB_FOLDERS,
  getBBFolderPath,
  BB_EXCLUDE_FILES_FOLDERS,
  generateErrLogPath,
  generateOutLogPath,
  getSystemTempFolderPath,
}
