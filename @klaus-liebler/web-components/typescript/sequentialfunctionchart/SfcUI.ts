import { Html } from "../utils/common";
import { SfcData } from "./SfcData";
import { SfcManager } from "./SfcManager";
import { Menu, MenuItem, MenuManager } from "./MenuManager";
import { IAppManagement } from "../utils/interfaces";
import { RequestSFCRun, RequestWrapper, Requests, } from "@generated/flatbuffers_ts/functionblock";
import * as flatbuffers from 'flatbuffers';
import { SFC_NAMESPACE } from "../screen_controller/develop_sfc_controller";
import "../../style/sfcui.css";

import { SfcTestDataProvider } from "./SfcTestData";

export class SfcOptions {
  public httpServerBasePath: string;
  
  constructor(httpServerBasePath: string = "") {
    this.httpServerBasePath = httpServerBasePath;
  }
}

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
    private callbacks: SfcCallback,
    public options: SfcOptions
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
                    new MenuItem("📂 Open (Local)", () => null),
                    new MenuItem("📂 Open (labathome)", () => null),
                    new MenuItem("📂 Open Default (labathome)", () => null),
                    new MenuItem("💾 Save (Local)", () => null),
                    new MenuItem("💾 Save (labathome)", () => null),
                    new MenuItem("💾 Load Testdata", () => this.sfcManager.setSfcData(SfcTestDataProvider.getBasicSfcData())),
                ]),
                new Menu("Debug", [
                    new MenuItem("☭ Start Debug", () => 
                      this.sfcManager.postSfcFile("/spiffs/tempsfc.sfc",
                        (path) => {
                          const builder = new flatbuffers.Builder(1024);
                          const requestOffset = RequestSFCRun.createRequestSFCRun(builder);
                          builder.finish(RequestWrapper.createRequestWrapper(builder, Requests.RequestSFCRun, requestOffset));
                          this.appManagement.SendFinishedBuilder(SFC_NAMESPACE, builder, 3000);
                        }),
                    ),
                    new MenuItem("× Stop Debug", () => null),
                    new MenuItem("👣 Set as Startup-App", () => null),
                ]),
                new Menu("Simulation", [
                    new MenuItem("➤ Start Simulation", () => null),
                    new MenuItem("× Stop Simulation", () => null)
                ])
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
    
    this.sfcManager.sfcData.Render(diagramSection);
  }
  
  private buildBooleanField(container: HTMLElement): void {
    const booleanSection = Html(container, "div", [], ["sfc-boolean-section"]);
   this.sfcManager.sfcData.booleans.Render(booleanSection);
  }

  public setSfcData(sfcData?: SfcData): void {
    if (!sfcData) {
      console.error("No SFC data provided to setSfcData");
      this.sfcManager.setSfcData(SfcTestDataProvider.getBasicSfcData());
    }
    this.sfcManager.setSfcData(sfcData);
    this.RenderUI();
  }
}