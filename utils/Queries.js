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
const userReposTr = ({ data: { data } }, sieve) => {
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
 * @param {AxiosResponse<gitGraphResponseData<>>} response
 * @returns {QueryTransformReturn}
 */
const searchGitTr = ({ data: { data } }) => {
  const list = data.search.edges.map((r) => r.node.name)
  return { list, ...data.search.pageInfo }
}

/**
 * @typedef {object} searchGitNode
 * @property {string} name
 * @property {string} description
 */
const searchGit = `
query($first:Int,$last:Int,$before:String,$after:String,$query:String!){
    search(query:$query, type: REPOSITORY, first:$first,last:$last,before:$before,after:$after) {
    edges{
     node{
       ...on Repository{
         name  
         description
        }
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
`

/**
 *
 * @param {AxiosResponse} data
 * @returns {QueryTransformReturn}
 */
const userOrgsTR = ({ data: { data } }) => {
  const list = data.user.organizations.edges.map((v) => ({
    name: v.node.name,
    // split("/") -- To get name of org so it can be used
    // to get team list of organization in later prompt,
    // TODO -- if possible change choice object of inquirer to accomodate this,
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
const appBlockReposTR = ({ data: { data } }) => {
  const list = data.organization.repositories.edges.map((v) => v.node.name)
  return { list, ...data.organization.repositories.pageInfo }
}
const appBlockRepos = `
query($first:Int,$last:Int,$before:String,$after:String){
    organization(login: "appblock-lab") {
        id
        repositories(first:$first,last:$last,before:$before,after:$after) {
            edges {
                node {
                    id
                    isTemplate
                    name
                    description
                }
            }
            pageInfo{
                endCursor
                hasNextPage
                hasPreviousPage
                startCursor
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
const listFlavoursTR = ({ data: { data } }) => {
  const list = data.repository.forks.edges.map((v) => v.node.name)
  return { list, ...data.repository.forks.pageInfo }
}
/**
 * owner and name
 */
const listFlavours = `
query($first:Int,$last:Int,$before:String,$after:String,$owner:String!,$name:String!){
    repository(owner:$owner,name:$name){
        forks(first:$first,last:$last,before:$before,after:$after){
            edges{
                node{
                    name
                    nameWithOwner
                    description
                }
            }
            pageInfo{
                endCursor
                hasNextPage
                hasPreviousPage
                startCursor
            }
        }
    }
}
`

/**
 *
 * @param {AxiosResponse} response
 * @returns {QueryTransformReturn}
 */
const listVersionsTr = ({ data: { data } }) => {
  const list = data.repository.releases.edges.map((r) => r.node.name)
  return { list, ...data.repository.releases.pageInfo }
}
const listVersions = `
query($first:Int,$last:Int,$before:String,$after:String,$owner:String!,$name:String!){
    repository(owner:$owner,name:$name){
        releases(first:$first,last:$last,before:$before,after:$after){
            edges{
                node{
                    name
                    tagName
                }
            }
            pageInfo{
                endCursor
                hasNextPage
                hasPreviousPage
                startCursor
            }
        }
    }
}
`
/**
 *
 * @param {AxiosResponse} param0
 * @returns
 */
const listTeamsTr = ({ data: { data } }) => {
  const list = data.organization.teams.edges.map((r) => ({
    name: r.node.name,
    value: r.node.id,
  }))
  return { list, ...data.organization.teams.pageInfo }
}
const listTeams = `
query ($first:Int,$last:Int,$before:String,$after:String,) {
  organization(login: "appblock-lab") {
    teams(first:$first,last:$last,before:$before,after:$after) {
      edges {
        node {
          name
          id
        }
      }
      pageInfo{
        endCursor
        hasNextPage
        hasPreviousPage
        startCursor
      }
    }
  }
}`

const existingRepoData = ({ data: { data } }) => {
  const isInorg = data?.user?.repository?.isInOrganization || data?.user?.organization?.id
  return {
    isInorg,
    ownerId: isInorg ? data?.user?.organization?.id : data?.user?.id,
    visibility: data?.user?.repository?.visibility,
    description: data?.user?.repository?.description,
    defaultBranchName: data?.user?.repository?.defaultBranchRef?.name,
  }
}

const isInRepo = `query ($user:String!,$reponame:String!,$orgname:String!) {
  user(login: $user) {
    id
    name
    repository(name: $reponame) {
      id
      isInOrganization
      visibility
      description
      defaultBranchRef{
        name
        }
    }
    organization(login: $orgname){
      id
    }
  }
}`

/**
 *
 * @param {AxiosResponse<gitGraphResponseData<_xxc_,''>>} param0
 * @returns
 */
const isRepoNameAvailableTr = ({ data: { data } }) => !data.user.repository
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
  listVersions: { Q: listVersions, Tr: listVersionsTr },
  listFlavours: { Q: listFlavours, Tr: listFlavoursTR },
  searchGit: { Q: searchGit, Tr: searchGitTr },
  userRepos: {
    Q: userRepos,
    Tr: userReposTr,
    Tr_t: userReposTrTemplate,
    Tr_URL: userReposTrURL,
  },
  userOrgs: { Q: userOrgs, Tr: userOrgsTR },
  appBlockRepos: { Q: appBlockRepos, Tr: appBlockReposTR },
  orgTeams: { Q: listTeams, Tr: listTeamsTr },
  isInRepo: { Q: isInRepo, Tr: existingRepoData },
  isRepoNameAvailable: { Q: isRepoNameAvailable, Tr: isRepoNameAvailableTr },
}

// const isInRepoTr = ({ data: { data } }) => {
//   const isInorg = data.user.repository.isInOrganization
//   return {
//     isInorg,
//     ownerId: isInorg ? data.organization.id : data.user.id,
//   }
// }

// const isInRepo = `query ($user:String!,$reponame:String!,$orgname:String!) {
//     user(login: $user) {
//       id
//       name
//       repository(name: $reponame) {
//         id
//         isInOrganization
//       }
//       organization(login: $orgname){
//         id
//       }
//     }
//   }`
