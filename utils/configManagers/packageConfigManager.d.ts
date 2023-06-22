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

  /**
   * Function to traverse on nested packages with given level or till the end
   */
  private _traverseManager(tLevel: Number | null): Promise<Array<BlockConfigManager>>

  public getDependencies<C extends PackageConfigManager | BlockConfigManager>(
    filter?: (b: C) => boolean,
    picker?: (b: C) => Partial<C>
  ): Generator<PackageConfigManager | BlockConfigManager> | []

  /**
   *
   * @param block Name of block to check
   */
  public has(block: string): boolean

  /**
   *  To iterate and get all live blocks' config manager
   */
  public liveBlocks(): Array<BlockConfigManager>

  /**
   * To iterate and get all function block managers
   */
  public nonLiveBlocks(): Array<BlockConfigManager>

  /**
   * To iterate and get all ui block managers
   */
  public uiBlocks(): Array<BlockConfigManager>

  /**
   * To iterate and get all function block managers
   */
  public fnBlocks(): Array<BlockConfigManager>

  /**
   * To iterate and get all shared-fn block managers
   */
  public shareFnBlocks(): Array<BlockConfigManager>

  /**
   * To iterate and get all block names
   */
  public allBlockNames(): Array<string>

  /**
   * To iterate and get all block languages
   */
  public getAllBlockLanguages(): Array<string>

  /**
   * Adds the block which the argument points, to the package current package
   * @param {PathLike} configPath Absolute path to block config of block to add
   */
  public addBlock(
    configPath: PathLike
  ): Promise<{ manager: BlockConfigManager | PackageConfigManager | null; err: ?Error }>

  /**
   * To get immediate member blocks
   * @param blockName
   */
  public getBlock(blockName: string): Promise<BlockConfigManager | null>

  /**
   * To traverse and get member/package block at any level with name
   * @param blockName
   */
  public getAnyBlock(
    blockName: string,
    tLevel: Number | null
  ): Promise<BlockConfigManager | PackageConfigManager | null>

  /**
   * To traverse and get all member/package block at any level
   * @param configPath
   */
  public getAllLevelAnyBlock(): Promise<BlockConfigManager[] | PackageConfigManager[] | []>

  /**
   * To traverse and get all member block at any level
   * NOTE: the list will not include sub level package blocks
   * @param configPath
   */
  public getAllLevelMemberBlock(): Promise<BlockConfigManager[] | []>

  /**
   *
   * @param name
   */
  public removeBlock(name: string): Promise<PackageConfig>

  public refreshConfig(): Promise<void>
  public updateConfigDependencies(newDependency: object): PackageConfig
}

export = PackageConfigManager
