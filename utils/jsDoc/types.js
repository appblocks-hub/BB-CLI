/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * @typedef {Object} blockMetaData
 * @property {String} CreatedAt
 * @property {String} UpdatedAt
 * @property {String| null} DeletedAt
 * @property {String} ID
 * @property {Number} BlockType
 * @property {String} BlockName
 * @property {String} BlockShortName
 * @property {String} BlockDesc
 * @property {Boolean} IsPublic
 * @property {String} GitUrl
 * @property {Number} Lang
 * @property {Number} Status
 * @property {Boolena} Verified
 */

/**
 * @typedef blockSource
 * @type {Object}
 * @property {String} ssh SSH url to repo
 * @property {String} https HTTPS url to repo
 */

/**
 * @typedef {Object} dependecyMetaShape
 * @property {String} name Name of block
 * @property {String} type Type of block in String
 * @property {String} build Build command
 * @property {String} start Start command
 * @property {String} language Language
 * @property {String} postPull Post pull command
 * @property {blockSource} source Source of block
 */

/**
 * @typedef {Object.<...Object.<String,dependencyShape>>} dependencies
 */

/**
 * @typedef {Object} dependencyShape
 * @property {String} directory Local block directory path
 * @property {dependecyMetaShape} meta Meata details of block
 */

/**
 * @typedef {Object} appblockConfigShape
 * @property {String} name Name of appblock
 * @property {String} type Type of block, should be 'appBlock'
 * @property {String} blockPrefix Prefix for block repos
 * @property {blockSource} source
 * @property {dependencies} dependencies
 */

/**
 * @typedef {Object} roleDetails
 * @property {String} r.name Rome name
 * @property {String} description Role description
 * @property {String} id Id
 * @property {Boolean} is_owner Is owner?
 */
/**
 * @typedef {object} spaceDetails
 * @property {Boolean} is_default The default space created on user creation (cannot be deleted by user)
 * @property {String} space_id Id
 * @property {String} space_name Name
 * @property {String} logo_url Url
 * @property {('P' | 'B')} type P-personal & B-Bussiness
 * @property  {Array<roleDetails>} roles
 */

module.exports = {}
