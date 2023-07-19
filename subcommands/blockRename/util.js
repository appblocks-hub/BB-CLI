const { configstore, headLessConfigStore } = require('../../configstore')
const { isInRepo } = require('../../utils/Queries')
const { githubGraphQl } = require('../../utils/api')
const { axios } = require('../../utils/axiosInstances')
const { getGitHeader } = require('../../utils/getHeaders')

async function updateRepoName(repoUrl, newName) {
  try {
    const repoHttpsUrl = repoUrl.replace('.git', '').split('/')
    const githubUserName = headLessConfigStore().get('localGitName') || configstore.get('githubUserName')
    const repoName = repoHttpsUrl[repoHttpsUrl.length - 1]
    const orgName = repoHttpsUrl[repoHttpsUrl.length - 2]

    const axiosExistingRepoData = await axios.post(
      githubGraphQl,
      {
        query: isInRepo.Q,
        variables: { user: githubUserName, reponame: repoName, orgname: orgName },
      },
      { headers: getGitHeader() }
    )

    const existingRepoData = isInRepo.Tr(axiosExistingRepoData)
    const { repoId } = existingRepoData

    const mutation = `
    mutation {
      updateRepository(input: { repositoryId: "${repoId}", name: "${newName}" }) {
        repository {
          name
          url
          sshUrl
        }
      }
    }
  `

    const res = await axios.post(githubGraphQl, { query: mutation }, { headers: getGitHeader() })
    if (res.data.errors?.length) throw res.data.errors
    return res
  } catch (error) {
    throw new Error(`Error updating repository name`)
  }
}

module.exports = { updateRepoName }
