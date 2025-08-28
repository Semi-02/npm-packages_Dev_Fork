import * as flatbuffers from 'flatbuffers';
import { TemplateResult, html } from "lit-html";
import { IAppManagement, IWebsocketMessageListener } from "../utils/interfaces";

export enum ControllerState {
    CREATED,
    STARTED,
    PAUSED,
}

export abstract class ScreenController implements IWebsocketMessageListener {
    private state=ControllerState.CREATED
    public get State(): ControllerState {
        return this.state; 
    }
    constructor(protected appManagement: IAppManagement) {}
    
    public OnStartPublic(){
        switch (this.state) {
            case ControllerState.CREATED:
                this.OnFirstStart();
                this.state=ControllerState.STARTED;
                break;
            case ControllerState.STARTED:
                break;
            case ControllerState.PAUSED:
                this.OnRestart();
                this.state=ControllerState.STARTED;
                break;
            default:
                break;
        }
    }
    public OnPausePublic(){
        switch (this.state) {
            case ControllerState.CREATED:
                break;
            case ControllerState.STARTED:
                this.OnPause();
                this.state=ControllerState.PAUSED;
                break;
            case ControllerState.PAUSED:
                break;
            default:
                break;
        }
    }
    public abstract OnCreate(): void;
    protected abstract OnFirstStart(): void;
    protected abstract OnRestart(): void;
    abstract OnPause(): void;
    abstract OnMessage(namespace:number, bb: flatbuffers.ByteBuffer): void;
    abstract Template():TemplateResult<1>
    SetParameter(_params:RegExpMatchArray):void{}
}

/*[Projekt-Erweiterung] DefaultScreenController: Startseite mit Hilfetexten*/
export class DefaultScreenController extends ScreenController {
    
     public Template = () => html`
 <div style="padding: 20px; font-family: 'Dosis', sans-serif; line-height: 1.6;">
    <h2>Willkommen bei Lab@Home WebUI</h2>
    <p>Diese Benutzeroberfläche ermöglicht dir die intuitive Steuerung und Konfiguration deines Laborsystems.</p>

    <hr />

    <h3>🏠 Home</h3>
    <p>Dies ist die Startseite. Du findest hier allgemeine Hinweise zur Bedienung und Orientierung.</p>

    <h3>🥽 Function Block</h3>
    <p>Erstelle und simuliere Flowcharts (Funktionspläne):</p>
    <ul>
      <li>Baue Logik mit Blöcken wie AND, OR, TON</li>
      <li><strong>Zoomen</strong> mit Strg + Scroll oder Touchpad</li>
      <li><strong>Mehrfachauswahl</strong> mit Lasso oder Shift + Klick</li>
      <li><strong>Superblock erstellen & verwalten:</strong></li>
        <ul>
          <li>InputBlock = Eingang, OutputBlock = Ausgang als BLöcke unter Custom-Eintrag</li>
          <li>Macro → Create Macro → Namen eingeben → speichern</li>
          <li>Dann: „Reload Macros from labathome“ im Menü Macro</li>
          <li>Superblock erscheint unter CustomBlocks in der Liste</li>
          <li>Klick zum hinzufügen ins Flowchart</li>
          <li>Löschen: Rechtsklick auf Eintrag oder Delete Macro im Menü Macro</li>
        </ul>
      <li>Live-Ausführung möglich</li>
    </ul>

    <h3>🔥 Control Heater</h3>
    <p>Experimentiere mit einem Heizer und Lüfter:</p>
    <ul>
      <li>Wähle: Functionblock / Open Loop / Closed Loop</li>
      <li>Regle Parameter: K<sub>P</sub>, T<sub>N</sub>, T<sub>V</sub></li>
      <li>Live-Diagramm & Datenexport</li>
    </ul>

    <h3>🔧 System Settings</h3>
    <ul>
      <li>Boot-Modus & Debugfunktionen</li>
    </ul>

    <h3>⌘ Settings</h3>
    <ul>
      <li>Sprache, Version, Oberfläche anpassen</li>
    </ul>

    <h3>📶 Wifi Manager</h3>
    <ul>
      <li>WLAN auswählen & verbinden</li>
    </ul>

    <hr />
    <p style="font-style: italic;">💡 Tipp: Links im Menü kannst du jederzeit die Seite wechseln.</p>
  </div>
`;

   
    OnMessage(_namespace:number, _data: flatbuffers.ByteBuffer): void {
        
    }

    OnCreate(): void {

    }
    OnFirstStart(): void {

    }
    OnRestart(): void {

    }
    OnPause(): void {

    }
}