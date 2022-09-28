/* eslint-disable */
const appConfig = {
  name: 'test-app',
  name: 'appBlox',
  dependencies: {
    test_block: {
      directory: 'functions/test_block',
      meta: {
        name: 'test_block',
        type: 'function',
      },
    },
    testui: {
      directory: 'functions/testui',
      meta: {
        name: 'testui',
        type: 'ui-elements',
      },
    },
  },
  categories: [],
}

const AppblockConfigManager = jest.fn().mockImplementation(() => {
  return {
    init: jest.fn(),
    getAppConfig: jest.fn().mockReturnValue(appConfig),
    updateBlock: jest.fn(),
    appConfig: jest.fn(),
    prefix: jest.fn(),
    liveBlocks: jest.fn(),
    nonLiveBlocks: jest.fn(),
    uiBlocks: jest.fn(),
    fnBlocks: jest.fn(),
    allBlockNames: jest.fn(),
    env: jest.fn(),
    env: jest.fn(),
    stopBlock: jest.fn(),
    startedBlock: jest.fn(),
    readAppblockConfig: jest.fn(),
    readLiveAppblockConfig: jest.fn(),
    addBlock: jest.fn(),
    getBlockId: jest.fn(),
    updateAppBlock: jest.fn(),
    dependencies: jest.fn(),
    getDependencies: jest.fn(),
    getBlock: jest.fn(),
    has: jest.fn(),
    isLive: jest.fn(),
    isUiBlock: jest.fn(),
    getBlockWithLive: jest.fn(),
    getLiveDetailsof: jest.fn(),
    getName: jest.fn(),
  }
})

module.exports = { AppblockConfigManager }
