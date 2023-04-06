const { readFile } = require('fs/promises')

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
    const envFileBuffer = await readFile(absPathToEnv)
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

module.exports = envToObj
