// Type definitions for blockConfigManager.js
// Project: @appblocks/bb-cli <https://github.com/appblocks-hub/BB-CLI>
// Definitions by: Arjun S Kumar <https://github.com/Digambaran>
import { BlockConfig, ConfigManager } from "./configManager"


declare class BlockConfigManager extends ConfigManager<BlockConfig> {
    constructor(config: BlockConfig, cwd: PathLike)
    readonly isBlockConfigManager: true

}
export = BlockConfigManager