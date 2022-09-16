/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const cloneTr = ({ data }) => data.cloneTemplateRepository.repository
const clone = `mutation($description:String, $templateRepo:ID!,$owner:ID!,$name:String!,$visibility:RepositoryVisibility!){
    cloneTemplateRepository(input: { description:$description, repositoryId: $templateRepo, name: $name, ownerId: $owner, visibility: $visibility}) {
      repository {
        id
        resourcePath
        description
        visibility
        url
        sshUrl
        name
      }
    }
  }`

/**
 * @typedef FF
 * @type {Object}
 * @property {String} id
 * @property {String} resourcePath
 * @property {String} description
 * @property {String} visibility
 * @property {String} name
 * @property {String} url
 * @property {String} sshUrl
 */
/**
 * @returns {FF}
 */
const createTr = ({ data }) => data.createRepository.repository
const create = `mutation( $template:Boolean, $description:String, $team:ID,$owner:ID,$name:String!,$visibility:RepositoryVisibility!){
  createRepository(input: {template:$template, description:$description, ownerId: $owner, teamId: $team, name: $name, visibility: $visibility}){
    repository{
      id
      resourcePath
      description
      visibility
      name
      url
      sshUrl
    }
  }
}`
module.exports = {
  cloneTemplateRepository: { Q: clone, Tr: cloneTr },
  createRepository: { Q: create, Tr: createTr },
}
