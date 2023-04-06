/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const chalk = require('chalk')
const { readFileSync, writeFileSync } = require('fs')
const path = require('path')
const { appBlockGetAppConfig, getBlockPermissionsApi } = require('../../utils/api')
const { post } = require('../../utils/axios')
const { spinnies } = require('../../loader')
const { configstore } = require('../../configstore')
const convertGitSshUrlToHttps = require('../../utils/convertGitUrl')
const { GitManager } = require('../../utils/gitmanager')
const { getBlockMetaData, getAllBlockVersions, addANewBlockVariant } = require('../../utils/registryUtils')
const { downloadSourceCode, getSignedSourceCodeUrl } = require('./sourceCodeUtil')
const { wantToCreateNewVersion, confirmationPrompt } = require('../../utils/questionPrompts')
const checkBlockNameAvailability = require('../../utils/checkBlockNameAvailability')
const createBlock = require('../../utils/createBlock')
const { appConfig } = require('../../utils/appconfigStore')
const { blockTypeInverter } = require('../../utils/blockTypeInverter')

const cloneBlock = async ({ block_name, git_url, rootPath }) => {
  spinnies.add(block_name, { text: `Pulling ${block_name}` })
  const prefersSsh = configstore.get('prefersSsh')
  const originUrl = prefersSsh ? git_url : convertGitSshUrlToHttps(git_url)
  const Git = new GitManager(rootPath, block_name, originUrl, prefersSsh)
  const blockFolderPath = path.join(rootPath, block_name)
  await Git.clone(blockFolderPath)
  spinnies.succeed(block_name, { text: `Pulled ${block_name} ` })

  return { blockFolderPath }
}

const pullSourceCode = async ({ metaData, blockTypes }) => {
  console.log(chalk.dim('No access to clone or fork the repository. Pulling code from appblocks'))
  spinnies.add('pbp', { text: `Pulling ${metaData.block_name} source code` })
  const packageFolderPath = path.resolve('.', metaData.block_name)

  const { download_url, member_blocks_url } = await getSignedSourceCodeUrl({
    metaData,
    blockId: metaData.block_id,
  })
  if (!download_url) throw new Error('Error getting source code from appblocks')
  await downloadSourceCode(download_url, packageFolderPath, metaData.block_name)

  if (member_blocks_url) {
    await Promise.all(
      member_blocks_url.map(async (mem) => {
        const { block_type, block_name, download_url: dUrl } = mem
        if (blockTypes?.length && !blockTypes.includes(block_type)) return false
        const blockFolderPath = path.join(packageFolderPath, block_name)
        spinnies.add(block_name, { text: `Pulling ${mem.block_name} source code` })
        await downloadSourceCode(dUrl, blockFolderPath, mem.block_name)
        spinnies.remove(block_name)
        return true
      })
    )
  }

  spinnies.succeed('pbp', { text: 'Pulled package block successfully ' })
}

const createCustomVariant = async ({ metaData, packageConfigData, blockTypes }) => {
  const avPackName = await checkBlockNameAvailability(metaData.block_name)

  const {
    clonePath,
    cloneDirName,
    blockFinalName,
    blockId: newPBlockId,
  } = await createBlock(
    avPackName,
    avPackName,
    metaData.block_type,
    metaData.git_url,
    false,
    '.',
    false,
    null,
    metaData
  )

  const pbPath = path.join(clonePath, cloneDirName)
  const pbcPath = path.join(pbPath, 'block.config.json')
  const pbc = JSON.parse(readFileSync(pbcPath))
  pbc.blockId = newPBlockId
  pbc.dependencies = {}
  writeFileSync(pbcPath, JSON.stringify(pbc, null, 2))

  await addANewBlockVariant({
    block_id: newPBlockId,
    version_id: metaData.version_id,
    parent_id: metaData.parent_id,
  })

  await appConfig.init(pbPath, null, 'pull', { reConfig: true })

  // pull member blocks
  const { dependencies } = packageConfigData

  for await (const dep of Object.values(dependencies)) {
    const { name, type, source, blockId: parentBlockId, blockVersionId, blockVersion } = dep.meta
    console.log(`Pulling ${name} block as ${`${avPackName}_${name}`}`)
    // eslint-disable-next-line no-continue
    if (blockTypes?.length && !blockTypes.includes(type)) continue

    const avBlockName = await checkBlockNameAvailability(`${avPackName}_${name}`)

    const {
      clonePath: cPath,
      cloneDirName: cDir,
      blockFinalName: bFName,
      blockId: memberBlockId,
    } = await createBlock(
      avBlockName,
      avBlockName,
      blockTypeInverter(type),
      source.ssh,
      false,
      pbPath,
      false,
      null,
      { version_number: blockVersion },
      newPBlockId
    )

    const bPath = path.join(cPath, cDir)
    const bcPath = path.join(bPath, 'block.config.json')
    const bc = JSON.parse(readFileSync(bcPath))
    bc.blockId = memberBlockId
    writeFileSync(bcPath, JSON.stringify(bc, null, 2))

    appConfig.addBlock({ directory: path.relative(pbPath, bPath), meta: bc })

    spinnies.add(name, { text: `Creating variant ${bFName} block` })
    await addANewBlockVariant({
      block_id: memberBlockId,
      version_id: blockVersionId,
      parent_id: parentBlockId,
    })

    spinnies.succeed(name, { text: `Pulled ${bFName} block successfully` })
  }

  console.log(chalk.green(`${metaData.block_name} pulled to ${blockFinalName} successfully!`))
}

