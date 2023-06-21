/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { default: axios } = require('axios')
const { appBlockListLicenses } = require('./api')
const { getShieldHeader } = require('./getHeaders')


const getAllLicenses = async(options) =>
  axios.post(
    appBlockListLicenses,
    {
      page_limit: 20,
      offset: 0,
      ...options,
    },
    { headers: getShieldHeader() }
  )

module.exports = {getAllLicenses }
