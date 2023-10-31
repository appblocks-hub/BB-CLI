// Type definitions for blockConfigManager.js
// Project: @appblocks/bb-cli <https://github.com/appblocks-hub/BB-CLI>
// Definitions by: Arjun S Kumar <https://github.com/Digambaran>
import { PathLike } from 'fs'
import { RawPackageConfig, ConfigManager, BlockLiveDetails } from './configManager'

declare class RawPackageConfigManager extends ConfigManager<RawPackageConfig> {
  constructor(config: RawPackageConfig, cwd: PathLike)
  
  readonly isRawPackageConfigManager: true

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
export = RawPackageConfigManager
