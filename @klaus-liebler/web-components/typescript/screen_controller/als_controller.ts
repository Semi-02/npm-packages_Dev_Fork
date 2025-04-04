//************ komplett neu zum testen von neuer Komponente ***************
import { html } from "lit-html";
import { ResponseWrapper, ResponseJournal, RequestJournal, RequestWrapper, Requests, Responses, Namespace } from "@generated/flatbuffers_ts/journal";

import { ScreenController } from "./screen_controller";
import * as flatbuffers from "flatbuffers"

export class HelloWorldController extends ScreenController {
    OnMessage(namespace: number, bb: flatbuffers.ByteBuffer): void {
    }
    public OnCreate(): void {
    }
    protected OnFirstStart(): void {
        
    }
    protected OnRestart(): void {
       
    }
    OnPause(): void {
    }
    public Template = () => html`
    <h1>Ablaufsprache!</h1>
    <p>Willkommen in deiner neuen Screen-Controller-Seite.</p>
    <p>Der könnte dann für die Ablaufsprache gut sein.</p>
`;

}