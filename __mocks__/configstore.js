/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable */

const set = jest.fn()

const mockDelete = jest.fn((k) => delete store[k])

const store = {
  githubUserName: 'arjun',
  githubUserId: 'arjun',
  githubUserToken: '12345',
}
const config = {
  get: jest.fn((k) => {
    return store[k]
  }),
  set,
  size: 0,
  set updateSize(config) {
    this.size = config
  },
  delete: jest.fn((k) => delete store[k]),
  addGitUser: (name, id, token) => {
    store.githubUserName = name
    store.githubUserId = id
    store.githubUserToken = token
    config.updateSize = Object.keys(store).length
  },
  removeGitUser: () => {
    delete store.githubUserName
    delete store.githubUserId
    delete store.githubUserToken
    config.updateSize = Object.keys(store).length
  },
  store: () => {
    return store
  },
}

module.exports = { configstore: config, headLessConfigStore: {} }
