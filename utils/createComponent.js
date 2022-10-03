/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const inquirer = require('inquirer')
const { Observable } = require('rxjs')
const createRepo = require('./createRepo')
const { getOrgId } = require('./questionPrompts')
const { configstore } = require('../configstore')
const { appConfig } = require('./appconfigStore')

function createComponent(blockShortName, createFromExistinURL, clonePath) {
  /**
   * @type {Subscriber}
   */
  let Emitter

  const stream = new Observable((obs) => {
    Emitter = obs
    // there is no need for this question from now on,
    // can start with where to create..
    // TODO-- delete and refactor, remove the first question
    obs.next({
      type: 'list',
      message: 'where to create repo',
      name: 'where',
      choices: ['my git', 'org git'],
    })
    // obs.next({
    //   type: 'input',
    //   name: 'addFromExisting',
    //   message: `Use an existing repo ${chalk.dim(
    //     '(will be added as submodule)'
    //   )}`,
    //   when: (answers) => {
    //     if (createFromExistinURL) {
    //       answers.name = createFromExistinURL
    //       return false
    //     }
    //     answers.name = ''
    //     return false
    //   },
    // })
  })
  return new Promise((res, rej) => {
    let result = {}
    inquirer.prompt(stream).ui.process.subscribe({
      next: async (ans) => {
        const { name, answer } = ans
        switch (name) {
          // case 'addFromExisting':
          // if (answer) {
          // await getRepoURL().then((v) => {
          //   // console.log(v);
          //   // is --name useful? research
          //   execSync(
          //     `git submodule add ${v.url} ${
          //       configstore.get('blockPrefix') + v.name
          //     }`
          //   )
          // })
          // Emitter.complete()
          // } else {
          //   Emitter.next({
          //     type: 'list',
          //     message: 'where to create repo',
          //     name: 'where',
          //     choices: ['my git', 'org git'],
          //   })
          // }
          // break
          case 'where':
            // show  templates after selecting template
            // TODO--list only orgs with write access, change query in QUERIES accordingly
            if (answer === 'my git') {
              // create a repo
              const ret = await createRepo(
                configstore.get('githubUserName'),
                configstore.get('githubUserId'),
                'user',
                null,
                appConfig.prefix || '',
                blockShortName,
                !!createFromExistinURL,
                clonePath || '.'
              )
              // console.log('rose', ret)
              result = ret
              Emitter.complete(ret)
              // if (template) {
              //   //TODO -- make call to create a repo from a template
              // } else {
              //   //TODO--create a repo,
              //   //    --Ask user if readme liscence etc need be created
              // }
            } else {
              /**
               * @type {String}
               */
              const [orgName, orgId] = await getOrgId()
              const ret = await createRepo(
                configstore.get('githubUserName'),
                orgId,
                'org',
                orgName,
                appConfig.prefix || '',
                blockShortName,
                !!createFromExistinURL,
                clonePath || '.'
              )
              // console.log('red', ret)

              result = ret
              Emitter.complete(ret)
              // list orgs
            }
            break
          default:
            break
        }
      },
      error: () => rej(),
      complete: () => res(result),
    })
  })
}

module.exports = createComponent
