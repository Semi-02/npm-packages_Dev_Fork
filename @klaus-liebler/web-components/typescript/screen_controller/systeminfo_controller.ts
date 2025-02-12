import {Namespace, Mac6, RequestRestart, RequestSystemData, ResponseSystemData, Responses, Requests, RequestWrapper, ResponseWrapper } from "@generated/flatbuffers_ts/systeminfo";


import { ScreenController } from "./screen_controller";
import * as flatbuffers from 'flatbuffers';

import { UPLOAD_URL } from "../utils/constants";
import { MyFavouriteDateTimeFormat } from "../utils/common";
import { findChipModel, findChipFeatures, subtypeToString, otaStateToString } from "../utils/esp32";
import { html } from "lit-html";
import { Ref, createRef, ref } from "lit-html/directives/ref.js";
import { OkCancelDialog, OkDialog } from "../dialog_controller";
import { Severity } from "@klaus-liebler/commons";




export class SystemController extends ScreenController {
    private btnUpload:Ref<HTMLInputElement> = createRef();
    private inpOtafile:Ref<HTMLInputElement> = createRef();
    private lblProgress:Ref<HTMLInputElement> = createRef();
    private prgbProgress:Ref<HTMLInputElement> = createRef();
    private tblAppPartitions:Ref<HTMLTableSectionElement> = createRef();
    private tblDataPartitions:Ref<HTMLTableSectionElement> = createRef();
    private tblParameters:Ref<HTMLTableSectionElement> = createRef();

    private sendRequestRestart() {
        let b = new flatbuffers.Builder(1024);
        b.finish(RequestWrapper.createRequestWrapper(b,Requests.RequestRestart, RequestRestart.createRequestRestart(b)));
        this.appManagement.SendFinishedBuilder(Namespace.Value, b);
    }

    private sendRequestSystemdata() {
        let b = new flatbuffers.Builder(1024);
        b.finish(RequestWrapper.createRequestWrapper(b,Requests.RequestSystemData, RequestSystemData.createRequestSystemData(b)))
        this.appManagement.SendFinishedBuilder(Namespace.Value, b, 30000);
    }

    public OnMessage(namespace:number, bb: flatbuffers.ByteBuffer): void {

        if(namespace!=Namespace.Value){
            console.error(`system controller namespace problem: ${namespace}!=${Namespace.Value}`)
            return;
        }
        var rw=ResponseWrapper.getRootAsResponseWrapper(bb);
        if(rw.responseType()!=Responses.ResponseSystemData) throw new Error("Unexpected Response Type");
        var sd=rw.response(new ResponseSystemData());
        this.tblParameters.value!.textContent = "";

        let secondsEpoch = sd.secondsEpoch();
        let localeDate = new Date(Number(1000n * secondsEpoch)).toLocaleString("de-DE", MyFavouriteDateTimeFormat);
        this.insertParameter("Real Time Clock", localeDate + " [" + secondsEpoch.toString() + " secs since epoch]");
        this.insertParameter("Uptime [secs]", sd.secondsUptime().toString());
        this.insertParameter("Free Heap [byte]", sd.freeHeap());
        this.insertParameter("MAC Address WIFI_STA", this.mac6_2_string(sd.macAddressWifiSta()));
        this.insertParameter("MAC Address WIFI_SOFTAP", this.mac6_2_string(sd.macAddressWifiSoftap()));
        this.insertParameter("MAC Address BT", this.mac6_2_string(sd.macAddressBt()));
        this.insertParameter("MAC Address ETH", this.mac6_2_string(sd.macAddressEth()));
        this.insertParameter("MAC Address IEEE802154", this.mac6_2_string(sd.macAddressIeee802154()));
        this.insertParameter("Chip Model", findChipModel(sd.chipModel()));
        this.insertParameter("Chip Features", findChipFeatures(sd.chipFeatures()));
        this.insertParameter("Chip Revision", sd.chipRevision());
        this.insertParameter("Chip Cores", sd.chipCores());
        this.insertParameter("Chip Temperature", sd.chipTemperature().toLocaleString() + "°C");

        this.tblAppPartitions.value!.textContent = "";
        for (let i = 0; i < sd.partitionsLength(); i++) {
            if (sd.partitions(i)!.type() != 0) continue;
            const t = sd.partitions(i)!.type();
            const st = sd.partitions(i)!.subtype()
            var row = this.tblAppPartitions.value!.insertRow();
            row.insertCell().textContent = <string>sd.partitions(i)!.label();
            row.insertCell().textContent = subtypeToString(t, st);
            row.insertCell().textContent = (sd.partitions(i)!.size() / 1024) + "k";
            row.insertCell().textContent = otaStateToString(t,st,sd.partitions(i)!.otaState());
            row.insertCell().textContent = sd.partitions(i)!.running().toString();
            row.insertCell().textContent = sd.partitions(i)!.appName();
            row.insertCell().textContent = sd.partitions(i)!.appVersion();
            row.insertCell().textContent = sd.partitions(i)!.appDate();
            row.insertCell().textContent = sd.partitions(i)!.appTime();
        }
        this.tblDataPartitions.value!.textContent = "";
        for (let i = 0; i < sd.partitionsLength(); i++) {
            if (sd.partitions(i)!.type() != 1) continue;
            var row = this.tblDataPartitions.value!.insertRow();
            row.insertCell().textContent = <string>sd.partitions(i)!.label();
            row.insertCell().textContent = subtypeToString(sd.partitions(i)!.type(), sd.partitions(i)!.subtype());
            row.insertCell().textContent = (sd.partitions(i)!.size() / 1024) + "k";
        }
    }

