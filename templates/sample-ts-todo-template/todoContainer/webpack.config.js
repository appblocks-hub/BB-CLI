import HtmlWebpackPlugin from 'html-webpack-plugin'
import path from 'path'
import webpack from 'webpack'

const ModuleFederationPlugin = webpack.container.ModuleFederationPlugin

import { env } from '@appblocks/node-sdk'
env.init()

const __dirname = path.resolve()

const port = 3000

export default {
  entry: './src/index.ts',
  mode: 'development',
  devServer: {
    static: path.join(__dirname, 'dist'),
    port,
    historyApiFallback: true,
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
        test: /.(ts|tsx)$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
        options: {
          presets: ['@babel/preset-env', '@babel/preset-typescript', '@babel/preset-react'],
        },
      },
      {
        test: /.(jpg|png|svg)$/,
        use: {
          loader: 'url-loader',
        },
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': JSON.stringify(process.env),
    }),
    new ModuleFederationPlugin({
      name: 'Container',
      library: { type: 'var', name: 'container' },
      shared: {
        react: {
          import: 'react',
          shareKey: 'react',
          shareScope: 'default',
          singleton: true,
          requiredVersion: '^18.2.0',
        },
        'react-dom': {
          import: 'react-dom',
          shareKey: 'react-dom',
          shareScope: 'default',
          singleton: true,
          requiredVersion: '^18.2.0',
        },
        'react-redux': {
          import: 'react-redux',
          shareKey: 'react-redux',
          shareScope: 'default',
          singleton: true,
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
        'state-pool': {
          requiredVersion: '^0.8.1',
          singleton: true,
        },
      },
    }),
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
  ],
}
