/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable no-case-declarations */
const chalk = require('chalk')

const { setWithTemplate } = require('../../utils/questionPrompts')
const setupTemplate = require('./setupTemplate')
const initializePackageBlock = require('./initializePackageBlock')

const init = async (appblockName, options) => {
  const initializedData = await initializePackageBlock(appblockName, options)
  const { useTemplate } = await setWithTemplate()
  if (useTemplate) await setupTemplate(initializedData)

  console.log(chalk.dim(`\ncd ${initializedData.blockFinalName} and start hacking\n`))
}

module.exports = init
