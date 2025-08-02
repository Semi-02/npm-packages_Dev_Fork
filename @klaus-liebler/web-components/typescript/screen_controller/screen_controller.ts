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

export class DefaultScreenController extends ScreenController {
    
   public Template = () => html`
  <div style="padding: 20px; font-family: 'Dosis', sans-serif; line-height: 1.6;">
    <h2>Willkommen bei Lab@Home WebUI</h2>
    <p>Diese Benutzeroberfläche ermöglicht dir die intuitive Steuerung und Konfiguration deines Laborsystems. Hier findest du eine Übersicht der wichtigsten Seiten:</p>

    <hr />

    <h3>🏠 Home</h3>
    <p>Dies ist die Startseite. Du findest hier allgemeine Hinweise zur Bedienung und Orientierung.</p>

    <h3>🥽 Function Block</h3>
    <p>Erstelle und simuliere Flowcharts (Funktionspläne):</p>
    <ul>
      <li>Baue Logik mit Blöcken wie AND, OR, FlipFlop</li>
      <li><strong>Zoomen</strong> mit Strg + Scroll oder Touchpad</li>
      <li><strong>Drag & Drop</strong> zum Verschieben und Verbinden</li>
      <li>Live-Ausführung möglich</li>
    </ul>

    <h3>🔥 Control Heater</h3>
    <p>Experimentiere mit einem Heizer und Lüfter:</p>
    <ul>
      <li>Wähle zwischen <strong>Functionblock</strong>, <strong>Open Loop</strong> und <strong>Closed Loop</strong></li>
      <li>Regle Parameter wie K<sub>P</sub>, T<sub>N</sub>, T<sub>V</sub></li>
      <li>Live-Diagramm: Temperatur, Heizer- & Lüfterleistung</li>
      <li>Datenaufzeichnung & Export</li>
    </ul>

    <h3>🔧 System Settings</h3>
    <p>Stelle systemnahe Optionen ein:</p>
    <ul>
      <li>Boot-Einstellungen</li>
      <li>Netzwerk- & Debugfunktionen</li>
    </ul>

    <h3>⌘ Settings</h3>
    <p>Verwalte Benutzereinstellungen:</p>
    <ul>
      <li>Sprache, Board-Infos & Version</li>
      <li>Anpassung der Oberfläche</li>
    </ul>

    <h3>📶 Wifi Manager</h3>
    <p>Konfiguriere WLAN-Verbindungen:</p>
    <ul>
      <li>Netzwerk auswählen & verbinden</li>
      <li>Signalstärke anzeigen</li>
    </ul>

    <hr />
    <p style="font-style: italic;">Tipp: Du kannst jederzeit zwischen den Seiten über die Navigation links wechseln.</p>
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