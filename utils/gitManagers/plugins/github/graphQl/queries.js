/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// eslint-disable-next-line no-unused-vars
const { AxiosResponse } = require('axios')

/**
 * @template K,D
 * @typedef {Record<K,D>} graphData
 */
/**
 * @template E
 * @typedef {Array<E>} graphErrors
 */
/**
 * @template T,I
 * @typedef {object} gitGraphResponseData
 * @property {graphData<'user'|'search',T>} data
 * @property {graphErrors<I>} errors
 */
/**
 * @template N
 * @typedef {Array<N>} edges
 */
/**
 * @typedef {object} pageInfo
 * @property {boolean} hasNextPage
 * @property { boolean} hasPreviousPage
 * @property {string} startCursor
 * @property {string} endCursor
 */

/**
 *
 * @param {AxiosResponse} response
 */
const userReposTr = ({ data: { data, errors } }, sieve) => {
  if (errors?.length > 0) throw errors
  const list = data.user.repositories.edges
    .filter(sieve || Boolean)
    .map((r) => ({ name: r.node.name, value: r.node.id }))
  return { list, ...data.user.repositories.pageInfo }
}
const templateSieve = (r) => r.node.isTemplate
const userReposTrTemplate = (data) => userReposTr.apply(null, [data, templateSieve])
const userReposTrURL = ({ data: { data } }) => {
  const list = data.user.repositories.edges.map((r) => ({
    name: r.node.name,
    value: { url: r.node.url, name: r.node.name },
  }))
  return { list, ...data.user.repositories.pageInfo }
}

/**
 * @typedef {object} userReposNode
 * @property {*} id
 * @property {*} isTemplate
 * @property {*} name
 * @property {*} description
 * @property {*} url
 */
const userRepos = `
query($user:String!,$first:Int,$last:Int,$before:String,$after:String){
    user(login: $user) {
      repositories(first:$first,last:$last,before:$before,after:$after, affiliations: [ORGANIZATION_MEMBER, OWNER, COLLABORATOR], ownerAffiliations: [ORGANIZATION_MEMBER, OWNER, COLLABORATOR]) {
        totalCount
        pageInfo{
          endCursor
          hasNextPage
          hasPreviousPage
          startCursor
        }
        edges {
          node {
            id
            isTemplate
            name
            description
            url
          }
        }
      }
    }
}
`

/**
 *
 * @param {AxiosResponse} data
 * @returns {QueryTransformReturn}
 */
const userOrgsTR = ({ data: { data, errors } }) => {
  if (errors?.length > 0) throw errors

  const list = data.user.organizations.edges.map((v) => ({
    name: v.node.name,
    // split("/") -- To get name of org so it can be used
    // to get team list of organization in later prompt,
    // TODO -- if possible change choice object of inquirer to accommodate this,
    // and return ans with name and not just answer
    value: `${v.node.name}/${v.node.id}`,
  }))
  return { list, ...data.user.organizations.pageInfo }
}
/**
 * @typedef {object} userOrgsNode
 * @property {string} id
 * @property {string} name
 */
const userOrgs = `
query($first:Int,$last:Int,$before:String,$after:String,$user:String!){
    user(login: $user) {
        organizations(first:$first,last:$last,before:$before,after:$after) {
            edges {
                node {
                    id
                    name
                }
            }
            pageInfo{
                hasNextPage
                hasPreviousPage
                startCursor
                endCursor
              }
        }
    }
}
`

/**
 *
 * @param {AxiosResponse} data
 * @returns {QueryTransformReturn}
 */
const getRepoDetailsTR = ({ data: { data, errors } }) => {
  if (errors?.length > 0) throw errors
  return { ...data.repository, defaultBranchName: data.repository.defaultBranchRef?.name }
}
/**
 * @property {string} repoOwner
 * @property {string} repoName
 */
const getRepoDetails = `
query GetRepositoryDetails($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    id
    name
    owner {
      __typename
      ... on User {
        login
      }
      ... on Organization {
        login
      }
    }
    url
    sshUrl
    description
    isInOrganization
    visibility
    defaultBranchRef {
      name
    }
    createdAt
    updatedAt
  }
}
`

/**
 *
 * @param {AxiosResponse<gitGraphResponseData<_xxc_,''>>} param0
 * @returns
 */
const isRepoNameAvailableTr = ({ data: { data } }) => !data.user?.repository
/**
 * @typedef {object} _xxc_
 * @property {string} id ID of user
 * @property {string} name Name of user (same as the name passed)
 * @property {{id:string}?} repository Will be null, if repository with the passed name doesn't exist. Else returns ID
 */
const isRepoNameAvailable = ` query ($user:String!,$search:String!) {
  user(login: $user) {
    id
    name
    repository(name: $search) {
      id
    }
  }
}`

module.exports = {
  userRepos: { Q: userRepos, Tr: userReposTr, Tr_t: userReposTrTemplate, Tr_URL: userReposTrURL },
  userOrgs: { Q: userOrgs, Tr: userOrgsTR },
  getRepoDetails: { Q: getRepoDetails, Tr: getRepoDetailsTR },
  isRepoNameAvailable: { Q: isRepoNameAvailable, Tr: isRepoNameAvailableTr },
}
