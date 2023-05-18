import { AsyncSeriesHook } from "tapable";
export interface createCommandArgs {
  
}

declare class CreateCore{
  readonly cmdArgs:object;
  readonly cmdOpts : object;

  logger :object;


  cwd : string?;
  parentPackagePath:string?;
  blockDetails:object?;
  
  hooks : {
    beforeCreate : AsyncSeriesHook,
    beforeConfigUpdate:AsyncSeriesHook,
    afterCreate:AsyncSeriesHook
  }
 public initializeAppConfig:Promise<void>
 public createBlock: Promise<string>
}
