/**
 * =============================================================================
 * @file        MyAwesomeClass.ts
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

import { ColorNumColor2ColorDomString, EventCoordinatesInSVG, Html, Svg } from "../utils/common";
import { Menu, MenuItem, MenuManager } from "./MenuManager";
import { SfcData, SfcAction, SfcOperator, SfcTransition } from "./SfcData";
import { IAppManagement } from "../utils/interfaces";

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

        // Testinhalt in einem neuen div erstellen und anhängen
        const testDiv = document.createElement("div");
        testDiv.innerHTML = "<h1>Testinhalt (hier Table)</h1>";
        subcontainer.appendChild(testDiv);


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

    constructor(private appManagement: IAppManagement, private flowchartData: SfcData, private flowchartCallbacks: SfcCallback, private options: SfcOptions) {
        if (!this.flowchartData) throw new Error("flowchartData is null");
        if (!this.flowchartCallbacks) throw new Error("flowchartCallbacks is null");
        if (!this.options) throw new Error("options is null");
        if (!this.appManagement) throw new Error("appManagement is null");
    }
}