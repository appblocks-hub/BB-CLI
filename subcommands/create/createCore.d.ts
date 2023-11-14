import { AsyncSeriesHook } from "tapable";
export interface createCommandArgs {
  
}

declare class CreateCore{
  readonly cmdArgs:object;
  readonly cmdOpts : object;

  logger :object;


  cwd : string | undefined;
  blockDetails:object | undefined;
  packageConfigManager: PackageConfigManager;
  
  hooks : {
    beforeCreate : AsyncSeriesHook,
    beforeConfigUpdate:AsyncSeriesHook,
    afterCreate:AsyncSeriesHook
  }
 public initializePsackageConfigManager:Promise<void>
 public createBlock: Promise<string>
}
