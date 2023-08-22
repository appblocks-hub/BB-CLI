/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const GitConfigFactory = require('./gitManagers/gitConfigFactory')

async function checkAndSetAuth() {
  const { manager, error } = await GitConfigFactory.init()
  if (error) throw error

  const { userToken, userName, userId } = manager.config

  if (!userToken) return { redoAuth: true }

  const { user } = await manager.getSignedInUser(userToken)

  if (userName === user?.userName && userId === user?.userId) {
    return { redoAuth: false }
  }

  return { redoAuth: true }
  // in else case inform user that stored name and id
  // doesn't match the token.
  // TODO
}

module.exports = { checkAndSetAuth }
