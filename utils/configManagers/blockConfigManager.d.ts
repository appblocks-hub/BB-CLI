// Type definitions for blockConfigManager.js
// Project: @appblocks/bb-cli <https://github.com/appblocks-hub/BB-CLI>
// Definitions by: Arjun S Kumar <https://github.com/Digambaran>
import { BlockConfig, ConfigManager } from './configManager'

declare class BlockConfigManager extends ConfigManager<BlockConfig> {
  constructor(config: BlockConfig, cwd: PathLike)
  
  readonly isBlockConfigManager: true

  /**
   * check is live
   */
  get isLive(): Boolean

  /**
   * Return the updated live config, also emits a writeLive event
   * @param newConfig
   */
  public updateLiveConfig(newConfig: Partial<BlockLiveDetails>): BlockLiveDetails
}
export = BlockConfigManager
