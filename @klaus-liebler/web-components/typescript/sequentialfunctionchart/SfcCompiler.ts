import {
  ActionN,
  ActionR,
  ActionS,
  ActionL,
  ActionD,
  ActionP,
  ActionSD,
  ActionDS,
  ActionSL,
  BaseAction,
  BaseTransition,
  SfcBooleans,
  SfcData,
  SfcStep,
  SimpleTransition
} from "./SfcData";

export class SfcCompiler {
  constructor() { }

  public Compile(sfcData: SfcData): string {
    return this.convertSfcDataToDto(sfcData);
  }
public compileJSONtoSfcData(arrayBuffer): SfcData {
  console.log("Compiling JSON to SFC Data");
  
  // Try to parse the file content as plain JSON first
  try {
    const jsonString = new TextDecoder().decode(arrayBuffer);
    const dto = JSON.parse(jsonString);
    console.log("Parsed JSON:", dto);
    
    // Create a new SfcData instance
    const booleans = new SfcBooleans();
    if (dto.booleans) {
      Object.entries(dto.booleans).forEach(([key, value]) => {
        booleans.set(key, value as boolean);
      });
    }
    
    // Create step objects
    const stepsMap = new Map<string, SfcStep>();
    if (dto.steps && Array.isArray(dto.steps)) {
      dto.steps.forEach(stepDto => {
        const step = new SfcStep(stepDto.uid, stepDto.caption);
        
        // Add actions
        if (stepDto.actions && Array.isArray(stepDto.actions)) {
          stepDto.actions.forEach(actionDto => {
            let action: BaseAction;
            switch (actionDto.qualifier) {
              case "N": action = new ActionN(actionDto.codeUid, actionDto.caption, actionDto.targetBoolean); break;
              case "S": action = new ActionS(actionDto.codeUid, actionDto.caption, actionDto.targetBoolean); break;
              case "L": action = new ActionL(actionDto.codeUid, actionDto.caption, actionDto.targetBoolean); break;
              case "D": action = new ActionD(actionDto.codeUid, actionDto.caption, actionDto.targetBoolean); break;
              case "P": action = new ActionP(actionDto.codeUid, actionDto.caption, actionDto.targetBoolean); break;
              case "SD": action = new ActionSD(actionDto.codeUid, actionDto.caption, actionDto.targetBoolean); break;
              case "R": action = new ActionR(actionDto.codeUid, actionDto.caption, actionDto.targetBoolean); break;
              case "DS": action = new ActionDS(actionDto.codeUid, actionDto.caption, actionDto.targetBoolean); break;
              case "SL": action = new ActionSL(actionDto.codeUid, actionDto.caption, actionDto.targetBoolean); break;
              default: action = new ActionN(actionDto.codeUid, actionDto.caption, actionDto.targetBoolean); break;
            }
            step.actions.push(action);
          });
        }
        
        stepsMap.set(step.uid, step);
      });
      
      // Add transitions
      dto.steps.forEach(stepDto => {
        const step = stepsMap.get(stepDto.uid);
        if (!step) return;
        
        if (stepDto.outgoingTransitions && Array.isArray(stepDto.outgoingTransitions)) {
          stepDto.outgoingTransitions.forEach(transDto => {
            const sourceSteps = transDto.source.map(uid => stepsMap.get(uid)).filter(s => s !== undefined) as SfcStep[];
            const targetSteps = transDto.target.map(uid => stepsMap.get(uid)).filter(t => t !== undefined) as SfcStep[];
            
            let transition: BaseTransition;
            if (transDto.type === "simple") {
              transition = new SimpleTransition(sourceSteps, transDto.sourceDone, targetSteps, transDto.condition);
            } else {
              transition = new SimpleTransition(sourceSteps, transDto.sourceDone, targetSteps, transDto.condition);
            }
            
            step.outgoingTransitions.push(transition);
            
            // Add incoming transitions to target steps
            targetSteps.forEach(targetStep => {
              targetStep.incomingTransitions.push(transition);
            });
          });
        }
      });
    }
    
    // Find the start step
    const startStep = stepsMap.get(dto.start) || null;
    
    // Create and return the SfcData object
    const sfcData = new SfcData(startStep, booleans);
    sfcData.steps = Array.from(stepsMap.values());
    
    return sfcData;
  } catch (e) {
    console.error("Error parsing JSON data:", e);
    
    // Fallback to trying the binary+JSON format
    try {
      const parsedData = this.parseSfcFile(arrayBuffer);
      return parsedData;
    } catch (e2) {
      console.error("Error parsing binary+JSON format:", e2);
      // Return an empty SfcData as fallback
      return new SfcData();
    }
  }
}

  private parseSfcFile(arrayBuffer: ArrayBuffer): SfcData {
    const dataView = new DataView(arrayBuffer);
    // Lesen Sie die Länge des Binärteils (erste 4 Bytes)
    const binaryLength = dataView.getUint32(0, true);
    // Extrahieren Sie den Binär- und den JSON-Teil
    const _binaryPart = new Uint8Array(arrayBuffer, 4, binaryLength);
    const jsonPart = new TextDecoder().decode(arrayBuffer.slice(4 + binaryLength));
    return JSON.parse(jsonPart);
  }

  


