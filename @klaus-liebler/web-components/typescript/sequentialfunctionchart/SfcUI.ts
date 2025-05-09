/**
 * =============================================================================
 * @file        SfcUIs.ts
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
import { SfcData,SfcBooleans, SfcStep ,SfcAction,SfcTransition } from "./SfcData";
import { IAppManagement } from "../utils/interfaces";

import { SfcCompiler } from "./SfcCompiler";


//To-Do : Überarbeiten auf Sfc
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
//To-Do : Überarbeiten auf SfcData
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

    public RenderUi(subcontainer: HTMLDivElement) {
        if (!subcontainer) throw new Error("container is null");
        //let subcontainer = <HTMLDivElement>Html(container, "div", [], ["develop-ui"]);
        this.sfcData = testSfcData;
        //Erzeugt Menüleiste oben im Subcontainer
        this.buildMenu(subcontainer);
        //Erzeugt den Hauptcontainer für die SFC kommt unter das Menü
        const gridContainer = document.createElement("div");
        this.buildGrid(gridContainer);

        subcontainer.appendChild(gridContainer);
    
    }

    //To-Do: SFC HttpL Request Funktion schreiben und in Menü integrieren
    private async postSfcData() {
        try {
            //Hier immplementieren
        } catch (error) {
            console.error("Fehler in postSfcData:", error);
        }
    }

    private buildMenu(subcontainer: HTMLDivElement) {
        //Datei mit existierender Configuration reinladen 
        let fileInput = <HTMLInputElement>Html(subcontainer, "input", ["type", "file", "id", "fileInput", "accept", ".json"]);
        fileInput.style.display = "none";
        fileInput.onchange = (e) => {
            //this.openFbdFromLocalFile(fileInput.files);
        }

        var mm: MenuManager = new MenuManager(
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
                ]),
                new Menu("Simulation", [
                    new MenuItem("➤ Start Simulation", () => null),
                    new MenuItem("× Stop Simulation", () => null)
                ])
            ]
        );
        mm.Render(subcontainer)
    }
    private buildGrid(gridcontainer: HTMLDivElement) {
        // Setze den Subcontainer auf Flexbox mit horizontaler Ausrichtung
        gridcontainer.style.display = "flex";
        gridcontainer.style.flexDirection = "row"; // Horizontal ausgerichtet
        gridcontainer.style.height = "100%";
        gridcontainer.style.width = "100%";
    
        // Erstelle Diagram-Bereich (2/3 der Breite)
        const diagramContainer = document.createElement("div");
        diagramContainer.style.flex = "2"; // 2/3 der Breite
        diagramContainer.style.border = "1px solid #ccc"; // Optional: Rahmen für Sichtbarkeit
        diagramContainer.style.height = "100%"; // Volle Höhe
        this.buildDiagram(diagramContainer);
        gridcontainer.appendChild(diagramContainer);
    
        // Erstelle BooleanField-Bereich (1/3 der Breite)
        const booleanFieldContainer = document.createElement("div");
        booleanFieldContainer.style.flex = "1"; // 1/3 der Breite
        booleanFieldContainer.style.border = "1px solid #ccc"; // Optional: Rahmen für Sichtbarkeit
        booleanFieldContainer.style.height = "100%"; // Volle Höhe
        this.buildBooleanField(booleanFieldContainer);
        gridcontainer.appendChild(booleanFieldContainer);
    }
   // Annahme: this.sfcData vom Typ SfcData ist bereits definiert und enthält beispielsweise 6 Steps.
private buildDiagram(diagramContainer: HTMLDivElement) {
  // Vorherige Inhalte entfernen.
  diagramContainer.innerHTML = "";

  // Konfiguriere den Container als Grid mit 3 Spalten (ergibt 6 Felder, wenn 6 Steps vorhanden sind)
  diagramContainer.style.display = "grid";
  diagramContainer.style.gridTemplateColumns = "repeat(3, 1fr)";
  diagramContainer.style.gap = "10px";
  diagramContainer.style.padding = "10px";

  // Iteriere über alle Steps und erstelle ein Layout pro Step.
  this.sfcData.steps.forEach(step => {
    // Erstelle den roten Container (das segmentierte Layout)
    const segmentContainer = document.createElement("div");
    segmentContainer.style.border = "2px solid red";
    segmentContainer.style.display = "flex";
    segmentContainer.style.flexDirection = "column";
    segmentContainer.style.height = "150px"; // Feste Höhe – kann je nach Wunsch angepasst werden.

    // Erstelle den gelben Bereich, der den Step repräsentiert.
    const stepHeader = document.createElement("div");
    stepHeader.style.backgroundColor = "yellow";
    stepHeader.style.padding = "5px";
    stepHeader.style.textAlign = "center";
    stepHeader.style.fontWeight = "bold";
    stepHeader.textContent = step.caption; // Hier kann auch step.uid oder eine komplexere Darstellung genutzt werden.
    segmentContainer.appendChild(stepHeader);

    // Erstelle den blauen Bereich, der die zugehörigen Actions anzeigt.
    const actionsContainer = document.createElement("div");
    actionsContainer.style.backgroundColor = "blue";
    actionsContainer.style.flex = "1"; // Füllt den restlichen Platz im Container aus.
    actionsContainer.style.padding = "5px";
    actionsContainer.style.color = "white"; // Damit der Text gut lesbar ist.

    // Füge alle Actions (ActionN, ActionR0, ...) hinzu.
    step.actions.forEach(action => {
      const actionElement = document.createElement("div");
      actionElement.style.marginBottom = "4px";
      // Darstellung: Code, Caption und der Qualifier (genau wie z. B. "A001 - START (N)")
      actionElement.textContent = `${action.codeUid} - ${action.caption} (${action.qualifier})`;
      actionsContainer.appendChild(actionElement);
    });
    segmentContainer.appendChild(actionsContainer);

    // Füge den gesamten segmentierten Step dem Diagramm hinzu.
    diagramContainer.appendChild(segmentContainer);
  });
}

    private buildBooleanField(subcontainer: HTMLDivElement) {
        //Hier werden die Booleans angezeigt und der Startzustand kann gesetzt werden.
    }



    constructor(private appManagement: IAppManagement, private sfcData: SfcData, private sfcCallbacks: SfcCallback, private options: SfcOptions) {
        if (!this.sfcData) throw new Error("sfcData is null");
        if (!this.sfcCallbacks) throw new Error("sfcCallbacks is null");
        if (!this.options) throw new Error("options is null");
        if (!this.appManagement) throw new Error("appManagement is null");
        this.compiler = new SfcCompiler();
    }


}

// Annahme: Die Typen aus SfcData.ts sind bereits im Projekt verfügbar.
// Zum Beispiel: SfcData, SfcStep, SfcAction, ActionN, ActionS0, ActionL, ActionD, ActionP, ActionSD,
// BaseTransition, TransitionSimple, etc.

// Erstelle zunächst die einzelnen Schritte (Steps)

// Schritt 1: Start-Step
const step1: SfcStep = {
  uid: "step1",
  caption: "Start Step",
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
  caption: "Intermediate Step",
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
  caption: "Final Step",
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
