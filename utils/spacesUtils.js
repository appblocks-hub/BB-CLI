/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { default: axios } = require('axios')
const { appBlockListSpaces } = require('./api')
const { getShieldHeader } = require('./getHeaders')

const listSpaces = () => axios.post(appBlockListSpaces, {}, { headers: getShieldHeader() })

module.exports = { listSpaces }
