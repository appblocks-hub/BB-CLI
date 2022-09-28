/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const api = {}
const env = process.env.appblocksEnv ? process.env.appblocksEnv : 'dev'
// api.appBlockOrigin = `http://shield.appblock.io`
api.appBlockOrigin = `https://${env}-shield.appblocks.com`
api.appBlockLogin = `${api.appBlockOrigin}/login`
api.appBlockLogout = `${api.appBlockOrigin}/logout`
api.appBlockAccessToken = `${api.appBlockOrigin}/auth/device/get-token`

// BLOCKS-REGISTRY
api.appBlockRegistryOrigin = `https://${env}-api-blocks-registry.appblocks.com`
api.appBlockCheckBlockNameAvailability = `${api.appBlockRegistryOrigin}/api/registry/v0.1/check-block-name-availabilty/invoke`
api.appBlockRegister = `${api.appBlockRegistryOrigin}/api/registry/v0.0.1/register-block/invoke`
api.appBlockEditBlock = `${api.appBlockRegistryOrigin}/api/registry/v0.0.1/edit-block/invoke`
api.appBlockChangeBlockVisibility = `${api.appBlockRegistryOrigin}/api/registry/v0.1/change-block-visibility/invoke`
api.appBlockAddBlockMapping = `${api.appBlockRegistryOrigin}/api/registry/v0.1/add-block-mapping/invoke`
api.appBlockRemoveBlockMapping = `${api.appBlockRegistryOrigin}/api/registry/v0.1/add-block-mapping/invoke`
api.appBlockGetBlockDetails = `${api.appBlockRegistryOrigin}/api/registry/v0.1/get-block-details/invoke`
api.appBlockGetBlockMetadata = `${api.appBlockRegistryOrigin}/api/registry/public/v0.1/get-block-metadata/invoke`
api.appBlockGetAllBlockVersions = `${api.appBlockRegistryOrigin}/api/registry/public/v0.1/get-all-block-version/invoke`
api.appBlockGetPresignedUrlForReadMe = `${api.appBlockRegistryOrigin}/api/registry/v0.1/create-readme-signed-url/invoke`
api.appBlockUpdateReadme = `${api.appBlockRegistryOrigin}/api/registry/v0.1/update-readme/invoke`
api.appBlockAddVersion = `${api.appBlockRegistryOrigin}/api/registry/v0.1/add-block-version/invoke`
api.appBlockCreateVariant = `${api.appBlockRegistryOrigin}/api/registry/v0.1/add-as-variant/invoke`
api.appBlockUpdateAppConfig = `${api.appBlockRegistryOrigin}/api/registry/v0.1/update-app-config/invoke`
api.appBlockGetAppConfig = `${api.appBlockRegistryOrigin}/api/registry/v0.1/get-app-config/invoke`
api.appRegistryAssignTags = `${api.appBlockRegistryOrigin}/api/registry/v0.1/assign-block-tags/invoke`
api.appRegistryAssignCategories = `${api.appBlockRegistryOrigin}/api/registry/v0.1/assign-block-category/invoke`
api.appRegistryGetCategories = `${api.appBlockRegistryOrigin}/api/registry/public/v0.1/list-categories/invoke`
api.createSourceCodeSignedUrl = `${api.appBlockRegistryOrigin}/api/registry/v0.1/create-source-code-signed-url/invoke`
api.saveDependencies = `${api.appBlockRegistryOrigin}/api/registry/v0.1/upsert-dependencies/invoke`
api.createSourceCodeSignedUrl = `${api.appBlockRegistryOrigin}/api/registry/v0.1/create-source-code-signed-url/invoke`

// APP-REGISTRY
api.appBlockAppRegistryOrigin = `https://${env}-api-app-registry.appblocks.com`
api.appRegistryCreateApp = `${api.appBlockAppRegistryOrigin}/api/app-registry/v0.1/create-app/invoke`
api.appRegistryUploadBlockStatus = `${api.appBlockAppRegistryOrigin}/api/app-registry/v0.1/upload-blocks/invoke`
api.appRegistryCheckAppEnvExist = `${api.appBlockAppRegistryOrigin}/api/app-registry/v0.1/check-app-env-exist/invoke`
api.appRegistryCreateDeployPresignedUrl = `${api.appBlockAppRegistryOrigin}/api/app-registry/v0.1/create-deploy-signed-url/invoke`
api.appRegistryCopyObject = `${api.appBlockAppRegistryOrigin}/api/app-registry/v0.1/copy-s3-object/invoke`

// SPACES
api.appBlockSpacesOrigin = `https://${env}-api-spaces.appblocks.com`
api.appBlockListSpaces = `${api.appBlockSpacesOrigin}/api/spaces/v0.1/list-spaces/invoke`

const github = {}
github.githubOrigin = `https://github.com`
github.githubRestOrigin = `https://api.github.com`
github.githubGraphQl = `https://api.github.com/graphql`
github.githubLogin = 'https://github.com/login'
github.githubDeviceLogin = `${github.githubLogin}/device`
github.githubGetDeviceCode = `${github.githubLogin}/device/code`
github.githubGetAccessToken = `${github.githubLogin}/oauth/access_token`
github.githubClientID = '5a77c38abd2e3e84d4e9'

module.exports = { ...api, ...github }