    private insertParameter(name: string, value: string | number) {
        var row = this.tblParameters.value!.insertRow();
        row.insertCell().textContent = name;
        row.insertCell().textContent = value.toString();
    }

    private mac6_2_string(mac: Mac6 | null): string {
        if (!mac) return "No Mac";
        return `${mac.v(0)}:${mac.v(1)}:${mac.v(2)}:${mac.v(3)}:${mac.v(4)}:${mac.v(5)}`;
    }

    private startUpload() {
        let otafiles = this.inpOtafile.value!.files!;
        if (otafiles.length == 0) {
            this.appManagement.ShowDialog(new OkDialog(Severity.WARN, "No file selected!"));
            return;
        }

        this.inpOtafile.value!.disabled = true;
        this.btnUpload.value!.disabled = true;

        var file = otafiles[0];
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = (e: Event) => {
            console.info(`onreadystatechange: e:${e}; xhr:${xhr}; xhr.text:${xhr.responseText}; xhr.readyState:${xhr.readyState}`);
            if (xhr.readyState == 4) {
                if (xhr.status == 200) {
                    this.appManagement.ShowDialog(new OkDialog(Severity.SUCCESS, xhr.responseText));
                } else if (xhr.status == 0) {
                    console.error("Server closed the connection abruptly!");
                } else {
                    console.error(" Error!\n" + xhr.responseText);
                }
            }
        };


        xhr.upload.onprogress = (e: ProgressEvent) => {

            let percent = (e.loaded / e.total * 100).toFixed(0);
            this.lblProgress.value!.textContent = "Progress: " + percent + "%";
            this.prgbProgress.value!.value = percent;
        };
        console.log(`Trying to POST ${UPLOAD_URL}`);
        xhr.open("POST", UPLOAD_URL, true);
        xhr.send(file);

    }

    OnCreate(): void {
        this.appManagement.RegisterWebsocketMessageNamespace(this, Namespace.Value);

    }
    OnFirstStart(): void {
        this.sendRequestSystemdata();
    }
    OnRestart(): void {
        this.sendRequestSystemdata();
    }
    OnPause(): void {
    }

    public Template = () => html`
            <h1>Application Partitions</h1>
        <table>
            <thead>
                <tr>
                    <th>Label</th>
                    <th>Subtype</th>
                    <th>Size [byte]</th>
                    <th>OTA State</th>
                    <th>Is Running</th>
                    <th>Project Name</th>
                    <th>Project Version</th>
                    <th>Compile Date</th>
                    <th>Compile Time</th>
                </tr>
            </thead>
            <tbody ${ref(this.tblAppPartitions)}></tbody>
        </table>
        <h1>Data Partitions</h1>
        <table>
            <thead>
                <tr>
                    <th>Label</th>
                    <th>Subtype</th>
                    <th>Size [byte]</th>
                </tr>
            </thead>
            <tbody ${ref(this.tblDataPartitions)}></tbody>
        </table>
        <h1>Parameters</h1>
        <table>
            <thead>
                <tr>
                    <th style="width: 200px;">Parameter</th>
                    <th>Value</th>
                </tr>
            </thead>
            <tbody ${ref(this.tblParameters)}></tbody>
        </table>

        
        <h1 class="dangerous">Dangerous Zone</h1>
        <h2>Over-the-air Firmware Update</h2>
        <table>
            <tbody>
                <tr>
                    <td>1.) Choose Firmware File</td>
                    <td><input type="file" ${ref(this.inpOtafile)} name="otafile" accept=".bin"></td>
                </tr>
                <tr>
                    <td>2.) Click!</td>
                    <td><input @click=${()=>this.startUpload()} ${ref(this.btnUpload)} type="button" value="Start Over The Air Firmware Update" /></td>
                </tr>
                <tr>
                    <td>3.) See Progress</td>
                    <td><progress ${ref(this.prgbProgress)} value="0" max="100">0</progress><span ${ref(this.lblProgress)}></span></td>
                </tr>
                <tr>
                    <td>4.) Wait</td>
                    <td>After Upload, the CPU is reset automatically. You have to reconnect after an appropriate waiting time</td>
                </tr>

            </tbody>
        </table>
        <h2>Reset CPU</h2>
        <table>
            <tbody>
                <tr>
                    <td>Click to Reset/Restart CPU</td>
                    <td><input @click=${()=>{this.appManagement.ShowDialog(new OkCancelDialog(Severity.WARN, "Are you really sure to restart the system", (s) => { if (s) this.sendRequestRestart(); }));}} type="button" value="Restart" /></td>
                </tr>
            </tbody>
        </table>
    
    `

}
