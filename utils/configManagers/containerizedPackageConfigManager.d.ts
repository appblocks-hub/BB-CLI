// Type definitions for blockConfigManager.js
// Project: @appblocks/bb-cli <https://github.com/appblocks-hub/BB-CLI>
// Definitions by: Arjun S Kumar <https://github.com/Digambaran>
import { PathLike } from 'fs'
import { ContainerizedPackageConfig, ConfigManager, BlockLiveDetails } from './configManager'

declare class ContainerizedPackageConfigManager extends ConfigManager<ContainerizedPackageConfig> {
  constructor(config: ContainerizedPackageConfig, cwd: PathLike)
  
  readonly isContainerizedPackageConfigManager: true

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
export = ContainerizedPackageConfigManager
