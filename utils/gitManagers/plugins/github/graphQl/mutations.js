/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const cloneTr = ({ data: { data, errors } }) => {
  if (errors?.length > 0) throw errors
  return data.cloneTemplateRepository?.repository
}
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
const createTr = ({ data: { data, errors } }) => {
  if (errors?.length > 0) throw errors
  return data.createRepository?.repository
}
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

const updateTr = ({ data: { data, errors } }) => {
  if (errors?.length > 0) throw errors
  return data.updateRepository?.repository
}
const update = `
    mutation UpdateRepository($repositoryId: ID!, $updateFields: UpdateRepositoryInput!) {
      updateRepository(input: { repositoryId: $repositoryId, ...$updateFields }) {
        repository {
          id
          name
          description
          resourcePath
          visibility
          url
          sshUrl
        }
      }
    }
  `

const createPrTr = ({ data: { data, errors } }) => {
  if (errors?.length > 0) throw errors
  return data.createPullRequest?.pullRequest
}
const createPr = `mutation($baseRefName:String!, $body:String, $draft:Boolean, $headRefName:String!, $maintainerCanModify:Boolean, $repositoryId:ID!, $title:String!){
  createPullRequest(input: {baseRefName: $baseRefName, body: $body, draft: $draft, headRefName: $headRefName, maintainerCanModify: $maintainerCanModify, repositoryId: $repositoryId, title: $title}) {
    pullRequest {
        id
        title
        url
      }
    }
  }`

module.exports = {
  cloneTemplateRepository: { Q: clone, Tr: cloneTr },
  createRepository: { Q: create, Tr: createTr },
  updateRepository: { Q: update, Tr: updateTr },
  createPr: { Q: createPr, Tr: createPrTr },
}
