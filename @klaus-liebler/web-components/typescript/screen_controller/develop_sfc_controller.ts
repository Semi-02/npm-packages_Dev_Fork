//************ komplett neu zum testen von neuer Komponente ***************
import { html } from "lit-html";
import { ResponseWrapper, ResponseJournal, RequestJournal, RequestWrapper, Requests, Responses, Namespace } from "@generated/flatbuffers_ts/journal";
import { createRef, ref, Ref } from "lit-html/directives/ref.js";
import { ScreenController } from "./screen_controller";
import { IAppManagement } from "../utils/interfaces";
import * as flatbuffers from "flatbuffers"
import { SfcUI,SfcOptions,SfcCallback } from "../sequentialfunctionchart/SfcUI";
import { SfcData,SfcBooleans } from "../sequentialfunctionchart/SfcData";

export class DevelopSFCController extends ScreenController {

    private mainDiv:Ref<HTMLInputElement> = createRef();
    private sfcui: SfcUI;

    //Object das registiert ist und dessen Änderungen im develop-ui Div angezeigt werden
    public Template = () => html`<div ${ref(this.mainDiv)} class="develop-ui"></div>`

    OnMessage(namespace: number, bb: flatbuffers.ByteBuffer): void {
    }

    OnFirstStart(): void {
        // Now we don't need to pass the container each time
        // Just set it once when the element is available
        
        if (this.mainDiv.value && !this.sfcui["container"]) { // Access internal property
            this.sfcui.setContainer(this.mainDiv.value as HTMLDivElement);
        }
        this.sfcui.RenderUI(); // No need to pass container
    }
    OnRestart(): void {
        this.OnFirstStart()
    }
    
    OnPause(): void {
       // window.clearInterval(this.timer);
    }

    public OnCreate() { }
   ;

   //To-Do : Datenklassen anpassen an SfcData und Manager
  constructor(appManagement:IAppManagement, httpServerPrexix="") {
        super(appManagement);
        let data: SfcData = {start:null,steps:[],booleans: null};
        let options = new SfcOptions(httpServerPrexix);
        let callbacks = new SfcCallback();
        this.sfcui = new SfcUI(this.appManagement, data, callbacks, options);
        this.appManagement.RegisterWebsocketMessageNamespace(this, Namespace.Value);
    }
}