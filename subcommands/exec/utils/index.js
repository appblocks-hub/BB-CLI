const { exec } = require('child_process')
const path = require('path')

function processExec(cmd, options, name) {
  return new Promise((resolve) => {
    exec(cmd, options, (error, stdout, stderr) => {
      if (error) {
        // eslint-disable-next-line prefer-promise-reject-errors
        resolve({ name, out: stderr.toString(), err: true })
        return
      }
      resolve({ name, out: stdout.toString(), err: false })
    })
  })
}

/**
 *
 * @param {PackageConfigManager | BlockConfigManager} c a manager
 * @returns {boolean}
 */
const typeSatisfies = (c, types) => {
  if (types.length === 0) return true
  return types.includes(c.config.type)
}

/**
 * Checks if passed manager name is in the names list given by the user
 * @param {PackageConfigManager | BlockConfigManager} c a manager
 * @returns {boolean}
 */
const nameSatisfies = (c, inside) => {
  if (inside.length === 0) return true
  return inside.includes(c.config.name)
}

/**
 *
 * @param {PackageConfigManager | BlockConfigManager} c a manager
 * @returns {boolean}
 */
const groupSatisfies = (c, groups) => {
  if (groups.length === 0) return true
  const pathBits = c.pathRelativeToParent.split(path.sep)
  return pathBits.some((b) => groups.includes(b))
}

module.exports = { processExec, typeSatisfies, nameSatisfies, groupSatisfies }
