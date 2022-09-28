/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable */

const { default: axios } = require('axios')
const { getShieldHeader } = require('../getHeaders')
const { uploadToServer, createZip } = require('../uploadUtil')

jest.mock('axios')
jest.mock('fs')
jest.mock('child_process')

describe('uploadToServer function', () => {
  const preSignedUrl = 'https://awsSignedUrl.aws.amazon.com'

  const uploadToServerInput = {
    blockType: 1,
    blockId: 'blockId',
    appId: 'appId',
    blockName: 'blockName',
    zipFile: 'zipFile',
    version: 'version',
    blockFolder: 'blockFolder',
    environmentId: 'environmentId',
  }

  const postData = {
    app_id: uploadToServerInput.appId,
    block_type: uploadToServerInput.blockType,
    block_folder: uploadToServerInput.blockFolder,
    block_id: uploadToServerInput.blockId,
    block_name: uploadToServerInput.blockName,
    block_version: uploadToServerInput.version,
    environment_id: uploadToServerInput.environmentId,
  }

  beforeAll(() => {
    axios.post.mockResolvedValueOnce(Promise.resolve({ data: { url: preSignedUrl } }))
    axios.put.mockResolvedValueOnce(Promise.resolve({ status: 200 }))
  })

  test('should call api and return response', async () => {
    const result = await uploadToServer(uploadToServerInput)

    const str = JSON.stringify('someValues')
    const blob = new Blob([str])
    const fileData = new File([blob], 'test.zip', {
      type: 'application/zip',
    })

    expect(result.success).toBe(true)

    expect(axios.post).toHaveBeenCalledWith(appRegistryCreateDeployPresignedUrl, postData, {
      headers: getShieldHeader(),
    })
    expect(axios.put).toHaveBeenCalledWith(preSignedUrl, fileData)
  })

  test('should resolve with success false', async () => {
    const result = await uploadToServer(uploadToServerInput)
    expect(result.success).toBe(false)
    expect(axios.post).toHaveBeenCalledWith(appRegistryCreateDeployPresignedUrl, {}, { headers: getShieldHeader() })
    expect(axios.put).not.toHaveBeenCalled()
  })
})

describe('createZip function', () => {
  test('should should create zip file', () => {
    const input = { directory: 'directory', blockName: 'blockName', type: 'function' }

    fs.mkdirSync = jest.fn(() => true)
    child_process.execSync = jest.fn(() => true)

    const result = createZip(input)
    expect(result).toBe('./.tmp/upload/directory/blockName.zip')
    expect(fs.mkdirSync).toHaveBeenCalled()
    expect(child_process.execSync).toHaveBeenCalled()
  })
})
