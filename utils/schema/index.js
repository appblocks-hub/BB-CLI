const { object, string, lazy } = require('yup')
const { blockTypes } = require('../blockTypes')

const type = string()
  .required()
  .matches(new RegExp(blockTypes.flatMap((v) => v[0]).join('|')), { excludeEmptyString: true })

const sourceSchema = object({
  ssh: string().required(),
  https: string().required(),
})

const blockMetaSchema = object({
  name: string().required(),
  type,
  source: sourceSchema,
  start: string().required(),
  build: string().required(),
  postPull: string().required(),
})

const blockSchema = object({
  directory: string().required(),
  meta: blockMetaSchema,
})

const schema = object({
  name: string().required(),
  source: sourceSchema,
  type: string()
    .required()
    .matches(/appBlock/),
  dependencies: lazy((obj) => object(Object.keys(obj).reduce((acc, curr) => ({ ...acc, [curr]: blockSchema }), {}))),
})

module.exports = { appblockConfigSchema: schema }
