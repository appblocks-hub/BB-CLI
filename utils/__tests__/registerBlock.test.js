/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable */
const axios = require('axios')
const registerBlock = require('../registerBlock.js')

const logspy = jest.spyOn(global.console, 'log').mockImplementation(() => {})
afterAll(() => {
  logspy.mockReset()
})
afterEach(() => {
  logspy.mockClear()
})
jest.mock('axios')

var deepEqual = function (x, y) {
  if (x === y) {
    return true
  } else if (typeof x == 'object' && x != null && typeof y == 'object' && y != null) {
    if (Object.keys(x).length != Object.keys(y).length) return false

    for (var prop in x) {
      if (y.hasOwnProperty(prop)) {
        if (!deepEqual(x[prop], y[prop])) return false
      } else return false
    }

    return true
  } else return false
}
const expectedKeys = ['block_type', 'block_name', 'block_short_name', 'block_desc', 'github_url', 'is_public']
const expectedData = {
  block_type: 1,
  block_name: 'xycvd',
  block_short_name: 'validateData',
  is_public: false,
  github_url: 'www.something.com',
  block_desc: 'a few words',
}
const inputData = {
  validateData: {
    correct: Object.assign({}, expectedData),
  },
}
const responses = {
  success: {
    err: false,
    msg: 'Block Registered Successfully!!!',
    data: {
      CreatedAt: '2022-01-13T23:09:17.3184257+05:30',
      UpdatedAt: '2022-01-13T23:09:17.3184257+05:30',
      DeletedAt: null,
      ID: 'eMt59NdJJc-YxHXC8FyDo',
      BlockType: 1,
      BlockName: 'a_test_bloox',
      BlockShortName: 'atb',
      BlockDesc: 'this is an example block',
      IsPublic: false,
      GitUrl: 'doesnt exist',
      Status: 1,
    },
  },
  fail: {
    err: true,
    msg: 'Block name already exist!! Please try a different name',
  },
  wrongData: {
    err: true,
    msg: 'Wrong Data',
  },
}
describe('Tests for registerBlock', () => {
  axios.post.mockImplementation((c, v) => {
    switch (v.block_short_name) {
      case 'validateData':
        if (deepEqual(v, expectedData)) return Promise.resolve({ data: responses.success })
        else {
          return Promise.resolve({ data: responses.wrongData })
        }
        break

      default:
        break
    }
  })

  test('Api called with correct data', async () => {
    const x = await registerBlock.apply(null, Object.values(inputData.validateData.correct))
    expect(x.err).toBe(false)
  })
})
