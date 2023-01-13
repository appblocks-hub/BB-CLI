/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const open = require('open')
const chalk = require('chalk')
const { githubDeviceLogin, githubClientID, githubGetAccessToken } = require('./api')
const clipcopy = require('./clipcopy')
const figletAsync = require('./figletAsync')
const OTPVerify = require('./OTPConfirmation')
const parseGitResponse = require('./parseResponse')

async function handleGithubAuth(data) {
  // INFO -- since the below code is not in try block,
  // if any part errors, process.exit in the outer catch might not kill
  // the timerThread.. "OTPExpired!!" might appear randomly
  // TODO -- kill unkilled thread
  const OTPresponse = parseGitResponse(data)
  const userCode = OTPresponse.user_code
  const expiresIn = OTPresponse.expires_in
  console.log('\n')
  console.log('Please go to https://github.com/login/device, and paste the below code.')
  await figletAsync(userCode)
  console.log('\n')
  await clipcopy(userCode)
  console.log('\n')
  // const timerThread={killed:true} -- for token expired testing.
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
