export default {
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
  'state-pool': {
    requiredVersion: '^0.8.1',
    singleton: true, // only a single version of the shared module is allowed
  },
}
