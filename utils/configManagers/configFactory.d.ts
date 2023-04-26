// Type definitions for configFactory.js
// Project: @appblocks/bb-cli <https://github.com/appblocks-hub/BB-CLI>
// Definitions by: Arjun S Kumar <https://github.com/Digambaran>
import { BlockConfig, ConfigManager } from "./configManager"
import { PathLike } from "fs";
import BlockConfigManager from "./blockConfigManager";
import PackageConfigManager from "./packageConfigManager";

declare class ConfigFactory {
    cache: object;
    /**
     * Creates a instance
     */
    create(dir: PathLike, configName: string): Promise<BlockConfigManager | PackageConfigManager>
}
export = ConfigFactory