/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { configstore } = require('../../configstore')
const { readAWSCredConfig } = require('./util')

class AWS_Handler {
  constructor(options) {
    this.awsCredConfig = {}
    this.init(options)
  }

  init() {
    this.awsCredConfig = this.getAWSCredConfig
  }

  async syncAWSConfig(options) {
    const { force } = options || {}

    let awsCredConfig = force ? null : this.getAWSCredConfig
    if (!(awsCredConfig != null && Object.keys(awsCredConfig).length > 0)) {
      awsCredConfig = await readAWSCredConfig()
      this.setAWSCredConfig = awsCredConfig
    }

    this.awsCredConfig = awsCredConfig

    return { awsCredConfig }
  }

  set setAWSCredConfig(config) {
    this.awsCredConfig = { ...this.awsCredConfig, ...config }
    configstore.set('awsCredConfig', this.awsCredConfig)
  }

  get getAWSCredConfig() {
    if (!this.awsCredConfig?.accessKeyId) {
      this.awsCredConfig = configstore.get('awsCredConfig') || {}
    }
    return this.awsCredConfig
  }
}

const awsHandler = new AWS_Handler({})
module.exports = { AWS_Handler, awsHandler }
