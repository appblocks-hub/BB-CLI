const generateWebpackConfig = (options) => {
  const { env, emPort } = options || {}

  const rulesRegex = {
    'babel-loader': /\.jsx?$/,
    'url-loader': /\.(jpg|png|gif|svg|eot|svg|ttf|woff|woff2)$/,
    'sass-loader': /\.s[ac]ss$/i,
    'style-loader': /\.css$/i,
  }

  return `
import HtmlWebpackPlugin from 'html-webpack-plugin'
import ModuleFederationPlugin from 'webpack/lib/container/ModuleFederationPlugin.js'
import path from 'path'
import webpackPkg from 'webpack';
import exposedJson from './federation-expose.js'
import * as dotenv from 'dotenv' 
import { fileURLToPath } from 'url';

const { DefinePlugin } = webpackPkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const env = process.env.NODE_ENV || 'dev'
const Dotenv = dotenv.config({
  path: \`${env ? `./.env.${env}` : './.env'}\`,
})
const config = {
  entry: './src/index',
  mode: 'development',
  resolve: {
    symlinks: true,
  },
  devServer: {
    historyApiFallback: true,
    hot: true,
    static: path.join(__dirname,'dist', 'bootstrap.js'),
    port: ${emPort},
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers':
        'X-Requested-With, content-type, Authorization',
    },
  },
  target: 'web',
  output: {
    publicPath: 'auto',
    crossOriginLoading: 'anonymous',
  },
  optimization: {
    minimize: false,
  },
  module: {
    rules: [
      {
        test: ${rulesRegex['babel-loader']},
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-react'],
        },
      },
      {
        test: ${rulesRegex['url-loader']},
        use: {
          loader: 'url-loader',
        },
      },
      {
        test: ${rulesRegex['sass-loader']},
        use: [
          'style-loader',
          'css-loader',
          {
            loader: 'sass-loader',
            options: {
              // Prefer  \`dart-sass \`
              implementation: import('sass'),
            },
          },
        ],
      },
      {
        test: ${rulesRegex['style-loader']},
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [
    new DefinePlugin({
      process: { env: JSON.stringify(Dotenv.parsed) },
    }),
    new ModuleFederationPlugin({
      name: 'remotes',
      filename: "remoteEntry.js",
      exposes: exposedJson,
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

export default config
`
}

module.exports = { generateWebpackConfig }
