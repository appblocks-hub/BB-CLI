/**
 * Copyright (c) Yahilo. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const api = {}

// api.appBlockOrigin = `http://shield.appblock.io`
api.appBlockOrigin = `https://dev.shield.yahilo.com`
api.appBlockLogin = `${api.appBlockOrigin}/login`
api.appBlockAccessToken = `${api.appBlockOrigin}/auth/device/get-token`

api.appBlockRegistryOrigin = `https://dev.api.blocks-registry.yahilo.com`
api.appBlockCheckBlockNameAvailability = `${api.appBlockRegistryOrigin}/api/registry/v0.1/check-block-name-availabilty`
api.appBlockRegister = `${api.appBlockRegistryOrigin}/api/registry/v0.0.1/register-block`
api.appBlockEditBlock = `${api.appBlockRegistryOrigin}/api/registry/v0.0.1/edit-block`
api.appBlockChangeBlockVisibility = `${api.appBlockRegistryOrigin}/api/registry/v0.1/change-block-visibility`
api.appBlockAddBlockMapping = `${api.appBlockRegistryOrigin}/api/registry/v0.1/add-block-mapping`
api.appBlockRemoveBlockMapping = `${api.appBlockRegistryOrigin}/api/registry/v0.1/add-block-mapping`
api.appBlockGetBlockDetails = `${api.appBlockRegistryOrigin}/api/registry/v0.1/get-block-details`
api.appBlockGetBlockMetadata = `${api.appBlockRegistryOrigin}/api/registry/v0.1/get-block-metadata`
api.appBlockGetPresignedUrlForReadMe = `${api.appBlockRegistryOrigin}/api/registry/v0.1/create-readme-signed-url`
api.appBlockUpdateReadme = `${api.appBlockRegistryOrigin}/api/registry/v0.1/update-readme`
api.appBlockAddVersion = `${api.appBlockRegistryOrigin}/api/registry/v0.1/add-block-version`
api.appBlockUpdateAppConfig = `${api.appBlockRegistryOrigin}/api/registry/v0.1/update-app-config`
api.appBlockGetAppConfig = `${api.appBlockRegistryOrigin}/api/registry/v0.1/get-app-config`
api.appRegistryAssignTags = `${api.appBlockRegistryOrigin}/api/registry/v0.1/assign-block-tags`
api.appRegistryAssignCategories = `${api.appBlockRegistryOrigin}/api/registry/v0.1/assign-block-category`
api.appRegistryGetCategories = `${api.appBlockRegistryOrigin}/api/registry/v0.1/list-categories`
api.createSourceCodeSignedUrl = `${api.appBlockRegistryOrigin}/api/registry/v0.1/create-source-code-signed-url`
api.saveDependencies = `${api.appBlockRegistryOrigin}/api/registry/v0.1/upsert-dependencies`
api.createSourceCodeSignedUrl = `${api.appBlockRegistryOrigin}/api/registry/v0.1/create-source-code-signed-url`

api.appBlockAppRegistryOrigin = `https://dev.api.app-registry.yahilo.com`
api.appRegistryCreateApp = `${api.appBlockAppRegistryOrigin}/api/app-registry/v0.1/create-app`
api.appRegistryUploadBlockStatus = `${api.appBlockAppRegistryOrigin}/api/app-registry/v0.1/upload-bloxes`
api.appRegistryCheckAppEnvExist = `${api.appBlockAppRegistryOrigin}/api/app-registry/v0.1/check-app-env-exist`
api.appRegistryCreateDeployPresignedUrl = `${api.appBlockAppRegistryOrigin}/api/app-registry/v0.1/create-deploy-signed-url`
api.appRegistryCheckDomainName = `${api.appBlockAppRegistryOrigin}/api/app-registry/v0.1/check-domain-name`

const github = {}
github.githubOrigin = `https://github.com`
github.githubGraphQl = `https://api.github.com/graphql`
github.githubLogin = 'https://github.com/login'
github.githubDeviceLogin = `${github.githubLogin}/device`
github.githubGetDeviceCode = `${github.githubLogin}/device/code`
github.githubGetAccessToken = `${github.githubLogin}/oauth/access_token`
github.githubClientID = '5a77c38abd2e3e84d4e9'

module.exports = { ...api, ...github }
