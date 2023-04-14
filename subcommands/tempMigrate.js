/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const {resolve}=require("path")
const {unlinkSync,readFileSync} =require("fs")
const { GitManager } = require('../utils/gitmanager')
const { appConfig } = require('../utils/appconfigStore')
const appconfigStore = require("../utils/appconfigStore")
const { configstore } = require('../configstore')
const { readInput } = require('../utils/questionPrompts')
const { githubGraphQl } = require('../utils/api')
const { isInRepo } = require('../utils/Queries')
const { createRepository } = require('../utils/Mutations')



/**
 * @typedef {object} _p1
 * @property {string} pckName
 * @property {import('../utils/jsDoc/types').dependencies} dependencies
 */

/**
 * Generate the raw for cli-table
 * @param {Boolean} isLive running status of block
 * @param {import('../utils/jsDoc/types').blockDetailsWithLive} g Block details with live data
 * @returns {Array<String>}
 */


const tempMigrate = async (options) => {
  try{
  const { global: isGlobal } = options
  await appConfig.init(null, null, null, {
    isGlobal,
  })

  const rootConfig=appConfig.config
  const rootPath=appConfig.cwd

  console.log("root config is \n",rootConfig)
  console.log("rootpath is \n",rootPath)

  //removing .git from the root package block
  // fs.rmdirSync(rootPath+"/.git",{recursive: true})


  //removing .git from all the member blocks
  for (const block of appConfig.getDependencies(true)) {
    //finding out the path of each member block and deleting the .git file inside the member block folder
    blockGitFilePath=resolve(rootPath+"/"+block.directory+"/.git")
        
    // fs.rmdirSync(blockGitFilePath, {recursive: true})

    console.log("git deletion path is ,,,,,,,,,,,,,,,,,,,,,,,,,,,, \n",blockFilePath)

  }

  return 

  console.log("config store is \n",configstore)

  
  const githubUserName = configstore.get('githubUserName')
  const repoHttpsUrl=rootConfig.source.https.replace(".git","").split("/")
  const repoName=repoHttpsUrl[repoHttpsUrl.length-1]
  const orgName=repoHttpsUrl[repoHttpsUrl.length-2]


  console.log("github user name \n",githubUserName)
  console.log("repo name is  \n",repoName)
  console.log("org name is  \n",orgName)


return {}

  const data = await (async function callToGitHub(checkThisName) {
  
    const sourceSsh=appConfig.source.https.trim()
    const prefixName = "project"
    const BLOCKNAME = `${prefixName}_${checkThisName}`

    unlinkSync(rootPath+"/.git")

   
    const axiosExistingRepoData=await axios.post(
      githubGraphQl,
      {
        query: isInRepo.Q,
        variables: {
          user:githubUserName,
          reponame:"",
          orgname:""
        },
      },
      { headers: headersV4 }
    )

    const existingRepoData=await isInRepo.Tr(axiosExistingRepoData)
   
    

    console.log("existing repo data is \n",existingRepoData)

    throw new Error("testing existing repo data")

    // console.log(BLOCKNAME)
    const { data: innerData } = await axios.post(
      githubGraphQl,
      {
        query:createRepository.Q,
        variables: {
          name: BLOCKNAME,
          owner: existingRepoData.ownerId,
          templateRepo: null,
          template: false,
          description: existingRepoData.description,
          visibility: existingRepoData.visibility,
          team: null,
        },
      },
      { headers: headersV4 }
    )
    if (innerData.errors) {
      // TODO -- write data.errors.message to combined log here

      // TODO -- if errored because repo name already taken..prompt for a
      // new availbale block short name and try again
      if (innerData.errors.length === 1 && innerData.errors[0].type === 'UNPROCESSABLE') {
        // await checkBlockNameAvailability('', true)
        // Could be repo name already exists error
        // console.log(chalk.red(`Repo name ${BLOCKNAME} already exists\n`))


        const newRepo = await readInput({
          name: 'newRepo',
          message: 'Enter the repository name',
          validate: (input) => {
            if (!input || input?.length < 3) return `Please enter the repository name with atleast 3 characters`
            return true
          },
        })

        return callToGitHub(newRepo)
      }
      throw new Error(`Something went wrong with query,\n${JSON.stringify(innerData)}`)
    }

    return innerData
  })(blockShortName)


  const Git = new GitManager(rootPath, 'Git instance for migrate',rootConfig.source.ssh,false)



  

 
  }catch(e){
    console.log("Error running migrations \n",e)
  }
  
}

module.exports = tempMigrate
