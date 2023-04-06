const generateEsLintRc = () => `
{
    "env": {
      "browser": true,
      "node": true
    },
    "parserOptions": {
      "ecmaVersion": "latest",
      "requireConfigFile": false,
      "babelOptions": {
        "presets": ["@babel/preset-react"]
      }
    },
    "parser": "@babel/eslint-parser",
    "ignorePatterns": [],
    "extends": ["airbnb-base", "prettier", "plugin:react/recommended"],
    "rules": {
      "no-underscore-dangle": "off",
      "no-console": "off",
      "camelcase": "off",
      "no-await-in-loop": 0,
      "no-restricted-syntax": 0,
      "no-use-before-define": [
        "error",
        {
          "functions": false
        }
      ]
    }
}
`

module.exports = { generateUiContainerEsLintRc: generateEsLintRc }
