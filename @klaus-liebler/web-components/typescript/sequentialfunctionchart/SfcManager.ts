import { SfcData, SfcStep, BaseTransition, SimpleTransition, ActionN, BaseAction } from "./SfcData";
import { SfcUI } from "./SfcUI";
import { SfcCompiler } from "./SfcCompiler";
import { IAppManagement } from "../utils/interfaces";
import { OkDialog, OkCancelDialog } from "../dialog_controller";
import { Severity } from "../../../commons";
import { SfcTestDataProvider } from "./SfcTestData";
import { RequestSFCRun, RequestSFCStop, RequestWrapper, Requests } from "@generated/flatbuffers_ts/functionblock";
import * as flatbuffers from 'flatbuffers';
import { SFC_NAMESPACE } from "../screen_controller/develop_sfc_controller";

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
    private onFirstLoad: boolean = false,
    
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
        // Erstelle ein verstecktes File-Input-Element
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.style.display = 'none';
        
        input.onchange = (e) => {
          const files = input.files;
          if (!files || files.length === 0) return;
          
          const reader = new FileReader();
          reader.onloadend = (e) => {
            try {
              const arrayBuffer = e.target.result as ArrayBuffer;
              if (arrayBuffer.byteLength === 0) {
                this.appManagement.ShowSnackbar(Severity.ERROR, "Leere Datei");
                return;
              }
              
              const sfcData = this.sfcCompiler.compileJSONtoSfcData(arrayBuffer);
              this.setSfcData(sfcData);
              this.appManagement.ShowSnackbar(Severity.SUCCESS, `Datei "${files[0].name}" erfolgreich geladen`);
            } catch (error) {
              this.appManagement.ShowDialog(new OkDialog(
                Severity.ERROR, 
                `Fehler beim Laden der Datei: ${error.message}`
              ));
            }
          };
          reader.readAsArrayBuffer(files[0]);
        };
        
        // Füge das Element zum DOM hinzu, klicke es und entferne es wieder
        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
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
        // Zeige Dialog zur Eingabe des Dateinamens
        const filename = prompt("Dateiname eingeben (ohne .json Endung):");
        if (filename) {
          const fullPath = `${SFCSTORE_BASE_DIRECTORY}${filename}.json`;
          this.loadSfcFile(fullPath);
        }
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
        try {
          // Verwende den SfcCompiler, um JSON zu generieren
          const jsonString = this.sfcCompiler.Compile(this.sfcData);
          
          // Erstelle einen Blob und einen Download-Link
          const blob = new Blob([jsonString], { type: 'application/json' });
          const url = window.URL.createObjectURL(blob);
          const filename = "sequentialfunctionchart.json";
          
          const element = document.createElement('a');
          element.style.display = 'none';
          element.href = url;
          element.download = filename;
          
          // Füge den Link zum DOM hinzu, klicke ihn und entferne ihn wieder
          document.body.appendChild(element);
          element.click();
          document.body.removeChild(element);
          
          // Räume auf und zeige Erfolgsmeldung
          window.URL.revokeObjectURL(url);
          this.appManagement.ShowSnackbar(Severity.SUCCESS, "SFC erfolgreich gespeichert");
        } catch (error) {
          this.appManagement.ShowDialog(new OkDialog(
            Severity.ERROR, 
            `Fehler beim Speichern der Datei: ${error.message}`
          ));
        }
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
        // Zeige Dialog zur Eingabe des Dateinamens
        const filename = prompt("Dateiname eingeben (ohne .json Endung):");
        if (filename) {
          const fullPath = `${SFCSTORE_BASE_DIRECTORY}${filename}.json`;
          this.postSfcFile(fullPath, 
            () => this.appManagement.ShowSnackbar(Severity.SUCCESS, `SFC als "${filename}.json" gespeichert`),
            () => this.appManagement.ShowSnackbar(Severity.ERROR, `Fehler beim Speichern von "${filename}.json"`)
          );
        }
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
        // Erstelle und sende RequestSFCStop über Flatbuffers
        const builder = new flatbuffers.Builder(1024);
        const requestOffset = RequestSFCStop.createRequestSFCStop(builder);
        builder.finish(RequestWrapper.createRequestWrapper(builder, Requests.RequestSFCStop, requestOffset));
        this.appManagement.SendFinishedBuilder(SFC_NAMESPACE, builder, 3000);
        
        this.appManagement.ShowSnackbar(Severity.INFO, "SFC Stop-Befehl gesendet");
      }
    }
  );
  this.appManagement.ShowDialog(dialog);
}

public async createNewSFC(): Promise<void> {
  try {
    await this.loadSfcFile("/spiffs/newFile.json");
  } catch (error) {
    this.appManagement.ShowDialog(
      new OkDialog(Severity.ERROR, `Fehler beim Laden der Vorlage: ${error.message}`)
    );
  }
}

public showTutorial(): void {
  const tutorialContent = `

# Sequential Function Chart Tutorial

##### Introduction
This tool allows you to create and edit Sequential Function Charts (SFC) which are used for programming sequential control systems.

##### Basic Functions:
1. **Create Steps**: Use the + buttons to add steps above or below existing ones
2. **Add Actions**: Click the + button in action boxes to add new actions
3. **Edit Transitions**: Click on transition conditions to edit them
4. **Manage Booleans**: Add and edit boolean variables in the right panel

##### Menu Functions:
- **File**: Create new SFCs, open from PC/server, save to PC/server
- **Run**: Execute the SFC, stop execution, save as default

#####For more information, visit our documentation website.

  `;

  const dialog = new OkCancelDialog(
    Severity.INFO,
    tutorialContent,
    (ok) => {
      if (ok) {
        this.appManagement.ShowSnackbar(Severity.SUCCESS, "Tutorial closed");
      }
    }
  );
  this.appManagement.ShowDialog(dialog);
}

public showSnackbar(type: number, message: string): void {
  this.appManagement.ShowSnackbar(type, message);
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
    if(!this.onFirstLoad){
      // Beim ersten Laden direkt laden ohne Dialog
      this.onFirstLoad = true;
      await this.performLoad(path);
    } else {
      // Bei allen folgenden Aufrufen Dialog anzeigen
      const dialog = new OkCancelDialog(
        Severity.INFO,
        `Möchten Sie die SFC-Datei "${path}" vom Server laden? Ungespeicherte Änderungen gehen verloren.`,
        async (ok) => {
          if (ok) {
            await this.performLoad(path);
          }
        }
      );
      this.appManagement.ShowDialog(dialog);
    }
  }

  private async performLoad(path: string): Promise<void> {
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