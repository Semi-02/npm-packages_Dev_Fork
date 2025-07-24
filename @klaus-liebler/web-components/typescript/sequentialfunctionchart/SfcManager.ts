import { SfcData, SfcStep, BaseTransition, SimpleTransition, ActionN, BaseAction } from "./SfcData";
import { SfcUI } from "./SfcUI";
import { SfcCompiler } from "./SfcCompiler";
import { IAppManagement } from "../utils/interfaces";
import { OkDialog, OkCancelDialog } from "../dialog_controller";
import { Severity } from "../../../commons";
import { SfcTestDataProvider } from "./SfcTestData";

//Local Filepaths for SFC Files
//see devicemanager.hh
 export const SFCSTORE_BASE_DIRECTORY = "/spiffs/sfcstore/"; 
 export const TEMPSFC_FILEPATH = "/spiffs/tempsfc.json"; 
 export const DEFAULTSFC_FILEPATH = "/spiffs/defaultsfc.json"; 

export class SfcOptions {
    httpServerBasePath="/files"
  
  constructor(httpServerPrexix:string) {
    this.httpServerBasePath=httpServerPrexix+this.httpServerBasePath;
  }
}

export class SfcManager {
private static instance: SfcManager;
  constructor(
    public sfcData: SfcData,
    public sfcUI: SfcUI,
    public sfcCompiler: SfcCompiler,
    private appManagement: IAppManagement,
    private options: SfcOptions = new SfcOptions(""),
    
  ) {
  }
public static getInstance(): SfcManager {
  return SfcManager.instance;
}

//Methods for Menufunctions in sfcUI

public openFromPC(): void {
  const dialog = new OkCancelDialog(
    Severity.INFO,
    "Möchten Sie eine SFC-Datei von Ihrem Computer laden? Ungespeicherte Änderungen gehen verloren.",
    (ok) => {
      if (ok) {
        // TODO: Implementiere File-Upload vom PC
        console.log("Open SFC from PC - Funktion muss noch implementiert werden");
       
      }
    }
  );
  this.appManagement.ShowDialog(dialog);
}

public openFromLabathome(): void {
  const dialog = new OkCancelDialog(
    Severity.INFO,
    "Möchten Sie eine SFC-Datei vom Server laden? Ungespeicherte Änderungen gehen verloren.",
    (ok) => {
      if (ok) {
       console.log("Open SFC from labathome - Funktion muss noch implementiert werden");
      }
    }
  );
  this.appManagement.ShowDialog(dialog);
}

public saveToPC(): void {
  const dialog = new OkCancelDialog(
    Severity.INFO,
    "Möchten Sie die aktuelle SFC auf Ihren Computer herunterladen?",
    (ok) => {
      if (ok) {
        // TODO: Implementiere Download als JSON
        console.log("Save SFC to PC - Funktion muss noch implementiert werden");
      }
    }
  );
  this.appManagement.ShowDialog(dialog);
}

public saveToLabathome(): void {
  const dialog = new OkCancelDialog(
    Severity.INFO,
    "Möchten Sie die aktuelle SFC auf dem Server speichern?",
    (ok) => {
      if (ok) {
        console.log("Save SFC to labathome - Funktion muss noch implementiert werden");
      }
    }
  );
  this.appManagement.ShowDialog(dialog);
}

public stopSfc(): void {
  const dialog = new OkCancelDialog(
    Severity.WARN,
    "Möchten Sie die laufende SFC stoppen?",
    (ok) => {
      if (ok) {
        // TODO: Implementiere SFC-Stop Request an Server
        this.appManagement.ShowSnackbar(Severity.INFO, "SFC Stop - Noch nicht implementiert");
        console.log("SFC Stop Funktionalität muss noch implementiert werden");
      }
    }
  );
  this.appManagement.ShowDialog(dialog);
}

public createNewSFC(): void {
  const dialog = new OkCancelDialog(
    Severity.WARN,
    "Möchten Sie eine neue SFC erstellen? Ungespeicherte Änderungen gehen verloren.",
    (ok) => {
      if (ok) {
        // TODO: Implementiere SFC-Stop Request an Server
        this.appManagement.ShowSnackbar(Severity.INFO, "SFC create - Noch nicht implementiert");
        console.log("SFC create Funktionalität muss noch implementiert werden");
      }
    }
  );
  this.appManagement.ShowDialog(dialog);
}





public createNewStep(caption: string): SfcStep {
    return new SfcStep(`step-${Date.now()}`, caption, this.sfcData);
  }
  
