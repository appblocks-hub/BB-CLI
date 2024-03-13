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
const whitelisted_env_keys = ['BB_SHIELD_AUTH_URL', 'SHIELD_AUTH_URL']

const readEnvAsObject = async (envPath) => {
  try {
    const envFileData = await readFile(envPath, 'utf8')
    return envFileData.split('\n').reduce((a, eData) => {
      const equalIndex = eData.indexOf('=')
      const key = eData.substring(0, equalIndex)
      const value = eData.substring(equalIndex + 1)

      if (!key?.length) return a
      return { ...a, [key]: value }
    }, {})
  } catch (err) {
    return {}
  }
}

const updateEnvWith = (envData, customData, packPrefixes, customEnv) => {
  const prefixes =
    Array.isArray(packPrefixes) && packPrefixes.length > 0 ? packPrefixes.map((prefix) => `BB_${prefix}`) : null

  const updatedData = envData
  const warnKeys = []
  const isEnvHasPrefix = (key) => prefixes?.some((pre) => key.startsWith(pre))

  Object.entries(updatedData).forEach(([key]) => {
    if (key === 'NODE_ENV' || isEnvHasPrefix(key) || whitelisted_env_keys.includes(key)) return
    warnKeys.push(key.trim())
  })

  Object.entries(customData).forEach(([key, value]) => {
    if (!isEnvHasPrefix(key)) warnKeys.push(key.trim())

    if (envData[key] !== undefined && customEnv) {
      console.log(chalk.yellow(`Replacing ${key} with custom env value from ${customEnv}.`))
    }

    updatedData[key] = value
  })

  return { updatedData, warnKeys, prefixes }
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

const upsertEnv = async (type, envData, customEnv, prefixes) => {
  try {
    const customEnvPath = path.join(path.resolve(), `.env.${type}.${customEnv}`)
    const envPath = path.join(path.resolve(), `.env.${type}`)
    let updateEnvData = envData || {}
    const envWarning = { keys: [], prefixes: [] }

    if (existsSync(envPath)) {
      const existEnvData = await readEnvAsObject(envPath)
      const { updatedData, warnKeys: wk, prefixes: pre } = updateEnvWith(existEnvData, updateEnvData, prefixes)
      updateEnvData = updatedData
      envWarning.keys = envWarning.keys.concat(wk)
      envWarning.prefixes = envWarning.prefixes.concat(pre)
    }

    if (customEnv && existsSync(customEnvPath)) {
      const customEnvData = await readEnvAsObject(customEnvPath)
      const {
        updatedData,
        warnKeys: wk,
        prefixes: pre,
      } = updateEnvWith(updateEnvData, customEnvData, prefixes, customEnv)
      updateEnvData = updatedData
      envWarning.keys = envWarning.keys.concat(wk)
      envWarning.prefixes = envWarning.prefixes.concat(pre)
    }

    const { envString, envObject } = saveToEnvFile(updateEnvData, envPath)
    return { envWarning, envString, envObject }
  } catch (err) {
    throw new Error(err.message)
  }
}

module.exports = { upsertEnv, readEnvAsObject }
