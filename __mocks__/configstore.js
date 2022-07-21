/**
 * Copyright (c) Yahilo. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable */

const get = jest.fn((k) => {
  return store[k]
})

const set = jest.fn()

const mockDelete = jest.fn((k) => delete store[k])

const store = {
  githubUserId: 'arjun',
  githubUserToken: '12345',
}
const config = {
  get,
  set,
  size: 0,
  set updateSize(config) {
    this.size = config
  },
  delete: jest.fn((k) => delete store[k]),
  addGitUser: (name, token) => {
    store['githubUserId'] = name
    store['githubUserToken'] = token
    config.updateSize = Object.keys(store).length
  },
  removeGitUser: () => {
    delete store.githubUserId
    delete store.githubUserToken
    config.updateSize = Object.keys(store).length
  },
}

module.exports = { configstore: config, get }
