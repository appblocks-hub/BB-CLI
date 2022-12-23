/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const api = {}
// api.appBlockOrigin = `http://shield.appblock.io`
api.appBlockOrigin = `https://shield.appblocks.com`
api.appBlockLogin = `${api.appBlockOrigin}/login`
api.appBlockLogout = `${api.appBlockOrigin}/logout`
api.appBlockAccessToken = `${api.appBlockOrigin}/auth/device/get-token`

// BLOCKS-REGISTRY
api.appBlockRegistryOrigin = `https://api-blocks-registry.appblocks.com`
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
api.getSourceCodeSignedUrl = `${api.appBlockRegistryOrigin}/api/registry/v0.1/get-source-code-signed-url/invoke`
api.addRuntimesApi = `${api.appBlockRegistryOrigin}/api/registry/v0.1/add-runtimes/invoke`
api.getRuntimesApi = `${api.appBlockRegistryOrigin}/api/registry/public/v0.1/get-runtimes/invoke`
api.deleteRuntimesApi = `${api.appBlockRegistryOrigin}/api/registry/v0.1/delete-runtimes/invoke`
api.deleteBlock = `${api.appBlockRegistryOrigin}/api/registry/v0.1/delete-block/invoke`
api.listAppblockVersions = `${api.appBlockRegistryOrigin}/api/registry/public/v0.1/list-appblock-versions/invoke`
api.listLanguageVersions = `${api.appBlockRegistryOrigin}/api/registry/public/v0.1/list-language-versions/invoke`
api.listDependenciesApi = `${api.appBlockRegistryOrigin}/api/registry/public/v0.1/list-dependencies/invoke`
api.addDependenciesApi = `${api.appBlockRegistryOrigin}/api/registry/v0.1/add-dependencies/invoke`
api.publishBlockApi = `${api.appBlockRegistryOrigin}/api/registry/v0.1/publish-block/invoke`

// APP-REGISTRY
api.appBlockAppRegistryOrigin = `https://api-app-registry.appblocks.com`
api.appRegistryCreateApp = `${api.appBlockAppRegistryOrigin}/api/app-registry/v0.1/create-app/invoke`
api.appRegistryCreateHostDns = `${api.appBlockAppRegistryOrigin}/api/app-registry/v0.1/create-host/invoke`
api.appRegistryCreateBucket = `${api.appBlockAppRegistryOrigin}/api/app-registry/v0.1/create-s3-bucket/invoke`
api.appRegistryCreateVmInstance = `${api.appBlockAppRegistryOrigin}/api/app-registry/v0.1/create-ec2-instance/invoke`
api.appRegistryUploadBlockStatus = `${api.appBlockAppRegistryOrigin}/api/app-registry/v0.1/upload-blocks/invoke`
api.appRegistryAddVmEnvUser = `${api.appBlockAppRegistryOrigin}/api/app-registry/v0.1/add-ec2-env-user/invoke`
api.appRegistryDeployFunctions = `${api.appBlockAppRegistryOrigin}/api/app-registry/v0.1/deploy-functions/invoke`
api.appRegistryCreateDiployHistory = `${api.appBlockAppRegistryOrigin}/api/app-registry/v0.1/create-deploy-history/invoke`
api.appRegistryCheckAppEnvExist = `${api.appBlockAppRegistryOrigin}/api/app-registry/v0.1/check-app-env-exist/invoke`
api.appRegistryCreateDeployPresignedUrl = `${api.appBlockAppRegistryOrigin}/api/app-registry/v0.1/create-deploy-signed-url/invoke`
api.appRegistryCopyObject = `${api.appBlockAppRegistryOrigin}/api/app-registry/v0.1/copy-s3-object/invoke`

// SPACES
api.appBlockSpacesOrigin = `https://api-spaces.appblocks.com`
api.appBlockListSpaces = `${api.appBlockSpacesOrigin}/api/spaces/v0.1/list-spaces/invoke`
api.setInUseStatusForBlock = `${api.appBlockSpacesOrigin}/api/spaces/v0.1/set-inuse-block-in-app/invoke`
api.checkBlockAssignedToApp = `${api.appBlockSpacesOrigin}/api/spaces/v0.1/check-assigned-block-to-app/invoke`
api.assignBlockToApp = `${api.appBlockSpacesOrigin}/api/spaces/v0.1/assign-block-to-app/invoke`

// SPACES UI
api.publishRedirectApi = `${api.appBlockSpacesUIOrigin}`

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
