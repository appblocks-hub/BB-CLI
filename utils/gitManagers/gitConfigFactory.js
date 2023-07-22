/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { readdirSync } = require('fs')
const { path } = require('@babel/traverse/lib/cache')
const { configstore } = require('../../configstore')

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
        cwd: path.resolve(cwd),
        prefersSsh: configstore.get('prefersSsh'),
        gitVendor: gitVendor || configstore.get('gitVendor'),
        gitUrl,
      }

      const gitVendorPluginsPath = path.join('plugins')
      const plugins = readdirSync(gitVendorPluginsPath)

      for await (const plugin of plugins) {
        // eslint-disable-next-line no-continue
        if (plugin !== config.gitVendor) continue

        const manager = await import(path.join(gitVendorPluginsPath, plugin))
        return { manager }
      }

      throw new Error(`${config.gitVendor} git vendor is not integrated`)
    } catch (error) {
      return { error }
    }
  }
}

module.exports = GitConfigFactory
