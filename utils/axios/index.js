/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable no-async-promise-executor */

const { default: axios } = require('axios')
const { getShieldHeader } = require('../getHeaders')

const post = (url, body, options) =>
  new Promise(async (resolve, reject) => {
    const { headers: opHeaders, handleError = true } = options || {}
    try {
      let headers = getShieldHeader()
      if (opHeaders) headers = { ...headers, opHeaders }
      const res = await axios.post(url, body || {}, { headers })
      resolve({ data: res.data, error: null })
    } catch (error) {
      // console.log('Error :', error.response?.data?.msg || error.message)
      if (!handleError) reject(error)
      resolve({ data: null, error })
    }
  })

const axiosGet = (url, options) =>
  new Promise(async (resolve, reject) => {
    const { headers: opHeaders, handleError = true, noHeaders = false, responseType } = options || {}
    try {
      const axisOptions = {}

      let headers = getShieldHeader()
      if (opHeaders) headers = { ...headers, opHeaders }
      if (!noHeaders) axisOptions.headers = headers

      if (responseType) axisOptions.responseType = responseType

      const res = await axios.get(url, axisOptions)

      resolve({ data: res.data, error: null })
    } catch (error) {
      if (!handleError) reject(error)
      resolve({ data: null, error })
    }
  })

module.exports = { post, axiosGet }
