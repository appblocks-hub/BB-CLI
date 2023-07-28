/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const path = require('path')
const { readdirSync } = require('fs')
const { configstore } = require('../../configstore')
const { GIT_VENDOR, PREFERS_SSH } = require('./utils/constant')

class GitConfigFactory {
  static cache = {}

  /**
   *
   * @param {import('./gitManager').GitManagerConfig} options
   * @returns
   */
  static async init(options) {
    try {
      const { cwd, gitUrl, gitVendor } = options || {}

      const config = {
        cwd: path.resolve(cwd || '.'),
        prefersSsh: configstore.get(PREFERS_SSH),
        gitVendor: gitVendor || configstore.get(GIT_VENDOR),
        gitUrl,
      }

      if (!config.gitVendor) {
        throw new Error('No git vendor specified. Please run bb connect vendor and try again')
      }

      const gitVendorPluginsPath = path.join(__dirname, 'plugins')
      const plugins = readdirSync(gitVendorPluginsPath)

      for await (const pluginName of plugins) {
        // eslint-disable-next-line no-continue
        if (pluginName !== config.gitVendor) continue

        const { default: Plugin } = await import(path.join(gitVendorPluginsPath, pluginName, 'index.js'))
        const manager = new Plugin(config)
        return { manager }
      }

      throw new Error(`${config.gitVendor} git vendor is not integrated`)
    } catch (error) {
      return { error }
    }
  }
}

module.exports = GitConfigFactory
