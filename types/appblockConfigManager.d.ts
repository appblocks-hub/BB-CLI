import EventEmitter from "events"
import { PathLike } from "fs";

interface appConfigInitOptions {
    configName: string;
    subcmd: string;
    reConfig: boolean;
    isGlobal: boolean;
}
interface appConfigInitArgs {
    cwd: PathLike // Path where instance need to be inited
    options: Partial<appConfigInitOptions>
}
declare class AppblockConfigManager {
    constructor(): AppblockConfigManager
    readonly id: number // id of current instance
    readonly events: EventEmitter;
    private _writeLive(): void
    public Init(args: appConfigInitArgs): Awaited<Promise<void>>

}
