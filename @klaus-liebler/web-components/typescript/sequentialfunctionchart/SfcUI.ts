/**
 * =============================================================================
 * @file        SfcUI.ts
 * @description Zentrale Klasse zur Verarbeitung von Nutzerdaten und Darstellung
 *              der Sequential Function Chart (SFC)-Benutzeroberfläche.
 *              Implementiert Geschäftslogik für das Auth-Modul und UI-Rendering.
 * 
 * @authors     Felix Lukowski, Jan Heitmeier
 * @created     2025-04-25
 * @version     1.1.0
 * 
 * @methods
 *    - constructor(config: Config): 
 *        Initialisiert die Klasse mit der gegebenen Konfiguration.
 * 
 *    - setContainer(container: HTMLDivElement): 
 *        Setzt den Container für das UI-Rendering, falls dieser nicht im
 *        Konstruktor übergeben wurde.
 * 
 *    - loadTestData(): 
 *        Lädt Testdaten in die SFC-Datenstruktur und gibt eine Bestätigung
 *        in der Konsole aus.
 * 
 *    - RenderUI(subcontainer?: HTMLDivElement): 
 *        Rendert die Benutzeroberfläche in den angegebenen oder gespeicherten
 *        Container. Erstellt Menü, Diagramm und Boolesche Felder.
 * 
 *    - postSfcData(): 
 *         Sendet die aktuellen SFC-Daten an einen Server. Fehler werden
 *        in der Konsole protokolliert.
 * 
 *    - buildMenu(subcontainer: HTMLDivElement): 
 *         Erstellt das Hauptmenü mit Optionen für Dateioperationen,
 *        Debugging und Simulation.
 * 
 *    - buildView(gridcontainer: HTMLElement): 
 *         Erstellt die Hauptansicht mit einem zweispaltigen Layout:
 *        Diagramm auf der linken Seite und Boolesche Felder auf der rechten Seite.
 * 
 *    - buildDiagram(diagramContainer: HTMLElement): 
 *         Baut das SFC-Diagramm basierend auf den aktuellen SFC-Daten.
 * 
 *    - buildStepsRecursively(
 *          container: HTMLElement,
 *          steps: SfcStep[],
 *          level: number,
 *          visitedSteps: Set<string>
 *      ): 
 *         Rekursive Methode zum Aufbau der SFC-Schritte und deren
 *        Positionierung im Diagramm.
 * 
 *    - buildStep(container: HTMLElement, step: SfcStep): 
 *         Erstellt die Darstellung eines einzelnen SFC-Schritts und
 *        gibt das DOM-Element zurück.
 * 
 *    - buildBooleanField(container: HTMLElement): 
 *         Erstellt die Ansicht für die Booleschen Felder und ermöglicht
 *        deren Bearbeitung.
 * 
 *    - addHoverButtonToStepActions(stepActionsContainer: HTMLElement): 
 *         Fügt einen Hover-Button hinzu, um neue Schritte in das Diagramm
 *        einzufügen.
 * 
 * =============================================================================
 */



import { Html } from "../utils/common";
import { Menu, MenuItem, MenuManager } from "./MenuManager";
import { SfcData, SfcBooleans, SfcStep, SfcAction, SfcTransition, TransitionSimple, ActionS0, ActionL, ActionD, ActionP, ActionSD, ActionN } from "./SfcData";
import { IAppManagement } from "../utils/interfaces";
import { SfcCompiler } from "./SfcCompiler";
import "../../style/sfcui.css";
// Import the provider
import { SfcTestDataProvider } from "./SfcTestData.ts";
import * as flatbuffers from 'flatbuffers';
import { OkDialog } from "../dialog_controller.ts";
import { Severity } from "@klaus-liebler/commons";
import { RequestWrapper, RequestDebugData, RequestFbdRun, ResponseDebugData, ResponseSfcRun, Responses, ResponseWrapper, Requests } from "@generated/flatbuffers_ts/functionblock";

  const TEMPSFC_FILEPATH = "/spiffs/tempsfc.fbd"; //SFC = Sequential Function Chart
  const Namespace = 999;

