const { configstore } = require('../configstore')
const { checkPnpm } = require('./pnpmUtils')

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
const getNodePackageInstaller = () => {
  let installer = 'npm i'
  const nodePackageManager = configstore.get('nodePackageManager')
  global.usePnpm = nodePackageManager === 'pnpm' && checkPnpm()

  if (global.usePnpm) installer = 'pnpm i'

  let installPackage = ''
  if (nodePackageManager === 'pnpm') {
    installPackage = 'npm install -g pnpm'
  }

  return { installer, nodePackageManager, installPackage }
}

module.exports = { getNodePackageInstaller }