  private convertSfcDataToDto(sfcData: SfcData): string {
    const dto: SfcDataDto = {
      start: sfcData.start?.uid || "",
      steps: sfcData.steps.map(step => ({
        uid: step.uid,
        caption: step.caption,
        actions: step.actions.map(action => ({
          codeUid: action.codeUid,
          caption: action.caption,
          targetBoolean: action.targetBoolean,
          qualifier: action.qualifier
        })),
        outgoingTransitions: step.outgoingTransitions.map(trans => ({
          type: trans instanceof BaseTransition ? "simple" : "unknown",
          condition: [...trans.condition],
          sourceDone: [...trans.sourceDone],
          source: trans.source.map(s => s.uid),
          target: trans.target.map(t => t.uid)
        }))
      })),
      booleans: sfcData.booleans.getAll()
    };
    var jsonString = JSON.stringify(dto, null, 2);
    console.log("DTO to JSON Output:", jsonString);
    return jsonString;
  }


  private async convertDtoToSfcData(json: string): Promise<SfcData> {
    const dto: SfcDataDto = JSON.parse(json);

    // Create boolean data
    const booleans = new SfcBooleans();
    if (dto.booleans) {
      if (dto.booleans.hardware) {
        Object.entries(dto.booleans.hardware).forEach(([key, value]) => {
          booleans.set(key, value as boolean);
        });
      }
      if (dto.booleans.custom) {
        Object.entries(dto.booleans.custom).forEach(([key, value]) => {
          booleans.set(key, value as boolean);
        });
      }
    }

    // Create step objects (without transitions first)
    const stepsMap = new Map<string, SfcStep>();
    dto.steps.forEach(stepDto => {
      const step = new SfcStep(stepDto.uid, stepDto.caption);

      // Add actions
      stepDto.actions.forEach(actionDto => {
        let action: BaseAction;
        switch (actionDto.qualifier) {
          case "N": action = new ActionN(actionDto.codeUid, actionDto.caption, actionDto.targetBoolean); break;
          case "S": action = new ActionS(actionDto.codeUid, actionDto.caption, actionDto.targetBoolean); break;
          case "L": action = new ActionL(actionDto.codeUid, actionDto.caption, actionDto.targetBoolean); break;
          case "D": action = new ActionD(actionDto.codeUid, actionDto.caption, actionDto.targetBoolean); break;
          case "P": action = new ActionP(actionDto.codeUid, actionDto.caption, actionDto.targetBoolean); break;
          case "SD": action = new ActionSD(actionDto.codeUid, actionDto.caption, actionDto.targetBoolean); break;
          case "R": action = new ActionR(actionDto.codeUid, actionDto.caption, actionDto.targetBoolean); break;
          case "DS": action = new ActionDS(actionDto.codeUid, actionDto.caption, actionDto.targetBoolean); break;
          case "SL": action = new ActionSL(actionDto.codeUid, actionDto.caption, actionDto.targetBoolean); break;
          default: action = new ActionN(actionDto.codeUid, actionDto.caption, actionDto.targetBoolean); break;
        }
        step.actions.push(action);
      });

      stepsMap.set(step.uid, step);
    });

    // Add transitions
    dto.steps.forEach(stepDto => {
      const step = stepsMap.get(stepDto.uid);
      if (!step) return;

      stepDto.outgoingTransitions.forEach(transDto => {
        const sourceSteps = transDto.source.map(uid => stepsMap.get(uid)).filter(s => s !== undefined) as SfcStep[];
        const targetSteps = transDto.target.map(uid => stepsMap.get(uid)).filter(t => t !== undefined) as SfcStep[];

        let transition: BaseTransition;
        if (transDto.type === "simple") {
          transition = new SimpleTransition(sourceSteps, transDto.sourceDone, targetSteps, transDto.condition);
        } else {
          transition = new SimpleTransition(sourceSteps, transDto.sourceDone, targetSteps, transDto.condition);
        }

        step.outgoingTransitions.push(transition);

        // Add incoming transitions to target steps
        targetSteps.forEach(targetStep => {
          targetStep.incomingTransitions.push(transition);
        });
      });
    });

    // Find the start step
    const startStep = stepsMap.get(dto.start) || null;

    // Create and return the SfcData object
    const sfcData = new SfcData(startStep, booleans);
    sfcData.steps = Array.from(stepsMap.values());

    return sfcData;
  }


}




// SFC Data Transfer Object Interfaces
export interface SfcDataDto {
  start: string; // UID of the start step
  steps: SfcStepDto[];
  booleans:
  {
    hardware: Record<string, boolean>; 
    custom:  Record<string, boolean>;
  }; 
}


export interface SfcStepDto {
  uid: string;
  caption: string;
  actions: SfcActionDto[];
  outgoingTransitions: SfcTransitionDto[];
}

export interface SfcActionDto {
  codeUid: string;
  caption: string;
  targetBoolean: string;
  qualifier: string; // N, S0, L, D, P, SD
}

export interface SfcTransitionDto {
  type: string; // "simple" for SimpleTransition
  condition: string[];
  sourceDone: boolean[];
  source: string[]; // UIDs of source steps
  target: string[]; // UIDs of target steps
}