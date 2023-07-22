/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const open = require('open')
const chalk = require('chalk')
const { githubDeviceLogin, githubClientID, githubGetAccessToken } = require('./githubAPI')
const clipCopy = require('../../../../clipcopy')
const figletAsync = require('../../../../figletAsync')
const OTPVerify = require('../../../../OTPConfirmation')
const parseGitResponse = require('../../../../parseResponse')

async function handleGithubAuth(data) {
  const OTPresponse = parseGitResponse(data)
  const userCode = OTPresponse.user_code
  const expiresIn = OTPresponse.expires_in
  console.log('\n')
  console.log('Please go to https://github.com/login/device, and paste the below code.')
  await figletAsync(userCode)
  console.log('\n')
  await clipCopy(userCode)
  console.log('\n')
  console.log(`Code expires in ${chalk.bold(expiresIn)} seconds `)
  console.log('\n\n')
  await open(githubDeviceLogin)
  const Cdata = {
    client_id: githubClientID,
    device_code: OTPresponse.device_code,
    grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
  }
  const done = await OTPVerify(Cdata, githubGetAccessToken)
  if (done) return

  console.log('something went wrong')
  process.exit(0)
}

module.exports = handleGithubAuth
