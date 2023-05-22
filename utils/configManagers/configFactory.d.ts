// Type definitions for configFactory.js
// Project: @appblocks/bb-cli <https://github.com/appblocks-hub/BB-CLI>
// Definitions by: Arjun S Kumar <https://github.com/Digambaran>
import { PathLike } from 'fs'
import BlockConfigManager from './blockConfigManager'
import PackageConfigManager from './packageConfigManager'

export type FactoryCreateResult = {
  manager:BlockConfigManager | PackageConfigManager,
  error:{
    data:object,
    err:Error
  }
} 

declare class ConfigFactory {
  readonly static cache: Record<string,object>
  /**
   * Creates a instance
   */
  public static create(configPath: PathLike,): Promise<FactoryCreateResult>
}

export = ConfigFactory
