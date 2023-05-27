/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const path = require('path')
const { readFile } = require('fs/promises')
const chalk = require('chalk')
const { existsSync, writeFileSync } = require('fs')

const readEnvAsObject = async (envPath) => {
  try {
    const envFileData = await readFile(envPath, 'utf8')
    return envFileData.split('\n').reduce((a, eData) => {
      const [key, value] = eData.split('=')
      if (!key?.length) return a
      return { ...a, [key]: value }
    }, {})
  } catch (err) {
    return {}
  }
}

const updateEnvWith = (envData, customData, prefix, customEnv) => {
  const updatedData = envData

  Object.entries(customData).forEach(([key, value]) => {
    if (prefix && !key.startsWith(prefix) && !key.startsWith(`BB_${prefix}`)) {
      console.log(chalk.yellow(`Discarded ${key} env: Env key should start with ${prefix}`))
      return
    }

    if (envData[key] !== undefined && customEnv) {
      console.log(chalk.yellow(`Replacing ${key} with custom env value from ${customEnv}.`))
    }

    updatedData[key] = value
  })

  return updatedData
}

const saveToEnvFile = (envObject, envPath) => {
  const envString = Object.entries(envObject).reduce((acc, [key, value]) => {
    // eslint-disable-next-line no-param-reassign
    acc += `${key}=${value}\n`
    return acc
  }, '')
  writeFileSync(envPath, envString)
  return { envString, envObject }
}

const upsertEnv = async (type, envData, customEnv, prefix) => {
  try {
    const customEnvPath = path.join(path.resolve(), `.env.${type}.${customEnv}`)
    const envPath = path.join(path.resolve(), `.env.${type}`)
    let updateEnvData = envData || {}
    const prefixName = prefix ? prefix.toUpperCase() : null

    if (existsSync(envPath)) {
      const existEnvData = await readEnvAsObject(envPath)
      updateEnvData = updateEnvWith(existEnvData, updateEnvData, prefixName)
    }

    if (customEnv && existsSync(customEnvPath)) {
      const customEnvData = await readEnvAsObject(customEnvPath)
      updateEnvData = updateEnvWith(updateEnvData, customEnvData, prefixName, customEnv)
    }

    return saveToEnvFile(updateEnvData, envPath)
  } catch (err) {
    throw new Error(err.message)
  }
}

module.exports = { upsertEnv, readEnvAsObject }
