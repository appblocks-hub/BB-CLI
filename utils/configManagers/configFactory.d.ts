// Type definitions for configFactory.js
// Project: @appblocks/bb-cli <https://github.com/appblocks-hub/BB-CLI>
// Definitions by: Arjun S Kumar <https://github.com/Digambaran>
import { PathLike } from 'fs'
import BlockConfigManager from './blockConfigManager'
import PackageConfigManager from './packageConfigManager'

declare class ConfigFactory {
  readonly static cache: Record<string,object>
  /**
   * Creates a instance
   */
  public static create(dir: PathLike, configName: string): Promise<BlockConfigManager | PackageConfigManager | null>
}

export = ConfigFactory
