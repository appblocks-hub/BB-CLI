/* eslint-disable prefer-const */
/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { readInput } = require('../../../../utils/questionPrompts')

const getAWSS3Config = async (options) => {
  const { domain, uploadService } = options
  const bucket = await readInput({
    name: 'bucket',
    message: 'Enter a name for bucket',
    default: `${domain}`,
    validate: (input) => {
      if (!input || input.length < 3) return `Invalid input`
      if (uploadService === 'aws_static_web_hosting' && input !== domain) return `Name should be same as domain name`
      return true
    },
  })
  return { bucket }
}

module.exports = { getAWSS3Config }
