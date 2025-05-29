
 //Im Manager : 
  // SfcUi für Anzeige und Interaktion
  // SfcData für die Daten
  // SfcCompiler zum Verpakcne der Daten fürs absenden an die Platine  
  
  import { SfcData, SfcStep, SfcTransition, ActionN } from "./SfcData";
  import { SfcUI } from "./SfcUI";

export class SfcManager {
  constructor(private sfcData: SfcData,private SfcUI:SfcUI) {}

  /*
  addStepAbove(targetStepUid: string): SfcStep {
    // ...Logik wie im Pseudocode...
    // Step suchen, neuen Step und Transition erzeugen, Verbindungen anpassen
    // Rückgabe des neuen Steps
  }

  addStepBelow(targetStepUid: string): SfcStep {
    // ...ähnlich wie oben...
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




}