const pullPackage = async ({ metaData, args, componentVersion }) => {
  let blockMetaData = metaData
  const { blockTypes } = args

  if (!blockMetaData.block_id) {
    // get the version id of the latest version of parent
    spinnies.add('pab', { text: 'Getting block meta details' })
    const c = await getBlockMetaData(blockMetaData.id)
    spinnies.remove('pab')
    if (c.data.err) {
      throw new Error(c.data.msg)
    }
    const compMetaData = c.data.data
    blockMetaData = { ...compMetaData, ...metaData }
    blockMetaData.parent_id = compMetaData.purchased_parent_block_id || blockMetaData.block_id
  } else {
    blockMetaData.parent_id = blockMetaData.purchased_parent_block_id || blockMetaData.block_id
  }

  // const { pull_by_config } = metaData

  spinnies.add('pab', { text: 'checking block permission ' })
  const { data: pData, error: pErr } = await post(getBlockPermissionsApi, {
    block_id: blockMetaData.block_id,
  })
  spinnies.remove('pab')
  if (pErr) throw pErr
  delete pData.data?.id
  blockMetaData = { ...blockMetaData, ...pData.data }

  const {
    has_access: hasBlockAccess,
    has_pull_access: hasPullBlockAccess,
    block_visibility: blockVisibility,
    // is_purchased_variant: isPurchasedVariant,
  } = blockMetaData

  const statusFilter = hasBlockAccess ? undefined : [4]
  const versionOf = blockMetaData.block_id
  const bv = await getAllBlockVersions(versionOf, {
    status: statusFilter,
  })

  if (bv.data.err) {
    throw new Error(bv.data.msg)
  }

  if (bv.status === 204) {
    throw new Error('No version found for the block to pull')
  }

  const blockVersions = bv.data.data
  const latestVersion = blockVersions?.[0]

  if (componentVersion) {
    blockMetaData.version_id = blockVersions.find((v) => v.version_number === componentVersion)?.id
    blockMetaData.version_number = componentVersion
  } else {
    blockMetaData.version_id = latestVersion?.id
    blockMetaData.version_number = latestVersion?.version_number
  }

  spinnies.add('pab', { text: 'Getting package config data ' })
  const { data: appConfigData, error } = await post(appBlockGetAppConfig, {
    block_id: blockMetaData.block_id,
    block_version_id: blockMetaData.version_id,
  })
  spinnies.remove('pab')
  if (error) throw error
  const packageConfigData = appConfigData?.data?.app_config
  if (!packageConfigData) throw new Error('Error getting app config data')

  const createCustomVariantFlag = await wantToCreateNewVersion(blockMetaData.block_name)

  if (createCustomVariantFlag) {
    if (!blockMetaData.version_id) throw new Error('Cannot create variant without version')
    const goAhead = await confirmationPrompt({
      message: `Create variant from ${blockMetaData.block_name}@${blockMetaData.version_number} ?`,
      name: 'createVersion',
      default: true,
    })

    if (!goAhead) throw new Error('Cancelled variant creation')
  }

  if (createCustomVariantFlag) {
    if (blockVisibility !== 4 && !hasPullBlockAccess) {
      throw new Error('Access denied for block')
    }

    await createCustomVariant({ metaData: blockMetaData, packageConfigData, blockTypes })
    return true
  }

  if (blockVisibility === 4 && !hasPullBlockAccess) {
    if (!blockMetaData.version_id) {
      throw new Error('Cannot pull public block without version')
    }
    await pullSourceCode({ metaData: blockMetaData, packageConfigData })
    return true
  }

  if (!hasPullBlockAccess) {
    throw new Error('No access for package block clone')
  }

  const { blockFolderPath: packageFolderPath } = await cloneBlock({
    block_name: blockMetaData.block_name,
    git_url: blockMetaData.git_url,
    rootPath: path.resolve('.'),
  })

  const { dependencies } = packageConfigData

  // await appConfig.init(packageFolderPath, null, 'pull')

  if (dependencies) {
    await Promise.all(
      Object.values(dependencies).map(async (dep) => {
        const { type, name, source } = dep.meta
        if (blockTypes?.length && !blockTypes.includes(type)) return false
        await cloneBlock({ block_name: name, git_url: source.ssh, rootPath: packageFolderPath })
        return true
      })
    )
  }

  spinnies.add('pbp', { text: 'Pulled package block successfully ' })
  spinnies.succeed('pbp', { text: 'Pulled package block successfully ' })

  return true
}

module.exports = { pullPackage }
