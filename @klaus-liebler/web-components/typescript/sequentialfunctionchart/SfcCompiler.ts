import { SfcData, SfcStep } from "./SfcData";

export class SfcCompiler {
  constructor() {}
  
  public Compile(sfcData: SfcData): string {
    return this.compileSfcDataToJson(sfcData);
  }
  
  private compileSfcDataToJson(sfcData: SfcData): string {
    try {
      if (!sfcData) throw new Error("SFC data is null or undefined");
      if (!sfcData.start) throw new Error("Start step is missing");
      if (!Array.isArray(sfcData.steps) || sfcData.steps.length === 0) throw new Error("No steps defined");
      if (!sfcData.booleans) throw new Error("Boolean values are missing");
      
      const optimizedData = {
        start: this.prepareStepForTransfer(sfcData.start),
        steps: sfcData.steps.map(step => this.prepareStepForTransfer(step)),
        booleans: sfcData.booleans.getAll()
      };
      
      return JSON.stringify(optimizedData, null, 2);
    } catch (error) {
      console.error("Error compiling SFC data:", error);
      throw new Error(`Compilation failed: ${error.message}`);
    }
  }

  private prepareStepForTransfer(step: SfcStep): any {
    if (!step) return null;
    
    const cleanStep = {
      uid: step.uid,
      caption: step.caption,
      actions: step.actions.map(action => ({
        codeUid: action.codeUid,
        caption: action.caption,
        targetBoolean: action.targetBoolean,
        qualifier: action.qualifier
      })),
      
      outgoingTransitions: step.outgoingTransitions.map(trans => ({
        condition: [...trans.condition],
        sourceDone: [...trans.sourceDone],
        source: trans.source.map(s => s.uid),
        target: trans.target.map(t => t.uid)
      }))
    };
    
    return cleanStep;
  }
}