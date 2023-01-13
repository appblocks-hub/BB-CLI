/* eslint-disable prefer-const */
/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
const { writeFileSync } = require('fs')
const { readInput } = require('../../../../utils/questionPrompts')

const generateDockerFile = ({ ports, dependencies }) => {
  const fileData = `
#syntax=docker/dockerfile:1
FROM node:16.3.0-alpine

RUN apk --no-cache add git

ENV NODE_ENV production

WORKDIR .

COPY ._ab_em ./._ab_em/
COPY package.json .
${dependencies.map((dep) => `COPY ${dep.directory} ./${dep.directory}/\n`)}
COPY .env.function .

RUN npm i
# RUN npm ci --only=production

EXPOSE ${ports}

RUN npm install pm2 -g

# USER node

CMD ["pm2-runtime", "._ab_em/index.js", "-i max"]

`
  writeFileSync('./Dockerfile', fileData)
}

const generateRootPackageJsonFile = ({ appName, dependencies }) => {
  // const npmInstallCmd = "npm ci --only=production"
  const npmInstallCmd = 'npm i'
  const postinstall = dependencies.map(({ directory }) => `(cd ${directory} && ${npmInstallCmd})`).join(';')

  const fileData = `
{
    "name": "${appName}",
    "version": "1.0.0",
    "scripts": {
      "postinstall": "(cd ._ab_em && ${npmInstallCmd});${postinstall}"
    }
}
    `
  writeFileSync('./package.json', fileData)
}

const getAWSECRConfig = async (options) => {
  const { appName, envName } = options
  const container = await readInput({
    name: 'container',
    message: 'Enter a name of container',
    default: `${appName}${envName}container`.toLowerCase(),
    validate: (input) => {
      if (!input || input.length < 5) return `Name should be at least 5 characters`
      if (!/[a-z0-9]/.test(input)) return `Name should contian only small letters and numbers`
      return true
    },
  })
  return { container }
}

module.exports = {
  generateDockerFile,
  generateRootPackageJsonFile,
  getAWSECRConfig,
}
