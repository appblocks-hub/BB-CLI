/**
 * Copyright (c) Yahilo. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable */
const { readFile } = require('fs/promises')
const babelParser = require('@babel/parser')
const { appConfig } = require('./appconfigStore')

async function BlockValidationRunner(blockPath, taskArray) {
  for (let index = 0; index < taskArray.length; index++) {
    const fn = taskArray[index]
    if (typeof fn !== 'function') throw new Error('Expexted task to be a function')
    await fn.apply(null, [appConfig, blockConfig, cwd])
  }
  await appConfig.init()
  const testDIrectory = appConfig.getBlock(appConfig.allBlockNames.next().value).directory
  console.log(testDIrectory)
  // const file = await readFile(`${testDIrectory}/src/todoInput.js`, { encoding: 'utf8' })
  const webpackFile = await readFile(`${testDIrectory}/webpack.config.js`, { encoding: 'utf8' })
  const web = babelParser.parse(webpackFile, { sourceType: 'module' })
  // console.log(web.program.body)
  const [webpackConfig] = web.program.body.filter((c) => c.type === 'ExportDefaultDeclaration')
  const [plugins] = webpackConfig.declaration.properties.filter((v) => v.key.name === 'plugins')
  const federationplugins = plugins.value.elements.filter((v) => v.callee.name === 'ModuleFederationPlugin')[0]
  const {
    arguments: [{ properties }],
  } = federationplugins
  const exposes = properties.filter((v) => v.key.name === 'exposes')
  console.log(exposes)
  const exposedProperties = exposes[0].value.properties
  console.log(exposedProperties)
  // const ast = babelParser.parse(file, { sourceType: 'module', plugins: ['jsx'] })
  // console.log(ast.program.body)
}

module.exports = BlockValidationRunner
