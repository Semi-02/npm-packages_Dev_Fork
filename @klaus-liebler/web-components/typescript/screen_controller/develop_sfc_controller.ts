import { html } from "lit-html";
import { createRef, ref, Ref } from "lit-html/directives/ref.js";
import { ScreenController } from "./screen_controller";
import { IAppManagement } from "../utils/interfaces";
import * as flatbuffers from "flatbuffers";
import { SfcUI, SfcCallback } from "../sequentialfunctionchart/SfcUI";
import { SfcData, SfcBooleans } from "../sequentialfunctionchart/SfcData";
import { SfcCompiler } from "../sequentialfunctionchart/SfcCompiler";
import { SfcManager,SfcOptions } from "../sequentialfunctionchart/SfcManager";
import { RequestSFCRun, RequestWrapper, Requests } from "@generated/flatbuffers_ts/functionblock";

// SFC Namespace für Websocket-Kommunikation
export const SFC_NAMESPACE = 999;

export class DevelopSFCController extends ScreenController {
    private mainDiv: Ref<HTMLInputElement> = createRef();
    private sfcData: SfcData;
    private sfcUI: SfcUI;
    private sfcCompiler: SfcCompiler;
    private sfcManager: SfcManager;

    // Template für die Anzeige
    public Template = () => html`<div ${ref(this.mainDiv)} class="develop-ui"></div>`;

    // Nachrichtenverarbeitung vom Websocket
    OnMessage(namespace: number, bb: flatbuffers.ByteBuffer): void {
        if (namespace === SFC_NAMESPACE) {
            // Hier können eingehende SFC-Nachrichten verarbeitet werden
            console.log("SFC message received");
        }
    }

   OnFirstStart(): void {
    if (this.mainDiv.value) {
        this.sfcUI.setContainer(this.mainDiv.value as HTMLDivElement);
        this.sfcUI.RenderUI();
    }
}

OnRestart(): void {
    if (this.mainDiv.value) {
        this.sfcUI.setContainer(this.mainDiv.value as HTMLDivElement);
        this.sfcUI.RenderUI();
    }
}

OnPause(): void {
    if (this.mainDiv.value) {
        this.mainDiv.value.innerHTML = "";
    }
}

    // Wird bei der Erstellung aufgerufen
    public OnCreate() { }

    // Konstruktor mit Initialisierung aller Komponenten
    constructor(appManagement: IAppManagement, httpServerPrefix = "") {
        super(appManagement);
        
        // Erstelle SfcData mit korrekter Initialisierung
        this.sfcData = new SfcData();
        
        // Erstelle SfcBooleans und setze in SfcData
        this.sfcData.booleans = new SfcBooleans();
        
        // Erstelle Optionen und Callbacks
        const options = new SfcOptions(httpServerPrefix);
        const callbacks = new SfcCallback();
        
        // Erstelle Compiler
        this.sfcCompiler = new SfcCompiler();
        
        // Erstelle UI mit allen Abhängigkeiten
        this.sfcUI = new SfcUI(this.appManagement, callbacks);
        
        // Erstelle Manager mit allen Abhängigkeiten
        this.sfcManager = new SfcManager(this.sfcData, this.sfcUI, this.sfcCompiler, this.appManagement, options);
        
        // Setze Manager-Referenz in UI
        this.sfcUI.sfcManager = this.sfcManager;
        
        // Registriere für Websocket-Nachrichten
        this.appManagement.RegisterWebsocketMessageNamespace(this, SFC_NAMESPACE);
    }
}