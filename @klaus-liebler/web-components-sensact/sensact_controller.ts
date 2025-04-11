import { ControllerState, ScreenController } from "@klaus-liebler/web-components";
import { TemplateResult, html, render } from "lit-html";
import { Ref, createRef, ref } from "lit-html/directives/ref.js";
import { ApplicationGroup, SensactApplication, SensactApplicationAndLocalFlag } from "./sensactapps_base";
import * as flatbuffers from 'flatbuffers';

import bed from '@klaus-liebler/svgs/solid/bed.svg?raw'
import lightbulb from '@klaus-liebler/svgs/solid/lightbulb.svg?raw'
import arrows_to_circle from '@klaus-liebler/svgs/solid/arrows-to-circle.svg?raw'
import { unsafeSVG } from "lit-html/directives/unsafe-svg.js";
import { GetLevelFromApplicationId, GetRoomFromApplicationId, GetTechnologyFromApplicationId } from "@klaus-liebler/sensact-base/application_id_utils";

import { ApplicationId, Command, Namespace, NotifyStatus, Requests, ResponseCommand, Responses, ResponseStatus, ResponseWrapper, RequestWrapper, RequestCommand, Payload } from "@generated/flatbuffers_ts/sensact";
import { ISensactContext } from "@klaus-liebler/sensact-base/interfaces";
import { IAppManagement } from "@klaus-liebler/web-components/typescript/utils/interfaces";
import  "@klaus-liebler/commons"


export class SensactController extends ScreenController implements ISensactContext {
    
    public SendCommandMessage(id: ApplicationId, cmd: Command, payload: DataView) {
        let b = new flatbuffers.Builder(1024);
        const payloadArray = Array.from(new Uint8Array(payload.buffer, payload.byteOffset, payload.byteLength));
        
        RequestCommand.startRequestCommand(b)
        RequestCommand.addId(b, id);
        RequestCommand.addCmd(b, cmd);
        RequestCommand.addPayload(b, Payload.createPayload(b, payloadArray, payloadArray.length));
        const offset = RequestCommand.endRequestCommand(b);

        b.finish(
            RequestWrapper.createRequestWrapper(
                b,
                Requests.RequestCommand,
                offset
            )
        )
        this.appManagement.SendFinishedBuilder(Namespace.Value, b, 0);
    }

    private groups: Array<ApplicationGroup>;
    private filterLocal:boolean=true;

    private btnSortTechnology() {
        var tech2apps = new Map<string, Array<SensactApplication>>();
        for (const appc of this.id2appContainer.values()) {
            if(this.filterLocal && !appc.local) continue;
            var k = GetTechnologyFromApplicationId(appc.app.applicationId);
            var arr = tech2apps.getOrAdd(k, () => new Array<SensactApplication>());
            arr.push(appc.app);
        }
        var sortedMap = new Map([...tech2apps.entries()].sort((a, b) => a[0].localeCompare(b[0])));
        this.groups = [];
        sortedMap.forEach((v, k) => {
            this.groups.push(new ApplicationGroup(k, this.appManagement, v, k));
        });
        this.execTemplates();
    }

    private btnOnlyLocalApps(e:MouseEvent){
        const b = e.currentTarget as HTMLButtonElement;
        b.classList.toggle('active');
        this.filterLocal=b.classList.contains("active");
        console.log(`Only Local Apps is ${this.filterLocal}`)
        this.btnSortTechnology()
    }

    private btnSortRooms() {
        var level_room2apps = new Map<string, Array<SensactApplication>>();
        for (const appc of this.id2appContainer.values()) {
            if(this.filterLocal && !appc.local) continue;
            var room_level = GetRoomFromApplicationId(appc.app.applicationId) + "_" + GetLevelFromApplicationId(appc.app.applicationId);
            var arr = level_room2apps.getOrAdd(room_level, () => new Array<SensactApplication>());
            arr.push(appc.app);
        }
        var sortedMap = new Map([...level_room2apps.entries()].sort((a, b) => a[0].localeCompare(b[0])));
        this.groups = [];
        sortedMap.forEach((v, k) => {
            this.groups.push(new ApplicationGroup(k, this.appManagement, v, k));
        });
        this.execTemplates();
    }

