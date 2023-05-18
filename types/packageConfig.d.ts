import { EventEmitter } from "stream"
import { AppblockConfig, BlockConfig, PackageConfig } from "./configs";
import { blockLiveDetails } from "../utils/jsDoc/types";

type CONFIG_NAME = 'block.config.json'
type LIVE_CONFIG_NAME = '.block.live.json'

type EVENTS =
    | 'WRITE_LIVE_BLOCK_CONFIG'
    | 'WRITE_BLOCK_CONFIG'
    | 'WRITE_PACKAGE_CONFIG'

export abstract class ConfigManager<C extends BlockConfig | PackageConfig> {
    private readonly id: number // a unique id
    private readonly events: EventEmitter;
    private readonly configname: CONFIG_NAME // file name of config

    abstract config: C

    abstract isWriting: boolean; // if write call is in queue, true
    abstract cwd: string // directory of current config 


    public createPackageBlock(): ConfigManager<PackageConfig>
    public createBlockConfig(): ConfigManager<BlockConfig>

    /**
     * Recursively moves up the current path, 
     * reading block.config.json, checking for type package,
     * if found, returns the absolute path
     */
    public findMyParentPackage(): Promise<string>
    public writeConfig(): void;
    public writeLive(): void;
    public writePackageConfig(): void;
    /**
     * Returns the updated config, also emits a write event
     * @param newConfig Updated config, only updated fields are necessary
     */
    public updateConfig(newConfig: Partial<C>): C
}


class PackageConfigManager extends ConfigManager<PackageConfig> {
    liveDetails: blockLiveDetails
    getDependencies(): Generator<>
}

class BlockConfigManager extends ConfigManager<BlockConfig> {
}


const a: BlockConfigManager
const b: PackageConfigManager

b.updateConfig({})
a.updateConfig({})

const y = a.createBlockConfig()