export class SfcOptions {
  canUserEditLinks: boolean = true;
  canUserMoveOperators: boolean = true;
  distanceFromArrow: number = 3;
  defaultOperatorClass: string = 'sfc-default-operator';
  defaultLinkColor: string = '#3366ff';
  grid: number = 10;
  httpServerBasePath = "/files"
  constructor(httpServerPrexix: string) {
    this.httpServerBasePath = httpServerPrexix + this.httpServerBasePath;
  }
}

export class SfcCallback {
  onOperatorSelect?: (operatorId: string) => boolean;
  onOperatorUnselect?: () => boolean;
  onOperatorMouseOver?: (operatorId: string) => boolean;
  onOperatorMouseOut?: (operatorId: string) => boolean;
  onLinkSelect?: (link: SfcTransition) => boolean;
  onLinkUnselect?: (link: SfcTransition) => boolean;
  onOperatorCreate?: (operatorId: string, operatorData: any, fullElement: boolean) => boolean;
  onLinkCreate?: (linkId: string, linkData: any) => boolean;
  onOperatorDelete?: (operatorId: string) => boolean;
  onLinkDelete?: (linkId: string, forced: boolean) => boolean;
  onOperatorMoved?: (operatorId: string, position: number) => void;
  onAfterChange?: (changeType: any) => void;
}
export class SfcUI {
  private compiler: SfcCompiler;
  private container?: HTMLDivElement; 
  private webSocket: WebSocket | null = null;

  constructor(
    private appManagement: IAppManagement,
    private sfcData: SfcData,
    private sfcCallbacks: SfcCallback,
    private options: SfcOptions,
    container?: HTMLDivElement 
  ) {
    if (!this.sfcData) throw new Error("sfcData is null");
    if (!this.sfcCallbacks) throw new Error("sfcCallbacks is null");
    if (!this.options) throw new Error("options is null");
    if (!this.appManagement) throw new Error("appManagement is null");
    this.compiler = new SfcCompiler();
    this.container = container; 

  }

  public setContainer(container: HTMLDivElement): void {
    this.container = container;
  }

  public loadTestData() {
    this.sfcData = SfcTestDataProvider.getBasicSfcData();
    console.log("Test data loaded");
  }

  public RenderUI(subcontainer?: HTMLDivElement): void {
    const targetContainer = subcontainer || this.container;
    if (!targetContainer) throw new Error("No container available for rendering");
    if (!this.sfcData) throw new Error("sfcData is null");

    targetContainer.innerHTML = "";
    this.buildMenu(targetContainer);
    const gridContainer = Html(targetContainer, "div", [], ["grid-container"], undefined, {
      display: "flex",
      flexDirection: "column",
      flex: "1",
      width: "100%",
      marginTop: "8px",
      overflow: "hidden"
    });
    this.buildView(gridContainer);
  }


