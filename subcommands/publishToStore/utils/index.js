
const { spinnies } = require('../../../loader')
const {  appBlockSellFreeBlock } = require('../../../utils/api')
const { readInput } = require('../../../utils/questionPrompts')
const { getAllBlockVersions } = require('../../../utils/registryUtils')
const { getAllLicenses } = require('../../../utils/paymentUtils')
const { getShieldHeader } = require('../../../utils/getHeaders')
const { axios } = require('../../../utils/axiosInstances')

const getBlockVersions = async (blockId, version) => {
  spinnies.add('bv', { text: `Getting block versions` })
  const { data } = await getAllBlockVersions(blockId, {
    status: [2],
  })
  spinnies.remove('bv')

  const blockVersions = data?.data || []

  if (blockVersions.length < 1) {
    throw new Error('No Released block versions found. Please create version and try again.')
  }

  let versionData
  if (version) {
    versionData = blockVersions.find((v) => v.version_number === version)
    if (!versionData) throw new Error(`No Released version found for ${version}`)
  } else {
    versionData = await readInput({
      name: 'versionData',
      type: 'list',
      message: 'Select a version to publish to store',
      choices: blockVersions.map((v) => ({
        name: v.version_number,
        value: v,
      })),
      validate: (ans) => {
        if (!ans) return 'Invalid version'
        return true
      },
    })
  }
  return versionData
}

async function sellFreeBlock(options) {
  try {

    const {block_id,item_name,development_cost,development_effort,block_version}=options


    const postData = {
      block_id,item_name,development_cost,development_effort,block_version
    }

    const shieldHeader = getShieldHeader()


    const res = await axios.post(appBlockSellFreeBlock, postData, {
      headers: shieldHeader,
    })

    if (res.data.err) {
      throw res.data.err
    }
    return res.data.data
  } catch (err) {
    throw new Error('Error publishing block to store')
   
  }
}

const listLicenses = async (licenseName) => {
  // spinnies.add('bv', { text: `Getting Licenses` })
  const { data } = await getAllLicenses( {
  })
  spinnies.remove('bv')

  const licenses = data?.data || []

  if (licenses.length < 1) {
    throw new Error('Error publishing block to store.')
  }


  let licenseData
  if (licenseName) {
    licenseData = licenses.find((v) => v.version_number === licenseName)
    if (!licenseData) throw new Error('Error publishing block to store.')
  } else {
    licenseData = await readInput({
      name: 'licenseData',
      type: 'list',
      message: 'Select a license to publish',
      choices: licenses.map((v) => ({
        name: v.version_number,
        value: v,
      })),
      validate: (ans) => {
        if (!ans) return 'Invalid license'
        return true
      },
    })
  }

  return licenseData
}

module.exports = { getBlockVersions,listLicenses,sellFreeBlock }
