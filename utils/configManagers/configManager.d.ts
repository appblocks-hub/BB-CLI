import { PathLike } from 'fs'
import { EventEmitter } from 'stream'

type Block_Author = {
  user_name: string
  author_type: number
}

export type BlockLiveDetails = {
  isOn: boolean
  port: number
  pid?: number
  log: {
    out: PathLike
    err: PathLike
  }
}

export type BlockDetailsWithLive = { directory: string; meta: BlockConfig } & BlockLiveDetails

export type BlockDetailsFromRegistry = {
  id: string
  block_type: number
  block_name: string
  block_short_name: string
  block_desc: string
  block_visibility: number
  git_url: string
  status: number
  updated_at: string
  created_at: string
  verified: boolean
  block_version_id: string
  block_version_number: string
  appblock_version_id: string
  appblock_version: string
  appblock_version_name: string
  block_authors: Array<Block_Author>
  child_blocks: Array | null
}

export type BlockTypes =
  | 'package'
  | 'ui-container'
  | 'ui-elements'
  | 'function'
  | 'data'
  | 'shared-fn'
  | 'job'
  | 'ui-dep-lib'

export interface ConfigSource {
  https?: string // github repo url
  ssh?: string //github repo url ssh
}

export interface BlockConfig {
  name: string // name of block
  type: Exclude<BlockTypes, 'package'>
  source: ConfigSource
  language: string
  postPull: string
  start: string
  blockId: string
  supportedAppblockVersions: string[]
}

export interface PackageConfig {
  name: string // name of block
  type: Extract<BlockTypes, 'package'>
  source: ConfigSource
  dependencies: Record<string, { directory: string; meta: BlockConfig }>
}

type newConfig<T> = T extends PackageConfig ? Partial<PackageConfig> : Partial<BlockConfig>

declare class ConfigManager<C extends BlockConfig | PackageConfig> {
  constructor(config: C)
  static CONFIG_NAME: string
  static LIVE_CONFIG_NAME: string
  static LIVE_CONFIG_FILE_ROOT_PATH: string
  readonly id: number
  readonly configname: string
  readonly isWriting: boolean
  events: EventEmitter
  liveConfigname: string
  _writeSignal: string
  configPath: string
  directory: string
  config: C
  private _write(): void
  /**
   * Recursively moves up the current path,
   * reading block.config.json, checking for type package,
   * if found, returns the absolute path
   */
  public findMyParentPackage(): Promise<string>
  public isPackage(): config is PackageConfig
  public init():Promise<void>

  /**
   * Returns the updated config, also emits a write event
   * @param newConfig Updated config, only updated fields are necessary
   */
  public updateConfig(newConfig: newConfig<C>): void
}