  public addStepAbove(targetUid: string): SfcStep {
    const targetStep = this.getStepByUid(targetUid);
    if (!targetStep) return null;
    
    const newStep = this.createNewStep("New Step");
    
    const incomingTransitions = this.findIncomingTransitions(targetStep);
    
    const newTransition = new SimpleTransition(
      [newStep], 
      [true], 
      [targetStep], 
      ["true"]
    );
    
    newStep.outgoingTransitions.push(newTransition);
    targetStep.incomingTransitions.push(newTransition);
    
    incomingTransitions.forEach(t => {
      t.target = t.target.map(s => s === targetStep ? newStep : s);
      
      if (t.source) {
        t.source.forEach(sourceStep => {
          const transIndex = sourceStep.outgoingTransitions.indexOf(t);
          if (transIndex >= 0) {
            sourceStep.outgoingTransitions[transIndex].target = t.target;
          }
        });
      }
    });
    
    this.sfcData.steps.push(newStep);
    
    if (this.sfcData.start === targetStep) {
      this.sfcData.start = newStep;
    }
    
    return newStep;
  }
  
  public addStepBelow(targetUid: string): SfcStep {
    const targetStep = this.getStepByUid(targetUid);
    if (!targetStep) return null;
    
    const newStep = this.createNewStep("New Step");
    
    const outgoingTransitions = [...targetStep.outgoingTransitions];
    
    const newTransition = new SimpleTransition(
      [targetStep], 
      [true], 
      [newStep], 
      ["true"]
    );
    
    targetStep.outgoingTransitions = [newTransition];
    newStep.incomingTransitions.push(newTransition);
    
    outgoingTransitions.forEach(t => {
      t.source = t.source.map(s => s === targetStep ? newStep : s);
      newStep.outgoingTransitions.push(t);
      
      t.target.forEach(targetOfTarget => {
        const transIndex = targetOfTarget.incomingTransitions.indexOf(t);
        if (transIndex >= 0) {
          targetOfTarget.incomingTransitions[transIndex].source = t.source;
        }
      });
    });
    
    this.sfcData.steps.push(newStep);
    
    return newStep;
  }
  
  public deleteStep(uid: string): void {
    const step = this.getStepByUid(uid);
    if (!step) return;
    
    if (this.sfcData.start === step) {
      this.appManagement.ShowDialog(
        new OkDialog(Severity.ERROR, "Cannot delete start step")
      );
      return;
    }
    
    const incomingTransitions = this.findIncomingTransitions(step);
    const outgoingTransitions = [...step.outgoingTransitions];
    
    if (incomingTransitions.length === 1 && outgoingTransitions.length === 1) {
      const inTrans = incomingTransitions[0];
      const outTrans = outgoingTransitions[0];
      
      inTrans.target = outTrans.target;
      
      outTrans.target.forEach(targetStep => {
        const idx = targetStep.incomingTransitions.indexOf(outTrans);
        if (idx >= 0) {
          targetStep.incomingTransitions[idx] = inTrans;
        }
      });
    } else {
      incomingTransitions.forEach(t => {
        t.source.forEach(sourceStep => {
          sourceStep.outgoingTransitions = sourceStep.outgoingTransitions.filter(
            trans => trans !== t
          );
        });
      });
      
      outgoingTransitions.forEach(t => {
        t.target.forEach(targetStep => {
          targetStep.incomingTransitions = targetStep.incomingTransitions.filter(
            trans => trans !== t
          );
        });
      });
    }
    
    const stepIndex = this.sfcData.steps.indexOf(step);
    if (stepIndex >= 0) {
      this.sfcData.steps.splice(stepIndex, 1);
    }
  }
  
