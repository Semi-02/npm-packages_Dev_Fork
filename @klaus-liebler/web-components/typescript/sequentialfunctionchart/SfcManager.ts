
 //Im Manager : 
  // SfcUi für Anzeige und Interaktion
  // SfcData für die Daten
  // SfcCompiler zum Verpakcne der Daten fürs absenden an die Platine  
  
import { Severity } from "@klaus-liebler/commons";
import { OkDialog } from "../dialog_controller";
import { IAppManagement } from "../utils/interfaces";
import { SfcCompiler } from "./SfcCompiler";
import { SfcData, SfcStep, SfcTransition, ActionN } from "./SfcData";
import { SfcUI } from "./SfcUI";

export class SfcManager {
  constructor(private sfcData: SfcData,private SfcUI:SfcUI) {}

  /*
  addStepAbove(targetStepUid: string): SfcStep {
    // ...Logik wie im Pseudocode...
   
  }

  addStepBelow(targetStepUid: string): SfcStep {
    
  }

  deleteStep(stepUid: string): boolean {
    // ...Step und zugehörige Transitions entfernen...
  }

  addActionToStep(stepUid: string, action: ActionN): void {
    // ...Action zum Step hinzufügen...
  }

   getStepByUid(uid: string): SfcStep | undefined {
    // ...implementieren...
  }

  addStepAbove(targetUid: string): SfcStep {
    // ...implementieren...
  }

  addStepBelow(targetUid: string): SfcStep {
    // ...implementieren...
  }

  deleteStep(uid: string): void {
    // ...implementieren...
  }

  addActionToStep(stepUid: string, action: SfcAction): void {
    // ...implementieren...
  }

}*/





    async postSfcFile(
    path: string,
    sfcData: SfcData,
    compiler: SfcCompiler,
    appManagement: IAppManagement,
    httpServerBasePath: string,
    onSuccessAction?: (path: string) => void,
    onFailAction?: (path: string) => void
    ) {
    try {
        const response = await fetch(httpServerBasePath + path, {
        method: 'POST',
        body: compiler.compileSfcDataToJson(sfcData),
        headers: {
            'Content-Type': 'application/octet-stream'
        }
        });

        if (!response.ok) {
        appManagement.ShowDialog(new OkDialog(Severity.ERROR, `HTTP Error ${response.status}`));
        if (onFailAction) onFailAction(path);
        return;
        }

        appManagement.ShowSnackbar(Severity.SUCCESS, `Successfully saved`);
        if (onSuccessAction) onSuccessAction(path);

    } catch (error) {
        console.error('There was a problem with the post operation:', error);
        appManagement.ShowDialog(new OkDialog(Severity.ERROR, `Generic Error`));
        if (onFailAction) onFailAction(path);
    }
    }



}