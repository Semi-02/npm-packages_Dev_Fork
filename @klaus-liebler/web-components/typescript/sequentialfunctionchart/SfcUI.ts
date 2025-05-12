/**
 * =============================================================================
 * @file        SfcUI.ts
 * @description Zentrale Klasse zur Verarbeitung von Nutzerdaten.
 *              Implementiert Geschäftslogik für das Auth-Modul.
 * 
 * @author      Felix Lukowski, Jan Heitmeier
 * @created     2025-04-25
 * @version     1.0.0
 * 
 * @methods
 *    - constructor(config: Config): void
 *        Initialisiert die Klasse mit der gegebenen Konfiguration.
 * 
 *    - validateUserInput(user: UserInput, strict: boolean): ValidationResult
 *        Führt Validierungen auf Nutzerdaten durch.
 * 
 *    - authenticate(token: string): Promise<User>
 *        Authentifiziert den Benutzer über ein JWT.
 * 
 *    - reset(): void
 *        Setzt den internen Zustand zurück.
 * 
 * =============================================================================
 */
import { Html } from "../utils/common";
import { Menu, MenuItem, MenuManager } from "./MenuManager";
import { SfcData, SfcBooleans, SfcStep, SfcAction, SfcTransition } from "./SfcData";
import { IAppManagement } from "../utils/interfaces";
import { SfcCompiler } from "./SfcCompiler";

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
  private container?: HTMLDivElement; // Store the container reference

  constructor(
    private appManagement: IAppManagement,
    private sfcData: SfcData,
    private sfcCallbacks: SfcCallback,
    private options: SfcOptions,
    container?: HTMLDivElement // Optional container parameter
  ) {
    if (!this.sfcData) throw new Error("sfcData is null");
    if (!this.sfcCallbacks) throw new Error("sfcCallbacks is null");
    if (!this.options) throw new Error("options is null");
    if (!this.appManagement) throw new Error("appManagement is null");
    this.compiler = new SfcCompiler();
    this.container = container; // Store the container reference if provided
  }

  // Ability to set container later if not provided in constructor
  public setContainer(container: HTMLDivElement): void {
    this.container = container;
  }
  // Temporäre Methode
  public loadTestData() {
    // Use the test data that's already defined at the bottom of the file
    this.sfcData = testSfcData;
    console.log("Test data loaded");
  }

  // RenderUI now uses the stored container if no parameter is provided
  public RenderUI(subcontainer?: HTMLDivElement): void {
    // Use provided subcontainer or fall back to stored container
    const targetContainer = subcontainer || this.container;

    // Check if we have a valid container
    if (!targetContainer) throw new Error("No container available for rendering");

    // The rest of your rendering logic
    if (!this.sfcData) throw new Error("sfcData is null");

    // Clear previous content
    targetContainer.innerHTML = "";

    // Create the menu at the top of the subcontainer
    this.buildMenu(targetContainer);

    // Create the main container for the SFC below the menu
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
  // eventuell besser in SfcManager aufgehoben.
  private async postSfcData() {
    try {
      // Implementation here
    } catch (error) {
      console.error("Fehler in postSfcData:", error);
    }
  }

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
          new MenuItem("☭ Start Debug", () => this.postSfcData()),
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
    // Track next level steps
    const nextLevelSteps: SfcStep[] = [];

    // Process each step at this level
    steps.forEach((step, index) => {
      // Skip if already visited (prevents cycles)
      if (visitedSteps.has(step.uid)) return;
      visitedSteps.add(step.uid);

      // Build the step UI directly in the grid container
      const stepElement = this.buildStep(container, step);

      // Position the step in the grid
      // Row is determined by level (vertical position)
      // Column is determined by index within current level (horizontal position)
      stepElement.style.gridRow = `${level + 1}`;
      stepElement.style.gridColumn = `${index + 1}`;

      // Add margin for spacing and better visual hierarchy
      stepElement.style.margin = "10px";
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

    // Create upper part (4/5 of height)
    const upperPart = Html(stepContainer, "div", [], ["step-upper-part"], undefined, {
      display: "flex",
      flexDirection: "row",
      height: "80%"
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
      padding: "0",  // Remove padding to maximize table space
      overflow: "hidden", // Prevent overflow issues
      boxSizing: "border-box" // Ensure border is included in width calculation
    });

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
    Html(colGroup, "col", [], [], undefined, { width: "40%" }); // Qualifier column - 2/5
    Html(colGroup, "col", [], [], undefined, { width: "60%" }); // Action column - 3/5

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

    // Lower part with matching divisions as the upper part
    const lowerPart = Html(stepContainer, "div", [], ["step-lower-part"], undefined, {
      height: "20%",
      display: "flex",
      flexDirection: "row"
    });

    // Updated the lower-name section to ensure the vertical line is properly centered
    const lowerLeftSection = Html(lowerPart, "div", [], ["lower-name"], undefined, {
      width: "25%",
      padding: "4px",
      backgroundColor: "#f9f9f9",
      fontSize: "0.8em",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative" // Added to ensure proper positioning context
    });

    // Centered vertical line with absolute positioning
    Html(lowerLeftSection, "div", [], ["vertical-line"], undefined, {
      position: "absolute",
      width: "2px",
      height: "100%",
      backgroundColor: "black",
      left: "50%",
      transform: "translateX(-50%)"
    });
    // 2. Middle section 
    const lowerMiddleSection = Html(lowerPart, "div", [], ["lower-bridge"], undefined, {
      width: "15%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative"
    });

    // 3. Right section (same as actions area)
    const lowerRightSection = Html(lowerPart, "div", [], ["lower-actions"], undefined, {
      width: "60%",
      padding: "4px",
      backgroundColor: "#f9f9f9",
      fontSize: "0.8em"
    });
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
}

// Annahme: Die Typen aus SfcData.ts sind bereits im Projekt verfügbar.
// Zum Beispiel: SfcData, SfcStep, SfcAction, ActionN, ActionS0, ActionL, ActionD, ActionP, ActionSD,
// BaseTransition, TransitionSimple, etc.

// Erstelle zunächst die einzelnen Schritte (Steps)

// Schritt 1: Start-Step
const step1: SfcStep = {
  uid: "step1",
  caption: "S_1",
  actions: [
    {
      codeUid: "A001",
      caption: "Activate Motor",
      targetBoolean: "redLed",
      qualifier: "N"  // ActionN
    } as SfcAction,
    {
      codeUid: "A002",
      caption: "Initialize Sensors",
      targetBoolean: "yellowLed",
      qualifier: "S0"  // ActionS0
    } as SfcAction,
  ],
  outgoingTransitions: [], // Wird im Folgenden ergänzt
  // incomingTransitions bleibt leer, da dies der erste Step ist
};

// Schritt 2: Intermediate Step
const step2: SfcStep = {
  uid: "step2",
  caption: " S_2",
  actions: [
    {
      codeUid: "A003",
      caption: "Check Temperature",
      targetBoolean: "greenLed",
      qualifier: "L"   // ActionL
    } as SfcAction,
    {
      codeUid: "A004",
      caption: "Delay Process",
      targetBoolean: "merk1",
      qualifier: "D"   // ActionD
    } as SfcAction,
  ],
  outgoingTransitions: [],
  incomingTransitions: [],
};

// Schritt 3: Final Step
const step3: SfcStep = {
  uid: "step3",
  caption: "S_3",
  actions: [
    {
      codeUid: "A005",
      caption: "Stop Process",
      targetBoolean: "merk2",
      qualifier: "P"   // ActionP
    } as SfcAction,
    {
      codeUid: "A006",
      caption: "Reset Alarms",
      targetBoolean: "merk3",
      qualifier: "SD"  // ActionSD
    } as SfcAction,
  ],
  outgoingTransitions: [],
  incomingTransitions: [],
};

// Erstelle nun Transitionen zwischen den Steps:
// Übergang von Step 1 zu Step 2
const transition1: SfcTransition = {
  type: "simple",
  source: [step1],
  sourceDone: [true], // Beispielwert: "Step1" ist abgeschlossen, um die Transition auszulösen.
  target: [step2],
  condition: ["Motor active"] // Beispielhafte Bedingung
};

// Übergang von Step 2 zu Step 3
const transition2: SfcTransition = {
  type: "simple",
  source: [step2],
  sourceDone: [false], // Beispielwert
  target: [step3],
  condition: ["Temperature optimal"]
};

// Weisen die Transitionen den entsprechenden Steps zu:
step1.outgoingTransitions.push(transition1);
step2.incomingTransitions!.push(transition1);
step2.outgoingTransitions.push(transition2);
step3.incomingTransitions!.push(transition2);

// Erstelle abschließend den vollständigen SFC-Datencontainer
const testSfcData: SfcData = {
  start: step1,
  steps: [step1, step2, step3],
  booleans: {
    redLed: false,
    yellowLed: false,
    greenLed: false,
    merk1: false,
    merk2: false,
    merk3: false,
    merk4: false,
  },
};

// TestSfcData enthält nun 3 aufeinanderfolgende Steps,
// wobei jeder Step mindestens 2 Actions besitzt und Transitionen definiert sind.
console.log(testSfcData);