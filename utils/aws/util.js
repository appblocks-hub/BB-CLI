const { readInput } = require('../questionPrompts')

const readAWSCredConfig = async () => {
  const accessKeyId = await readInput({
    name: 'accessKeyId',
    message: 'Enter aws access key ID ',
    validate: (input) => {
      if (!input || input?.length < 3) return `Invalid input`
      return true
    },
  })

  const secretAccessKey = await readInput({
    name: 'secretAccessKey',
    message: 'Enter aws secret access key ',
    validate: (input) => {
      if (!input || input?.length < 3) return `Invalid input`
      return true
    },
  })

  const region = await readInput({
    name: 'region',
    message: 'Enter aws region ',
    default: 'us-east-1',
    validate: (input) => {
      if (!input || input?.length < 3) return `Invalid input`
      return true
    },
  })

  return {
    accessKeyId,
    secretAccessKey,
    region,
  }
}

module.exports = { readAWSCredConfig }
