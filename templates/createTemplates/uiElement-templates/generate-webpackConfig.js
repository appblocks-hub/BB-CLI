/* eslint-disable */

const generateUiElementWebpack = (name) => `
import HtmlWebpackPlugin from 'html-webpack-plugin'
import path from 'path'
import webpack from 'webpack'
import exposed from './federation-expose.js'

const ModuleFederationPlugin = webpack.container.ModuleFederationPlugin

import { env } from '@appblocks/node-sdk'
env.init()

const __dirname = path.resolve()

const port =
  (process.env.BLOCK_ENV_URL_${name} &&
    Number(
      process.env.BLOCK_ENV_URL_${name}.substr(
        process.env.BLOCK_ENV_URL_${name}.length - 4
      )
    )) ||
  3000;

export default {
  entry: './src/index',
  mode: 'development',
  devServer: {
    static: path.join(__dirname, 'dist'),
    port,
  },
  externals: {
    env: JSON.stringify(process.env),
  },
  output: {
    publicPath: 'auto',
  },
  module: {
    rules: [
      {
        test: /.js$/,
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-react'],
        },
      },
      {
        test: /.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /.m?js/,
        type: 'javascript/auto',
      },
      {
        test: /.m?js/,
        resolve: {
          fullySpecified: false,
        },
      },
      {
        test: /.(jpg|png|svg)$/,
        use: {
          loader: "url-loader",
        },
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': JSON.stringify(process.env),
    }), 
    new ModuleFederationPlugin({
      name: '${name}',
      filename: 'remoteEntry.js',
      exposes: exposed,
      shared: {
        react: {
          import: 'react', // the "react" package will be used a provided and fallback module
          shareKey: 'react', // under this name the shared module will be placed in the share scope
          shareScope: 'default', // share scope with this name will be used
          singleton: true, // only a single version of the shared module is allowed
          requiredVersion: '^18.2.0',
        },
        'react-dom': {
          import: 'react-dom', // the "react" package will be used a provided and fallback module
          shareKey: 'react-dom', // under this name the shared module will be placed in the share scope
          shareScope: 'default', // share scope with this name will be used
          singleton: true, // only a single version of the shared module is allowed
          requiredVersion: '^18.2.0',
        },
        'react-redux': {
          import: 'react-redux', // the "react" package will be used a provided and fallback module
          shareKey: 'react-redux', // under this name the shared module will be placed in the share scope
          shareScope: 'default', // share scope with this name will be used
          singleton: true, // only a single version of the shared module is allowed
          version: '^7.2.5',
        },
        'react-router-dom': {
          import: 'react-router-dom',
          shareKey: 'react-router-dom',
          shareScope: 'default',
          singleton: true,
          version: '^6.9.0',
        },
        '@appblocks/js-sdk': {
          import: '@appblocks/js-sdk',
          shareKey: '@appblocks/js-sdk',
          shareScope: 'default',
          singleton: true,
          version: '^0.0.11',
        },
        'react-query': {
          import: 'react-query',
          shareKey: 'react-query',
          shareScope: 'default',
          singleton: true,
          version: '^3.39.2',
        },
        "state-pool": {
          requiredVersion: "^0.8.1",
          singleton: true, // only a single version of the shared module is allowed
        },
      },
    }),
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
  ],
}

`

module.exports = { generateUiElementWebpack }
