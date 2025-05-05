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
import { Flowchart } from "../flowchart/Flowchart";
import { ColorNumColor2ColorDomString, EventCoordinatesInSVG, Html, Svg } from "../utils/common";
import { Menu, MenuItem, MenuManager } from "./MenuManager";
import { SfcData, SfcAction, SfcOperator, SfcTransition } from "./SfcData";
import { IAppManagement } from "../utils/interfaces";
import { SfcTransitionType } from "./SfcData";

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

    public RenderUi(subcontainer: HTMLDivElement) {
        if (!subcontainer) throw new Error("container is null");
        //let subcontainer = <HTMLDivElement>Html(container, "div", [], ["develop-ui"]);


        this.buildMenu(subcontainer);
        //Tablen aufteiltung hier machen und dann über unterfunktionen bevölkern

        // Testinhalt in einem neuen div für sfc
        const testDiv = document.createElement("div");
        testDiv.style.display = "grid";
        testDiv.style.gridTemplateColumns = "1fr 1fr";
        testDiv.style.gap = "10px";
        testDiv.style.height = "100%";
        testDiv.style.padding = "10px";
        testDiv.style.boxSizing = "border-box";

        // Linker Bereich (z. B. Operatoren)
        const leftGrid = document.createElement("div");
        leftGrid.style.border = "1px solid #ccc";
        leftGrid.style.padding = "10px";
        leftGrid.innerHTML = "<h2>Operatoren</h2>";

        // Rechter Bereich (z. B. Details, Aktionen)
        const rightGrid = document.createElement("div");
        rightGrid.style.border = "1px solid #ccc";
        rightGrid.style.padding = "10px";
        rightGrid.innerHTML = "<h2>Details / Aktionen</h2>";

        testDiv.appendChild(leftGrid);
        testDiv.appendChild(rightGrid);
        subcontainer.appendChild(testDiv);
        

        // ******************************************************
        // Falls keine Operatoren vorhanden sind, Info anzeigen + Button
        if (!this.sfcData.operator || this.sfcData.operator.length === 0) {
            const emptyMessage = document.createElement("div");
            emptyMessage.textContent = "Noch keine Operatoren vorhanden.";
            emptyMessage.style.fontStyle = "italic";
            emptyMessage.style.color = "#888";

            const addButton = document.createElement("button");
            addButton.textContent = "+ Ersten Operator hinzufügen";
            addButton.style.marginTop = "10px";
            addButton.onclick = () => {
                // Beispieloperator erstellen
                const newOperator: SfcOperator = {
                    Uid: "op_" + Date.now(), // einfache eindeutige ID
                    caption: "Neuer Startoperator",
                    actions: [],
                    sourceTransitions: {
                        type: SfcTransitionType.simple, //enum SfcTransitionType
                        source: [],
                        sourceDone: [],
                        target: [],
                        condition: []
                    },
                    targetTransitions: {
                        type: SfcTransitionType.simple, //enum SfcTransitionType
                        source: [],
                        sourceDone: [],
                        target: [],
                        condition: []
                    }
                };
            
                // Initialisiere Operator-Array, falls nicht vorhanden
                if (!this.sfcData.operator) {
                    this.sfcData.operator = [];
                }
            
                // Neuen Operator zur Datenstruktur hinzufügen
                this.sfcData.operator.push(newOperator);
            
                // UI neu rendern
                subcontainer.innerHTML = ""; // Vorheriges UI löschen
                this.RenderUi(subcontainer); // Neu aufbauen
            };
            

            leftGrid.appendChild(emptyMessage);
            leftGrid.appendChild(addButton);
            return; // Wichtig: Danach nicht weitermachen
        }

        // Operatoren aus den Daten anzeigen
    this.sfcData.operator.forEach((op) => {
    const operatorBlock = document.createElement("div");
    operatorBlock.style.border = "1px solid #000";
    operatorBlock.style.padding = "8px";
    operatorBlock.style.marginBottom = "10px";
    operatorBlock.style.position = "relative";
    operatorBlock.style.backgroundColor = "#f9f9f9";
    operatorBlock.style.borderRadius = "5px";

    // Caption
    const caption = document.createElement("div");
    caption.textContent = op.caption;
    caption.style.fontWeight = "bold";
    operatorBlock.appendChild(caption);

    // Richtungsbuttons
    const directions = ["↑", "→", "↓", "←"];
    const directionWrapper = document.createElement("div");
    directionWrapper.style.display = "flex";
    directionWrapper.style.gap = "5px";
    directionWrapper.style.marginTop = "5px";

    directions.forEach((dir) => {
        const btn = document.createElement("button");
        btn.textContent = dir;
        btn.title = `Füge Operator ${dir} hinzu`;
        btn.style.padding = "2px 5px";
        btn.style.fontSize = "12px";
        btn.style.cursor = "pointer";
    
        btn.onclick = () => {
            const newOp: SfcOperator = {
                Uid: "op_" + Date.now(),
                caption: `Neu (${dir})`,
                actions: [],
                sourceTransitions: {
                    type: SfcTransitionType.simple, //enum SfcTransitionType
                    source: [],
                    sourceDone: [],
                    target: [],
                    condition: []
                },
                targetTransitions: {
                    type: SfcTransitionType.simple, //enum SfcTransitionType
                    source: [],
                    sourceDone: [],
                    target: [],
                    condition: []
                }
            };
    
            // Neue Transition zwischen aktuellem und neuem Operator
            const newTransition: SfcTransition = {
                type: SfcTransitionType.simple, //enum SfcTransitionType
                source: [op],
                sourceDone: [false],
                target: [newOp],
                condition: ["true"]
            };
    
            // Verbindung hinzufügen
            op.targetTransitions = newTransition;
            newOp.sourceTransitions = newTransition;
    
            // Zur Datenstruktur hinzufügen
            this.sfcData.operator.push(newOp);
    
            // Neu rendern
            subcontainer.innerHTML = "";
            this.RenderUi(subcontainer);
        };
    
        directionWrapper.appendChild(btn);
    });
    

    operatorBlock.appendChild(directionWrapper);
    leftGrid.appendChild(operatorBlock);
});




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
                    new MenuItem("☭ Start Debug", () => null),
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

    constructor(private appManagement: IAppManagement, private sfcData: SfcData, private sfcCallbacks: SfcCallback, private options: SfcOptions) {
        if (!this.sfcData) throw new Error("sfcData is null");
        if (!this.sfcCallbacks) throw new Error("sfcCallbacks is null");
        if (!this.options) throw new Error("options is null");
        if (!this.appManagement) throw new Error("appManagement is null");
    }

    //To-Do: SFC HttpL Request Funktion schrieben und in Menü integrieren

}