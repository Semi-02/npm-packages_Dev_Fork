import { Html } from "../utils/common";
import { SfcData, SfcStep } from "./SfcData";
import { SfcManager,SfcOptions,SFCSTORE_BASE_DIRECTORY,TEMPSFC_FILEPATH,DEFAULTSFC_FILEPATH } from "./SfcManager";
import { Menu, MenuItem, MenuManager } from "./MenuManager";
import { IAppManagement } from "../utils/interfaces";
import { RequestSFCRun, RequestWrapper, Requests, } from "@generated/flatbuffers_ts/functionblock";
import * as flatbuffers from 'flatbuffers';
import { SFC_NAMESPACE } from "../screen_controller/develop_sfc_controller";
import "../../style/sfcui.css";
// Stellt Testdaten bereit
import { SfcTestDataProvider } from "./SfcTestData";
import { OkDialog } from "../dialog_controller";



export class SfcCallback {
  public onStepAdded?: (step: any) => void;
  public onStepRemoved?: (stepUid: string) => void;
  public onActionAdded?: (stepUid: string, action: any) => void;
  public onActionRemoved?: (stepUid: string, actionUid: string) => void;
  
  constructor() {}
}

export class SfcUI {
  private container: HTMLDivElement | null = null;
  public sfcManager: SfcManager;
  
  constructor(
    public appManagement: IAppManagement,
    private callbacks: SfcCallback
  ) {}
  
  public setContainer(container: HTMLDivElement): void {
    this.container = container;
  }


  public RenderUI(subcontainer?: HTMLDivElement): void {
    const container = subcontainer || this.container;
    if (!container) {
      console.error("No container available for SFC UI");
      return;
    }
    
    
    container.innerHTML = '';
    const ViewContainer = Html(container, "div", [], ["view-container"]);

    //Container einführen der Unter die Menü Leiste gesetzt wird 
    this.buildMenu(ViewContainer);
    //new html das an buildView gegeben wird.
    //DAs neu erstellte dannn mit appenChild an den Container hängen
    this.buildView(ViewContainer);

    container.appendChild(ViewContainer);
  }
  
  private buildMenu(subcontainer: HTMLElement): void {
    const menuContainer = Html(subcontainer, "div", [], ["sfc-menu-container"]) as HTMLDivElement;
    var mm: MenuManager = new MenuManager(
      [
        new Menu("File", [
          new MenuItem("📂 New SFC ", () => this.sfcManager.createNewSFC()),
          new MenuItem("📂 Open from (PC)", () => this.sfcManager.openFromPC()),
          new MenuItem("📂 Open from (labathome)", () => this.sfcManager.openFromLabathome()),
          new MenuItem("📂 Open Default (labathome)", () => this.sfcManager.loadSfcFile(DEFAULTSFC_FILEPATH)),
          new MenuItem("💾 Save to (Pc)", () => this.sfcManager.saveToPC()),
          new MenuItem("💾 Save to (labathome)", () => this.sfcManager.saveToLabathome()),
        ]),
        new Menu("Run", [
          new MenuItem("▶️ Start ", () => {
            // Prüfe, ob mindestens 2 Steps vorhanden sind
            if (!this.sfcManager.sfcData || this.sfcManager.sfcData.steps.length < 2) {
              this.appManagement.ShowDialog(
                new OkDialog(
                  2, // Severity.WARN
                  "Es müssen mindestens 2 Schritte (Steps) vorhanden sein, um die SFC zu starten."
                )
              );
              return;
            }
            this.sfcManager.postSfcFile(TEMPSFC_FILEPATH,
              (path) => {
                const builder = new flatbuffers.Builder(1024);
                const requestOffset = RequestSFCRun.createRequestSFCRun(builder);
                builder.finish(RequestWrapper.createRequestWrapper(builder, Requests.RequestSFCRun, requestOffset));
                this.appManagement.SendFinishedBuilder(SFC_NAMESPACE, builder, 3000);
              });
          }),
          new MenuItem("⏹️ Stop", () => this.sfcManager.stopSfc()),
          new MenuItem("💾 Save as Default", () => {
            // Prüfe, ob mindestens 2 Steps vorhanden sind
            if (!this.sfcManager.sfcData || this.sfcManager.sfcData.steps.length < 2) {
              this.appManagement.ShowDialog(
                new OkDialog(
                  2, // Severity.WARN
                  "Es müssen mindestens 2 Schritte (Steps) vorhanden sein, um als Default zu speichern."
                )
              );
              return;
            }
            this.sfcManager.postSfcFile(DEFAULTSFC_FILEPATH);
          })
        ]),
        new Menu("Help", [
          new MenuItem("❓ Show Tutorial", () => this.sfcManager.showTutorial())
        ]),
      ]
    );

    mm.Render(menuContainer);
    
   
   
  }
  
  private buildView(container: HTMLElement): void {
    const gridContainer = Html(container, "div", [], ["sfc-grid-container"]);
    
    this.buildDiagram(gridContainer);
    this.buildBooleanField(gridContainer);
  }
  
  private buildDiagram(diagramContainer: HTMLElement): void {
    const diagramSection = Html(diagramContainer, "div", [], ["sfc-diagram-section"]);
    Html(diagramSection, "h3", [], ["diagram-title"], "SFC Diagram");
    
    const initalStep = new SfcStep("initial", "Initial Step");
    const initialStepElement = initalStep.Render(diagramSection, false, true, this.sfcManager);
    initialStepElement.classList.add("special-step", "initial-step"); // Add classes for styling
    
    this.sfcManager.sfcData.Render(diagramSection, this.sfcManager);

    const endStep = new SfcStep("end", "End Step");
    const endStepElement = endStep.Render(diagramSection, false, false, this.sfcManager);
    endStepElement.classList.add("special-step", "end-step"); // Add classes for styling
  }
  
  private buildBooleanField(container: HTMLElement): void {
    const booleanSection = Html(container, "div", [], ["sfc-boolean-section"]);
   this.sfcManager.sfcData.booleans.Render(booleanSection,this.sfcManager);
  }

  public setSfcData(sfcData?: SfcData): void {
    if (!sfcData) {
      console.error("No SFC data provided to setSfcData");
      this.sfcManager.setSfcData(SfcTestDataProvider.getTrafficLightSfcData());
    }
    this.sfcManager.setSfcData(sfcData);
    this.RenderUI();
  }
}