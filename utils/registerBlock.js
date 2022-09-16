/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable camelcase */
const axios = require('axios')
const Spinnies = require('spinnies')
const { appBlockRegister } = require('./api')
const { getShieldHeader } = require('./getHeaders')

/**
 *
 * @param {Number} block_type 1 or 2 or 3
 * @param {String} block_name Long name of block
 * @param {String} block_short_name Preferred short name of block
 * @param {Boolean} is_public Visibility of repo
 * @param {String} github_url Github repo url
 * @param {String} block_desc Description same as github repo description
 */
// eslint-disable-next-line consistent-return
async function registerBlock(block_type, block_name, block_short_name, is_public, github_url, block_desc) {
  // ASK -- about short name flow
  // ASK -- isPublic flow? default false and an option in command..
  //     -- should it be always public in github?

  // console.log(process.env.NODE_ENV);
  //   console.log(block_type, block_name, block_short_name, block_desc, github_url)
  const spinnies = new Spinnies()

  spinnies.add('register', { text: `Registering ${block_name}` })

  try {
    const headers = getShieldHeader()
    const res = await axios.post(
      appBlockRegister,
      {
        block_type,
        block_name,
        block_short_name,
        is_public,
        block_desc,
        github_url,
      },
      {
        headers,
      }
    )

    spinnies.succeed('register', { text: `${block_name} registered successfully` })
    spinnies.remove('register')
    // console.log('Block registered succesfully')
    // console.log(res.data)
    return res.data
  } catch (err) {
    spinnies.fail('register', { text: `${block_name} registeration failed` })
    spinnies.remove('register')
    console.log(err)
    console.log('Something went wrong! in registerBlock')
  }
}

module.exports = registerBlock
