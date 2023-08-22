const { axios } = require('../../../../axiosInstances')
const { githubRestOrigin } = require('../auth/githubAPI')
const { getGithubHeader } = require('../auth/githubHeaders')

const handleForkRepository = async (options) => {
  const { userRepo, requestData } = options
  const res = await axios.post(`${githubRestOrigin}/repos/${userRepo}/forks`, requestData, {
    headers: getGithubHeader(),
  })
  return res
}

module.exports = handleForkRepository
