/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable no-async-promise-executor */
/* eslint-disable arrow-body-style */
const path = require('path')
const fs = require('fs')
const fsPromise = require('fs/promises')

const convertToEnv = (envObject, existingValue) => {
  let existingObject = {}
  if (existingValue && typeof existingValue === 'string') {
    existingObject = existingValue.split('\n').reduce((a, eData) => {
      const [key, value] = eData.split('=')
      if (!key?.length) return a
      return { ...a, [key]: value }
    }, {})
  }
  const newEnvObject = { ...existingObject, ...envObject }

  return Object.entries(newEnvObject).reduce((acc, [key, value]) => {
    // eslint-disable-next-line no-param-reassign
    acc += `${key}=${value}\n`
    return acc
  }, '')
}

const upsertEnv = async (envPath, envData) => {
  try {
    if (!fs.existsSync(envPath)) {
      await fs.writeFileSync(envPath, convertToEnv(envData))
    } else {
      const existingEnvDataFile = await fsPromise.readFile(envPath, 'utf8')

      const existingEnvData = existingEnvDataFile.split('\n').reduce((a, eData) => {
        const equalIndex = eData.indexOf('=')
        const key = eData.substring(0, equalIndex)
        const value = eData.substring(equalIndex + 1)

        if (!key?.length) return a
        return { ...a, [key]: value }
      }, {})

      await fs.writeFileSync(envPath, convertToEnv({ ...existingEnvData, ...envData }))
    }
  } catch (err) {
    console.error('======== error env upsert =====================', err)
  }
}

const setupEnv = (config) => {
  return new Promise(async (resolve) => {
    // env file generation if env exist in config
    if (config.env) {
      for (const [blockType, envData] of Object.entries(config.env)) {
        await upsertEnv(`${path.resolve()}/.env.${blockType}`, envData)
      }
    }
    resolve()
  })
}

const updateEnv = (type, envData) => {
  return new Promise(async (resolve) => {
    if (!type || !envData) return

    let blockType = type
    if (['ui-container', 'ui-elements'].includes(type)) blockType = 'view'

    const envPath = path.join(path.resolve(), `.env.${blockType}`)
    await upsertEnv(envPath, envData)
    resolve()
  })
}

/**
 * @typedef {Record<string, string>} envObj
 */
/**
 * To read the .env from the path provided, split on '=' & convert to js object
 * @param {string} absPathToEnv Absolute path to expected .env
 * @returns {Promise<envObj> }
 */
async function envToObj(absPathToEnv) {
  try {
    const envFileBuffer = await fsPromise.readFile(absPathToEnv)
    return envFileBuffer
      .toString()
      .trim()
      .split('\n')
      .reduce((acc, curr) => {
        const [k, v] = curr.split('=')
        acc[k] = v
        return acc
      }, {})
  } catch (err) {
    if (err.code === 'ENOENT') {
      return {}
    }
    return {}
  }
}

module.exports = { setupEnv, updateEnv, convertToEnv, envToObj }