    private execTemplates() {
        var templates = new Array<TemplateResult<1>>();
        this.groups.forEach((group) => {
            templates.push(group.Template());
        });
        render(templates, this.mainElement.value!);
    }

    private mainElement: Ref<HTMLElement> = createRef();
    public Template = () => html`
    <h1>Sensact Controls</h1>
        
    <div class="buttons">
        <button class="withsvg" @click=${() => this.btnSortRooms()}>${unsafeSVG(bed)}<span>Sort Rooms<span></button>
        <button class="withsvg" @click=${() => this.btnSortTechnology()}>${unsafeSVG(lightbulb)}<span>Sort Tech<span></button>
        <button class="withsvg toggle-button active" @click=${(e:MouseEvent) => this.btnOnlyLocalApps(e)}>${unsafeSVG(arrows_to_circle)}<span>Only Local Apps<span></button>
    </div>
    <section ${ref(this.mainElement)}></section>`;

    private id2appContainer: Map<number, SensactApplicationAndLocalFlag>;

    OnMessage(namespace: number, bb: flatbuffers.ByteBuffer): void {
        if (namespace != Namespace.Value) return;
        if(this.State != ControllerState.STARTED) return; //because only when started we are interested in messages
        var messageWrapper = ResponseWrapper.getRootAsResponseWrapper(bb);
        switch (messageWrapper.responseType()) {
            case Responses.ResponseCommand:
                this.onResponseCommand(<ResponseCommand>messageWrapper.response(new ResponseCommand()));
                break;
            case Responses.NotifyStatus: 
                this.onNotifyStatus(<NotifyStatus>messageWrapper.response(new NotifyStatus()));
                break;
            case Responses.ResponseStatus:
                this.onResponseStatus(<ResponseStatus>messageWrapper.response(new ResponseStatus()));
                break;
            default:
                break;
        }
        this.execTemplates();
    }

    private onResponseCommand(m: ResponseCommand) {
        console.debug("Command confirmed");
    }

    private onNotifyStatus(m: NotifyStatus) {
        
        var appc = this.id2appContainer.get(m.id());
        if (!appc) {
            //console.debug(`Unknown app with id ${m.id()}`);
            return;
        }
        const arr = new Uint16Array([
            m.status()!.data(0) ?? 0,
            m.status()!.data(1) ?? 0,
            m.status()!.data(2) ?? 0,
            m.status()!.data(3) ?? 0,
        ]);
        console.debug(`onNotifyStatus for app '${appc.app.ApplicationDescription}' with data ${arr}`);
        appc.app.UpdateState(arr);
        this.execTemplates();
    }


    private onResponseStatus(m: ResponseStatus) {
        console.info(`onResponseStatus for ${m.statesLength()} items`);
        for (var i = 0; i < m.statesLength(); i++) {
            var appc = this.id2appContainer.get(m.states(i)!.id());
            if (!appc) {
                console.warn(`Unknown app with id ${m.states(i)!.id()}`);
                continue;
            }
            const arr = new Uint16Array([m.states(i)!.status()!.data(0)??0,m.states(i)!.status()!.data(1)??0,m.states(i)!.status()!.data(2)??0,m.states(i)!.status()!.data(3)??0, ])
            appc.app.UpdateState(arr);
        }
        this.execTemplates();
    }

    public constructor(appManagement: IAppManagement){
        super(appManagement)
    }
    private apps:Array<SensactApplicationAndLocalFlag>
    public AddApps(apps:Array<SensactApplicationAndLocalFlag>){
        this.apps=apps;
    }
   
    OnCreate(): void {
        this.appManagement.RegisterWebsocketMessageNamespace(this, Namespace.Value);
        this.id2appContainer = new Map<number, SensactApplicationAndLocalFlag>(this.apps.map(v => [v.app.applicationId, v]));
    }

    private onStart_or_onRestart() {
        this.btnSortTechnology();
    }

    OnFirstStart(): void {
        this.onStart_or_onRestart();
    }

    OnRestart(): void {
        this.onStart_or_onRestart();
    }

    OnPause(): void {
    }
}
