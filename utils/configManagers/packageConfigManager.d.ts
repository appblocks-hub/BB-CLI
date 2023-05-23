// Type definitions for PackageConfigManager.js
// Project: @appblocks/bb-cli <https://github.com/appblocks-hub/BB-CLI>
// Definitions by: Arjun S Kumar <https://github.com/Digambaran>

import { PathLike } from 'fs'
import { blockLiveDetails } from '../jsDoc/types'
import BlockConfigManager from './blockConfigManager'
import { BlockConfig, ConfigManager, PackageConfig } from './configManager'

type BlockDetails = {
  directory: string
  meta: BlockConfig
}

declare class PackageConfigManager extends ConfigManager<PackageConfig> {
  constructor(config: PackageConfig, cwd: PathLike)
  liveDetails: blockLiveDetails
  readonly isPackageConfigManager: true
  public getDependencies<
    C extends PackageConfigManager | BlockConfigManager,
  >( filter?: (b: C) => boolean, picker?: (b: C) => Partial<C>): Generator<PackageConfigManager|BlockConfigManager>|[]

  /**
   *  To iterate and get all live blocks' config manager
   */
  public get liveBlocks(): any
  // public get liveJobBlocks(): any;

  /**
   * To iterate and get all function block managers
   */
  public get nonLiveBlocks(): Generator<BlockConfigManager>

  /**
   * To iterate and get all ui block managers
   */
  public get uiBlocks(): Generator<BlockConfigManager>

  /**
   * To iterate and get all function block managers
   */
  public get fnBlocks(): Generator<BlockConfigManager>

  /**
   * To iterate and get all shared-fn block managers
   */
  public get shareFnBlocks(): Generator<BlockConfigManager>

  /**
   * To iterate and get all job block managers
   */
  public get jobBlocks(): Generator<BlockConfigManager>

  /**
   * To iterate and get all block names
   */
  public get allBlockNames(): Generator<string>

  public get env(): any

  /**
   * Adds the block which the argument points, to the package current package
   * @param {PathLike} configPath Absolute path to block config of block to add
   */
  public addBlock(
    configPath: PathLike
  ): Promise<{ manager: BlockConfigManager | PackageConfigManager | null; err: ?Error }>

  /**
   *
   * @param name
   */
  public removeBlock(name: string): Promise<PackageConfig>
}
export = PackageConfigManager
