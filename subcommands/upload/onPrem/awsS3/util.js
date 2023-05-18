/* eslint-disable prefer-const */
/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { existsSync, rmSync } = require('fs')
const { readInput } = require('../../../../utils/questionPrompts')

const getAWSS3Config = async (options) => {
  const { domain, elementsDomain, uploadService, singleBuildDeployment } = options
  if (uploadService === 'aws_static_web_hosting') {
    return { bucket: domain, elementsBucket: elementsDomain }
  }

  const bucket = await readInput({
    name: 'bucket',
    message: 'Enter a name for bucket',
    default: `${domain}`,
    validate: (input) => {
      if (!input || input.length < 3) return `Invalid input`
      return true
    },
  })

  let elementsBucket
  if (singleBuildDeployment) {
    elementsBucket = await readInput({
      name: 'bucket',
      message: 'Enter a name for elements bucket',
      default: `${elementsDomain}`,
      validate: (input) => {
        if (!input || input.length < 3) return `Invalid input`
        return true
      },
    })
  }
  return { bucket, elementsBucket }
}

const removeSync = async (paths) => {
  if (!paths?.length) return
  await Promise.all(
    paths.map((p) => {
      if (p && existsSync(p)) rmSync(p, { recursive: true, force: true })
      return true
    })
  )
}

module.exports = { getAWSS3Config, removeSync }