  // Send SFC jsonFile to server Sollte so passen muss noch getestet werden
  private async postSfcFile(path:string, onSuccessAction?:(path:string)=>void, onFailAction?:(path:string)=>void) {
    
            try {
                const response = await fetch(this.options.httpServerBasePath + path, {
                    method: 'POST',
                    body: this.compiler.compileSfcDataToJson(this.sfcData),
                    headers: {
                    'Content-Type': 'application/octet-stream'
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
  }

 // constexpr const char *TEMPSFC_FILEPATH = "/spiffs/tempsfc.fbd"; //SFC = Sequential Function Chart

  private buildMenu(subcontainer: HTMLDivElement) {
    // Create the menu at the top of the container
    const mm: MenuManager = new MenuManager(
      [
        new Menu("File", [
          new MenuItem("📂 Open (Local)", () => null),
          new MenuItem("📂 Open (labathome)", () => null),
          new MenuItem("📂 Open Default (labathome)", () => null),
          new MenuItem("💾 Save (Local)", () => null),
          new MenuItem("💾 Save (labathome)", () => null),
        ]),
        new Menu("Debug", [
          // das ist noch nciht auf den Richtigen Typen eingestellt, über Flattbuffers muss noch "RequestSfcRun" erstellt werden
          // hier testen ob die namespace unterscheidung reicht. 
          new MenuItem("☭ Start Debug", () => this.postSfcFile(TEMPSFC_FILEPATH,
            (p: string) => {
              var b = new flatbuffers.Builder(1024);
              b.finish(RequestWrapper.createRequestWrapper(b, Requests.RequestSFCRun, RequestFbdRun.createRequestSFCRun(b)));
              this.appManagement.SendFinishedBuilder(Namespace, b, 3000);
            },
            (p: string) => {
              console.error(`As file "${p}" could no be saved on labathome, the RequestFbdRun will not be sent to labathome`)
            }
          )),
          new MenuItem("× Stop Debug", () => null),
          new MenuItem("👣 Set as Startup-App", () => null),
          new MenuItem("🧪 Load Test Data", () => {
            this.loadTestData();
            this.RenderUI(); // Re-render with test data
          }),

        ]),
        new Menu("Simulation", [
          new MenuItem("➤ Start Simulation", () => null),
          new MenuItem("× Stop Simulation", () => null),
        ]),
      ]
    );

    mm.Render(subcontainer);
  }

  private buildView(gridcontainer: HTMLElement) {
    // Create a two-column layout container with flex
    const twoColumnContainer = Html(gridcontainer, "div", [], ["two-column-container"], undefined, {
      display: "flex",
      flexDirection: "row",
      width: "100%",
      height: "100%",
      gap: "16px"
    });

    // Create the diagram area (left column - 2/3 width)
    const diagramContainer = Html(twoColumnContainer, "div", [], ["diagram-container"], undefined, {
      flex: "2",
      border: "1px solid #ccc",
      padding: "16px",
      overflowY: "auto",
      height: "100%"
    });
    this.buildDiagram(diagramContainer);

    // Create the boolean field area (right column - 1/3 width)
    const booleanFieldContainer = Html(twoColumnContainer, "div", [], ["boolean-field-container"], undefined, {
      flex: "1",
      border: "1px solid #ccc",
      padding: "8px",
      overflowY: "auto",
      height: "100%"
    });
    this.buildBooleanField(booleanFieldContainer);
  }

  private buildDiagram(diagramContainer: HTMLElement) {
    // Clear previous content
    diagramContainer.innerHTML = "";

    // Create a CSS grid container for the SFC steps
    const stepsGridContainer = Html(diagramContainer, "div", [], ["steps-grid-container"], undefined, {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
      gridAutoRows: "min-content",
      gap: "0px 0px", // Row gap 0px, column gap 0px
      width: "100%",
      position: "relative"
    });

    // Start with the start step and recursively build the SFC diagram
    this.buildStepsRecursively(stepsGridContainer, [this.sfcData.start], 0, new Set());
  }

  private buildStepsRecursively(
    container: HTMLElement,
    steps: SfcStep[],
    level: number,
    visitedSteps: Set<string>
  ) {
    // Validate inputs to prevent null errors
    if (!steps || !Array.isArray(steps)) {
      console.error("Invalid steps array provided to buildStepsRecursively");
      return;
    }
    // Track next level steps
    const nextLevelSteps: SfcStep[] = [];


    // Process each step at this level
    steps.forEach((step, index) => {
      // Skip if step is null or already visited
      if (!step || visitedSteps.has(step.uid)) return;
      visitedSteps.add(step.uid);

      // Build the step UI directly in the grid container
      const stepElement = this.buildStep(container, step);

      // Position the step in the grid
      // Row is determined by level (vertical position)
      // Column is determined by index within current level (horizontal position)
      stepElement.style.gridRow = `${level + 1}`;
      stepElement.style.gridColumn = `${index + 1}`;

      // Add margin for spacing and better visual hierarchy
      stepElement.style.margin = "0px";
      stepElement.style.width = "500px"; // Fixed width for consistency

      // Store DOM reference for drawing transitions
      (step as any)._domElement = stepElement;
      (step as any)._gridPosition = { row: level + 1, column: index + 1 };

      // Collect next level steps from transitions
      if (step.outgoingTransitions && step.outgoingTransitions.length > 0) {
        step.outgoingTransitions.forEach(transition => {
          if (transition.target) {
            transition.target.forEach(targetStep => {
              if (!visitedSteps.has(targetStep.uid)) {
                nextLevelSteps.push(targetStep);
              }
            });
          }
        });
      }
    });

    // Process next level if any
    if (nextLevelSteps.length > 0) {
      this.buildStepsRecursively(container, nextLevelSteps, level + 1, visitedSteps);
    }
  }

  // Modified buildStep to return the step container for grid positioning
  private buildStep(container: HTMLElement, step: SfcStep): HTMLElement {
    // Create the main step container
    const stepContainer = Html(container, "div", [], ["step-container"], undefined, {
      width: "100%",
      overflow: "hidden",
      margain: "0px"
    });

    // Store reference for transition drawing
    (step as any)._domElement = stepContainer;

    // Create upper part 
    const upperPart = Html(stepContainer, "div", [], ["step-upper-part"], undefined, {
      display: "flex",
      flexDirection: "row",
      height: "60%"
    });

    // 1. Step name area
    const nameArea = Html(upperPart, "div", [], ["step-name"], undefined, {
      width: "25%",
      padding: "8px",
      border: "2px solid #333",
      borderRadius: "4px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: "bold",
      backgroundColor: "#f5f5f5",
      textAlign: "center"
    });
    Html(nameArea, "span", [], [], step.caption);

    // 2. Connection line (bridge)
    const bridgeArea = Html(upperPart, "div", [], ["step-bridge"], undefined, {
      width: "15%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    });
    Html(bridgeArea, "div", [], ["bridge-line"], undefined, {
      height: "2px",
      width: "100%",
      backgroundColor: "black"
    });

    // 3. Actions table
    const actionsArea = Html(upperPart, "div", [], ["step-actions"], undefined, {
      width: "60%",
      border: "2px solid #333",
      borderRadius: "4px",
      padding: "0",
      overflowY: "auto", // Enable vertical scrolling
      maxHeight: "150px", // Set a maximum height for the scrollable area
      boxSizing: "border-box"
    });


    // Add hover button to actions area
    this.addHoverButtonToStepActions(actionsArea,step);


    // Create actions table that fills the whole action area
    const actionsTable = Html(actionsArea, "table", [], ["actions-table"], undefined, {
      width: "100%", // Take full width
      borderCollapse: "collapse",
      tableLayout: "fixed", // Important for fixed column widths to work
      margin: "0",
      boxSizing: "border-box"
    });

    // Set up the column groups to control column widths
    const colGroup = Html(actionsTable, "colgroup", [], []);
    Html(colGroup, "col", [], [], undefined, { width: "20%" }); // Qualifier column - 2/5
    Html(colGroup, "col", [], [], undefined, { width: "80%" }); // Action column - 3/5

    const tableHead = Html(actionsTable, "thead", [], []);
    const headRow = Html(tableHead, "tr", [], []);
    Html(headRow, "th", [], [], "Qualifier", {
      textAlign: "left",
      padding: "4px",
      borderBottom: "1px solid #ddd",
      overflow: "hidden",
      whiteSpace: "nowrap",
      textOverflow: "ellipsis",
      boxSizing: "border-box",
      fontWeight: "normal",
      fontSize: "0.9em"
    });
    Html(headRow, "th", [], [], "Action", {
      textAlign: "left",
      padding: "4px",
      borderBottom: "1px solid #ddd",
      overflow: "hidden",
      whiteSpace: "nowrap",
      textOverflow: "ellipsis",
      boxSizing: "border-box",
      fontWeight: "normal",
      fontSize: "0.9em"
    });

    const tableBody = Html(actionsTable, "tbody", [], []);
    step.actions.forEach(action => {
      const actionRow = Html(tableBody, "tr", [], []);
      Html(actionRow, "td", [], [], action.qualifier, {
        padding: "4px",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        boxSizing: "border-box"
      });
      Html(actionRow, "td", [], [], action.caption, {
        padding: "4px",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        boxSizing: "border-box"
      });
    });

    // Lower part - single container with all elements inside
    const lowerPart = Html(stepContainer, "div", [], ["step-lower-part"], undefined, {
      height: "40%",
      position: "relative",
      width: "100%"
    });

    // 1. Vertical line in the center beneath the name area
    const verticalLine = Html(lowerPart, "div", [], ["vertical-line"], undefined, {
      position: "absolute",
      width: "2px",
      height: "100%",
      backgroundColor: "black",
      left: "12.5%", // Centered beneath the name area (25% / 2)
      transform: "translateX(-50%)"
    });

    // 2. Rectangle with black border (no fill) at top 1/3 of the line
    const transitionRect = Html(lowerPart, "div", [], ["transition-rect"], undefined, {
      position: "absolute",
      width: "20px",
      height: "10px",
      border: "2px solid black",
      backgroundColor: "transparent",
      left: "12.5%", // Same as vertical line
      top: "10%", // Position at top 1/3
      transform: "translateX(-50%)"
    });

    // 3. Transition condition text container with edit button
    const textContainer = Html(lowerPart, "div", [], ["transition-text-container"], undefined, {
      position: "absolute",
      left: "calc(12.5% + 15px)", // Right of the rectangle
      top: "10%", // Same vertical position as rectangle
      display: "flex",
      alignItems: "center",
      maxWidth: "calc(87.5% - 15px)", // Remaining width of step
      overflow: "hidden",
      whiteSpace: "nowrap"
    });

    // Add condition text with auto-scaling
    let transitionCondition = "";
    if (step.outgoingTransitions && step.outgoingTransitions.length > 0) {
      transitionCondition = step.outgoingTransitions[0].condition ?
        step.outgoingTransitions[0].condition[0] : "";
    }

    const conditionText = Html(textContainer, "div", [], ["transition-condition"], transitionCondition, {
      fontSize: "0.8em",
      fontFamily: "monospace",
      textOverflow: "ellipsis",
      overflow: "hidden",
      whiteSpace: "nowrap",
      flex: "1"
    });

    // Add auto-scaling to text if needed
    const checkTextOverflow = () => {
      if (conditionText.scrollWidth > conditionText.clientWidth) {
        const scale = conditionText.clientWidth / conditionText.scrollWidth;
        const minScale = 0.6; // Don't scale below 60%
        conditionText.style.transform = `scale(${Math.max(scale, minScale)})`;
        conditionText.style.transformOrigin = "left center";
      }
    };

    // Call once and also add resize listener
    setTimeout(checkTextOverflow, 0);
    window.addEventListener("resize", checkTextOverflow);

    // Add edit button at the end
    const editButton = Html(textContainer, "button", [], ["condition-edit-button"], "✏️", {
      marginLeft: "4px",
      backgroundColor: "transparent",
      border: "none",
      cursor: "pointer",
      fontSize: "0.8em",
      padding: "2px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    });

    // Add click event for the edit button
    editButton.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!step.outgoingTransitions || step.outgoingTransitions.length === 0) {
        // Create a new transition if none exists
        const newTransition: TransitionSimple = {
          type: "simple",
          source: [step],
          sourceDone: [true],
          target: [],
          condition: [""]
        };
        step.outgoingTransitions = [newTransition];
      }

      // Get the current condition
      const currentCondition = step.outgoingTransitions[0].condition ?
        step.outgoingTransitions[0].condition[0] : "";

      // Prompt for new condition
      const newCondition = prompt("Edit transition condition:", currentCondition);

      // Update if not cancelled
      if (newCondition !== null) {
        step.outgoingTransitions[0].condition = [newCondition];
        conditionText.textContent = newCondition;
        checkTextOverflow(); // Recheck scaling after text change
      }
    });
    // ...existing code...
    return stepContainer; // Return for grid positioning
  }

  private buildBooleanField(container: HTMLElement) {
    // Create a container for the boolean fields
    const booleanFieldsContainer = Html(container, "div", [], ["boolean-fields"], undefined, {
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      width: "100%"
    });

    // Add title
    Html(booleanFieldsContainer, "h3", [], ["boolean-title"], "Boolean Values", {
      margin: "0 0 12px 0",
      padding: "0 0 8px 0",
      borderBottom: "1px solid #ddd"
    });

    // Create a field for each boolean in the data
    if (this.sfcData.booleans) {
      Object.entries(this.sfcData.booleans).forEach(([name, value]) => {
        // Create row container for each boolean
        const boolRow = Html(booleanFieldsContainer, "div", [], ["bool-row"], undefined, {
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "6px",
          borderBottom: "1px solid #eee"
        });

        // Boolean name
        Html(boolRow, "span", [], ["bool-name"], name);

        // Boolean value dropdown
        const selectContainer = Html(boolRow, "div", [], ["bool-value-container"]);
        const select = Html(selectContainer, "select", [], ["bool-value-select"], undefined, {
          padding: "4px",
          borderRadius: "4px"
        }) as HTMLSelectElement;

        // Add options
        const optionTrue = Html(select, "option", ["value", "true"], [], "true") as HTMLOptionElement;
        const optionFalse = Html(select, "option", ["value", "false"], [], "false") as HTMLOptionElement;

        // Set default selection based on current value
        if (value === true) {
          optionTrue.selected = true;
        } else {
          optionFalse.selected = true;
        }

        // Add change event listener
        select.addEventListener("change", () => {
          const newValue = select.value === "true";
          this.sfcData.booleans[name] = newValue;
          console.log(`Changed boolean ${name} to ${newValue}`);
        });
      });
    } else {
      Html(booleanFieldsContainer, "div", [], ["no-booleans"], "No boolean values defined in SFC data", {
        padding: "12px",
        color: "#666",
        fontStyle: "italic",
        textAlign: "center"
      });
    }
  }


  //Hilfsmethode um den Hover-Button zu erstellen

  private addHoverButtonToStepActions(stepActionsContainer: HTMLElement, step: SfcStep): void {
    // Create the button element
    const hoverButton = Html(stepActionsContainer, "button", [], ["hover-button"], "Add Action", {
      display: "none", // Initially hidden
      position: "absolute",
      top: "50%",
      right: "10px",
      transform: "translateY(-50%)",
      padding: "6px 12px",
      backgroundColor: "#007bff",
      color: "#fff",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer",
      zIndex: "10",
    });
  
    // Add functionality to add a new action to the selected step
    hoverButton.addEventListener("click", () => {
      // Create a new action with qualifier "N"
      const newAction: ActionN = {
        codeUid: `A-${Date.now()}`,
        caption: "New Action",
        targetBoolean: "newBoolean",
        qualifier: "N"
      };
      
      // Add the new action to the step's actions array
      step.actions.push(newAction);
      
      // Find the table body and add a new row for the action
      const tableBody = stepActionsContainer.querySelector('.actions-table tbody');
      if (tableBody) {
        const actionRow = Html(tableBody, "tr", [], []);
        Html(actionRow, "td", [], [], newAction.qualifier, {
          padding: "4px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          boxSizing: "border-box"
        });
        Html(actionRow, "td", [], [], newAction.caption, {
          padding: "4px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          boxSizing: "border-box"
        });
      } else {
        console.error("Table body not found in actions container");
      }
    });
  
    // Show the button when hovering over the container or the button itself
    const showButton = () => {
      hoverButton.style.display = "block";
    };
  
    // Hide the button when leaving both the container and the button
    const hideButton = (event: MouseEvent) => {
      const relatedTarget = event.relatedTarget as HTMLElement;
      if (!stepActionsContainer.contains(relatedTarget) && relatedTarget !== hoverButton) {
        hoverButton.style.display = "none";
      }
    };
  
    // Add event listeners to the container and button
    stepActionsContainer.addEventListener("mouseenter", showButton);
    stepActionsContainer.addEventListener("mouseleave", hideButton);
    hoverButton.addEventListener("mouseenter", showButton);
    hoverButton.addEventListener("mouseleave", hideButton);
  }

}
