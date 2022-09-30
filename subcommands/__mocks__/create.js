/* eslint-disable */
const create = jest.fn().mockImplementation((c) => {
  return {
    clonePath: 'a/simple/path',
    cloneDirName: 'testHome2',
    blockDetails: {
      name: 'testHome2',
      type: 'ui-elements',
      source: {
        https: 'https://github.com/username/testHome2',
        ssh: 'git@github.com:username/testHome2.git',
      },
      language: 'js',
      start: 'npx webpack-dev-server',
      build: 'npx webpack',
      postPull: 'npm i',
      standAloneBlock: false,
    },
  }
})
module.exports = create
