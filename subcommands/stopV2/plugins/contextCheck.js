// class ContextCheck {
//   // eslint-disable-next-line class-methods-use-this
//   apply(syncer) {
//     syncer.hooks.beforeStopBlocks.tapPromise('ContextCheck', async (core) => {
//       if (core.appConfig.isInBlockContext && !core.appConfig.isInAppblockContext) {
//         // eslint-disable-next-line no-param-reassign
//         core.blocksToKill = core.appConfig.allBlockNames.next().value
//         console.log(core.blocksToKill, 'hi')
//       }
//     })
//   }
// }

// module.exports = ContextCheck
