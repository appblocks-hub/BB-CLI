// Type definitions for PackageConfigManager.js
// Project: @appblocks/bb-cli <https://github.com/appblocks-hub/BB-CLI>
// Definitions by: Arjun S Kumar <https://github.com/Digambaran>

import { BlockConfig, BlockDetailsWithLive, ConfigManager, PackageConfig } from "./configManager"

type BlockDetails = {
    directory: string,
    meta: BlockConfig
}

declare class PackageConfigManager extends ConfigManager<PackageConfig>{
    constructor(config: PackageConfig, cwd: PathLike)
    liveDetails: blockLiveDetails
    readonly isPackageConfigManager: true
    private _getDependencies<B extends boolean, C extends (B extends true ? BlockDetailsWithLive : BlockDetails), K extends keyof C>(
        includeLive: B,
        filter?: (b: C) => boolean,
        picker?: (b: C) => { [P in K]: C[P] }
    ): Generator<{ [P in K]: C[P] }>
    public get liveBlocks(): any;
    // public get liveJobBlocks(): any;
    public get nonLiveBlocks(): any
    public get uiBlocks(): any
    public get fnBlocks(): any
    public get shareFnBlocks(): any
    public get jobBlocks(): any
    public get allBlockNames(): string[]
    public get env(): any

    public addBlock():Promise<any>
    public removeBlock():Promise<any>

}
export = PackageConfigManager