  public addActionToStep(stepUid: string, action?: BaseAction): void {
    const step = this.getStepByUid(stepUid);
    if (!step) return;
    
    const newAction = action || new ActionN(`A-${Date.now()}`, "New Action", "newBoolean");
    step.actions.push(newAction);
  }
  
  public getStepByUid(uid: string): SfcStep | null {
    return this.sfcData.steps.find(s => s.uid === uid) || null;
  }
  
  private findIncomingTransitions(step: SfcStep): BaseTransition[] {
    return this.sfcData.steps.flatMap(s => 
      s.outgoingTransitions.filter(t => 
        t.target.includes(step)
      )
    );
  }
  
  public setSfcData(sfcData: SfcData): void {
    console.log("Setting SFC Data", sfcData);
    this.sfcData = sfcData;
    this.updateSfcData();
  }

public notifyChange(): void {

  this.updateSfcData();

}

private updateSfcData(): void {
  // Update UI if needed
  if (this.sfcUI) {
    this.sfcUI.RenderUI();
  }
}
  // Send SFC jsonFile to server Sollte so passen muss noch getestet werden
  public async postSfcFile(path: string, onSuccessAction?: (path: string) => void, onFailAction?: (path: string) => void) {

    try {
      const response = await fetch(this.options.httpServerBasePath + path, {
        method: 'POST',
        body: this.sfcCompiler.Compile(this.sfcData),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        this.appManagement.ShowDialog(new OkDialog(Severity.ERROR, `HTTP Error ${response.status}`));
        if (onFailAction) onFailAction(path);
        return;
      }

      this.appManagement.ShowSnackbar(Severity.SUCCESS, `Successfully saved`);
      if (onSuccessAction) onSuccessAction(path);

    } catch (error) {
      console.error('There was a problem with the post operation:', error);
      this.appManagement.ShowDialog(new OkDialog(Severity.ERROR, `Generic Error`));
      if (onFailAction) onFailAction(path);
    }
  };

  public async loadSfcFile(path: string){
  const dialog = new OkCancelDialog(
    Severity.INFO,
    `Möchten Sie die SFC-Datei "${path}" vom Server laden? Ungespeicherte Änderungen gehen verloren.`,
    async (ok) => {
      if (ok) {
        try {
          const response = await fetch(this.options.httpServerBasePath + path);
          if (!response.ok) {
            throw new Error(`Failed to load file: ${response.statusText}`);
          }
          
          const arrayBuffer = await response.arrayBuffer();
          if (arrayBuffer.byteLength === 0) {
            console.error(`Error loading file from ${path}: File has size 0`);
            this.appManagement.ShowDialog(new OkDialog(Severity.ERROR, `Datei "${path}" ist leer (0 Bytes)`));
            return;
          }
          console.log(`Loaded file from ${path} with size: ${arrayBuffer.byteLength} bytes`);
          console.log("ArrayBuffer:", arrayBuffer);
          const sfcData = this.sfcCompiler.compileJSONtoSfcData(arrayBuffer);
          this.setSfcData(sfcData);
          this.appManagement.ShowSnackbar(Severity.SUCCESS, `Datei "${path}" erfolgreich geladen`);
        } catch (error) {
          this.appManagement.ShowDialog(new OkDialog(Severity.ERROR, `Fehler beim Laden der Datei "${path}": ${error.message}`));
          console.error(`Error loading file from ${path}:`, error);
        }
      }
    }
  );
  this.appManagement.ShowDialog(dialog);
}
}