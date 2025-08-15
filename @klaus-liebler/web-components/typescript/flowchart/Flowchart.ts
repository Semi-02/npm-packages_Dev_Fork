import { ConnectorType, FlowchartInputConnector, FlowchartOutputConnector } from "./FlowchartConnector";
import { FlowchartCompiler, HashAndBufAndMaps } from "./FlowchartCompiler";
import { FlowchartLink } from "./FlowchartLink";
import { FlowchartOperator, TypeInfo } from "./FlowchartOperator";
import * as operatorimpl from "./FlowchartOperatorImpl";
import { ColorNumColor2ColorDomString, EventCoordinatesInSVG, Html, Svg } from "../utils/common";
import { IAppManagement } from "../utils/interfaces";
import * as flatbuffers from 'flatbuffers';
import { SimulationManager } from "./SimulationManager";
import { FlowchartData, OperatorData, LinkData } from "./FlowchartData";
import { FilelistDialog, FilenameDialog, OkDialog } from "../dialog_controller";
import { Namespace, RequestWrapper, RequestDebugData, RequestFbdRun, ResponseDebugData, ResponseFbdRun, Responses, ResponseWrapper, Requests } from "@generated/flatbuffers_ts/functionblock";
import { Menu, MenuItem, MenuManager } from "./MenuManager";
import { KeyValueTuple, Severity } from "@klaus-liebler/commons";
import "../../style/flowchart.css"
import { MacroOperator } from "./MacroOperatorImpl";

//see devicemanager.hh
const FBDSTORE_BASE_DIRECTORY = "/spiffs/fbdstore/";
const DEFAULTFBD_FBD_FILEPATH = "/spiffs/defaultfbd.fbd";
const TEMPFBD_FBD_FILEPATH = "/spiffs/tempfbd.fbd";

const FBDMACROSTORE_BASE_DIRECTORY = "/spiffs/macrostore/";

export class FlowchartOptions {
    canUserEditLinks: boolean = true;
    canUserMoveOperators: boolean = true;
    distanceFromArrow: number = 3;
    defaultOperatorClass: string = 'flowchart-default-operator';
    defaultLinkColor: string = '#3366ff';
    defaultSelectedLinkColor: string = 'black';
    linkWidth: number = 10;
    grid: number = 10;
    multipleLinksOnOutput: boolean = true;
    multipleLinksOnInput: boolean = false;
    linkVerticalDecal: number = 0;
    httpServerBasePath = "/files"
    constructor(httpServerPrexix: string) {
        this.httpServerBasePath = httpServerPrexix + this.httpServerBasePath;
    }
}

export class FlowchartCallback {
    onOperatorSelect?: (operatorId: string) => boolean;
    onOperatorUnselect?: () => boolean;
    onOperatorMouseOver?: (operatorId: string) => boolean;
    onOperatorMouseOut?: (operatorId: string) => boolean;
    onLinkSelect?: (link: FlowchartLink) => boolean;
    onLinkUnselect?: (link: FlowchartLink) => boolean;
    onOperatorCreate?: (operatorId: string, operatorData: any, fullElement: boolean) => boolean;
    onLinkCreate?: (linkId: string, linkData: any) => boolean;
    onOperatorDelete?: (operatorId: string) => boolean;
    onLinkDelete?: (linkId: string, forced: boolean) => boolean;
    onOperatorMoved?: (operatorId: string, position: number) => void;
    onAfterChange?: (changeType: any) => void;
}

enum FlowchartMode {
    EDIT,
    SIMULATE,
    DEBUG,
}

export class Flowchart {
    UserMayMoveOperators() {
        return this.mode == FlowchartMode.EDIT && this.options.canUserMoveOperators;
    }

    TriggerDebug() {
        if (this.mode != FlowchartMode.DEBUG) return;
        var b = new flatbuffers.Builder(1024);
        b.finish(RequestWrapper.createRequestWrapper(b, Requests.RequestDebugData, RequestDebugData.createRequestDebugData(b)));
        this.appManagement.SendFinishedBuilder(Namespace.Value, b);

    }
    OnMessage(namespace: number, bb: flatbuffers.ByteBuffer) {
        if (namespace != Namespace.Value) return;

        let messageWrapper = ResponseWrapper.getRootAsResponseWrapper(bb)
        switch (messageWrapper.responseType()) {
            case Responses.ResponseDebugData:
                this.onResponseDebugData(<ResponseDebugData>messageWrapper.response(new ResponseDebugData()));
                break
            case Responses.ResponseFbdRun:
                this.onResponseFbdRun(<ResponseFbdRun>messageWrapper.response(new ResponseFbdRun()))
                break
        }
    }

    private mode = FlowchartMode.EDIT;
    private operatorRegistry: operatorimpl.OperatorRegistry;
    private simulationManager?: SimulationManager | null;



    private operators = new Map<number, FlowchartOperator>();
    private links = new Map<number, FlowchartLink>();


    private macros = new Map<string, [Map<number, FlowchartOperator>, Map<number, FlowchartLink>]>();
    private macrosNames = new Set<string>();


    public static readonly DATATYPE2COLOR = new Map([[ConnectorType.BOOLEAN, "RED"], [ConnectorType.COLOR, "GREEN"], [ConnectorType.FLOAT, "BLUE"], [ConnectorType.INTEGER, "YELLOW"], [ConnectorType.COLOR, "PURPLE"]]);
    //Muss beim Löschen+Erzeugen von Operatoren+Links und bei Speichern von Properties zurückgesetzt werden
    private currentDebugInfo: HashAndBufAndMaps | null = null;
    private lastOutputConnectorClicked: FlowchartOutputConnector | null = null;
    private selectedOperators: Set<FlowchartOperator> = new Set();

    private selectedLink: FlowchartLink | null = null;
    get SelectedLink() { return this.selectedLink };
    get Options() { return this.options; }

    private zoomLevel: number = 1.0;
    private scalingLayer!: SVGGElement;
    private zoomLabel!: HTMLDivElement;
    private selectionBoxDiv: HTMLDivElement | null = null;
    private selectionStart: { x: number, y: number } | null = null;


    private positionRatio: number = 1;
    get PositionRatio() { return this.positionRatio; }

    private flowchartContainerSvgSvg!: SVGSVGElement;
    get Element() { return this.flowchartContainerSvgSvg; }
    private linksLayer!: SVGGElement;
    get LinkLayer() { return this.linksLayer; }
    private operatorsLayer!: SVGGElement;
    get OperatorsLayer() { return this.operatorsLayer; }
    private operatorLibDiv!: HTMLDivElement;
    get ToolsLayer() { return this.operatorLibDiv; }
    private tempLayer!: SVGGElement;
    private temporaryLink!: SVGLineElement;
    private temporaryLinkSnapped = false;
    private propertyGridHtmlDiv!: HTMLDivElement;

    private markerArrow: SVGPathElement | null = null;
    private markerCircle: SVGCircleElement | null = null;

    private _svgCoordsFromEvent(e: MouseEvent): { x: number, y: number } {
        return { x: e.clientX, y: e.clientY };
    }

    private onResponseDebugData(d: ResponseDebugData) {

        console.info(`Received debug data`);

        if (this.mode != FlowchartMode.DEBUG) {
            console.warn(`this.mode!=FlowchartMode.DEBUG, is ${FlowchartMode[this.mode]}`)
            return;
        }
        if (this.currentDebugInfo == null) {
            console.warn(`this.currentDebugInfo == null`)
            return;
        }

        if (d.debugInfoHash() != this.currentDebugInfo.hash) {
            console.error(`${d.debugInfoHash()} != ${this.currentDebugInfo.hash}`);
            this.currentDebugInfo = null;
            return;
        }
        for (let adressOffset = 0; adressOffset < d.boolsLength(); adressOffset++) {
            var value = d.bools(adressOffset);
            if (adressOffset < 2) continue;

            let connectorType = ConnectorType.BOOLEAN
            let map = this.currentDebugInfo.typeIndex2adressOffset2ListOfLinks.get(connectorType)!;
            let linksToChange = map.get(adressOffset);
            if (linksToChange === undefined) {
                console.error(`linksToColorize===undefined for connectorType ${connectorType} addressOffset ${adressOffset} and value ${value}`);
                continue;
            }
            linksToChange.forEach((e) => {
                e.SetColor(value ? "red" : "grey");
                e.SetCaption("" + value);
            });
        }

        for (let adressOffset = 0; adressOffset < d.integersLength(); adressOffset++) {
            let value = d.integers(adressOffset);
            if (adressOffset < 2) continue;
            let connectorType = ConnectorType.INTEGER
            let map = this.currentDebugInfo.typeIndex2adressOffset2ListOfLinks.get(connectorType)!;
            let linksToChange = map.get(adressOffset);
            if (linksToChange === undefined) {
                console.error(`linksToColorize===undefined for connectorType ${connectorType} addressOffset ${adressOffset} and value ${value}`);
                continue;
            }
            linksToChange.forEach((e) => {
                e.SetCaption(`${value}`);
            });
        }

        for (let adressOffset = 0; adressOffset < d.floatsLength(); adressOffset++) {
            let value = d.floats(adressOffset)
            if (adressOffset < 2) continue;
            let connectorType = ConnectorType.FLOAT
            let map = this.currentDebugInfo.typeIndex2adressOffset2ListOfLinks.get(connectorType)!;
            let linksToChange = map.get(adressOffset);
            if (linksToChange === undefined) {
                console.error(`linksToColorize===undefined for connectorType ${connectorType} addressOffset ${adressOffset} and value ${value}`);
                continue;
            }
            linksToChange.forEach((e) => {
                e.SetCaption(value!.toFixed(2));
            });
        }

        for (let adressOffset = 0; adressOffset < d.colorsLength(); adressOffset++) {
            let value = d.colors(adressOffset)
            if (adressOffset < 2) continue;
            let connectorType = ConnectorType.COLOR
            let map = this.currentDebugInfo.typeIndex2adressOffset2ListOfLinks.get(connectorType)!;
            let linksToChange = map.get(adressOffset);
            if (linksToChange === undefined) {
                console.error(`linksToColorize===undefined for connectorType ${connectorType} addressOffset ${adressOffset} and value ${value}`);
                continue;
            }
            linksToChange.forEach((e) => {
                e.SetCaption("" + value);
                e.SetColor(ColorNumColor2ColorDomString(value!));
            });
        }
    }

    public _notifyGlobalMousemoveWithLink(e: MouseEvent) {
        if (this.mode != FlowchartMode.EDIT) return;
        if (this.lastOutputConnectorClicked != null && !this.temporaryLinkSnapped) {
            let end = EventCoordinatesInSVG(e, this.flowchartContainerSvgSvg, this.positionRatio);
            this.temporaryLink.setAttribute('x2', "" + end.x);
            this.temporaryLink.setAttribute('y2', "" + end.y);
        }
    }

    public _notifyGlobalMouseupWithLink(e: MouseEvent) {
        if (this.mode != FlowchartMode.EDIT) return;
        this.unsetTemporaryLink();
    }

    public _notifyOutputConnectorMousedown(c: FlowchartOutputConnector, e: MouseEvent) {
        if (this.mode != FlowchartMode.EDIT) return;
        this.temporaryLinkSnapped = false;
        let start = c.GetLinkpoint();
        let end = EventCoordinatesInSVG(e, this.flowchartContainerSvgSvg, this.positionRatio);
        this.temporaryLink.setAttribute('x1', "" + start.x);
        this.temporaryLink.setAttribute('y1', "" + start.y);
        this.temporaryLink.setAttribute('x2', "" + end.x);
        this.temporaryLink.setAttribute('y2', "" + end.y);
        this.setTemporaryLink(c);
        document.onmouseup = (e) => {
            document.onmouseup = null;
            document.onmousemove = null;
            this._notifyGlobalMouseupWithLink(e);
        };
        document.onmousemove = (e) => {
            this._notifyGlobalMousemoveWithLink(e);
        };
    }

    public _notifyInputConnectorMouseup(c: FlowchartInputConnector, e: MouseEvent) {
        if (this.mode != FlowchartMode.EDIT) return;
        if (this.lastOutputConnectorClicked == null) return;
        if (!this.options.multipleLinksOnInput && c.LinksLength > 0) return;
        if (this.lastOutputConnectorClicked.Type === c.Type ||
            this.lastOutputConnectorClicked.Type === null ||
            c.Type === null) {
            this.createLink(null, this.lastOutputConnectorClicked, c);
        }
        this.unsetTemporaryLink();

    }

    public _notifyOperatorClicked(o: FlowchartOperator, e: MouseEvent) {
        if (this.mode != FlowchartMode.EDIT) return;
        this.SelectOperator(o, e.shiftKey);

    }

    public _notifyLinkClicked(link: FlowchartLink, e: MouseEvent) {
        if (this.mode != FlowchartMode.EDIT) return;
        this.selectLink(link);
    }

    public _notifyInputConnectorMouseenter(c: FlowchartInputConnector, e: MouseEvent) {
        if (this.mode != FlowchartMode.EDIT) return;
        if (this.lastOutputConnectorClicked == null || this.lastOutputConnectorClicked.Type != c.Type) return;
        if (!this.options.multipleLinksOnInput && c.LinksLength > 0) return;

        this.temporaryLinkSnapped = true;
        let end = c.GetLinkpoint();
        this.temporaryLink.setAttribute("marker-end", "url(#marker-circle)");
        this.temporaryLink.setAttribute('x2', "" + end.x);
        this.temporaryLink.setAttribute('y2', "" + end.y);
    }

    public _notifyInputConnectorMouseleave(c: FlowchartInputConnector, e: MouseEvent) {
        if (this.mode != FlowchartMode.EDIT) return;
        this.temporaryLinkSnapped = false;
        this.temporaryLink.setAttribute("marker-end", "url(#marker-arrow)");
    }

    public unselectLink() {
        if (this.mode != FlowchartMode.EDIT) return;
        if (this.selectedLink != null) {
            if (this.flowchartCallbacks.onLinkUnselect && !this.flowchartCallbacks.onLinkUnselect(this.selectedLink)) {
                return;
            }
            this.selectedLink.UnsetColor();
            this.selectedLink = null;
        }
    }

    public selectLink(link: FlowchartLink) {
        if (this.mode != FlowchartMode.EDIT) return;
        this.unselectLink();
        if (this.flowchartCallbacks.onLinkSelect && !this.flowchartCallbacks.onLinkSelect(link)) {
            return;
        }
        this.unselectOperator();
        this.selectedLink = link;
        link.SetColor(this.options.defaultSelectedLinkColor);
    }


    private deleteSelectedThing(): void {
        if (this.mode != FlowchartMode.EDIT) return;
        if (this.selectedOperators.size > 0) {
            for (const op of [...this.selectedOperators]) {
                this.DeleteOperator(op.GlobalOperatorIndex);
            }
        } else if (this.selectedLink) {
            this.DeleteLink(this.selectedLink.GlobalLinkIndex);
        }
    }

    private createFlowchartDataJSONString(): string {
        let operators: OperatorData[] = [];
        let links: LinkData[] = [];
        for (const op of this.operators.values()) {
            operators.push({ globalTypeIndex: op.TypeInfo.GlobalTypeIndex, caption: op.Caption, index: op.GlobalOperatorIndex, posX: op.Xpos, posY: op.Ypos, configurationData: op.Config_Copy });
        }
        for (const link of this.links.values()) {
            links.push({
                fromOperatorIndex: link.From.Parent.GlobalOperatorIndex,
                fromOutput: link.From.LocalConnectorIndex,
                toOperatorIndex: link.To.Parent.GlobalOperatorIndex,
                toInput: link.To.LocalConnectorIndex,
            });
        }
        return JSON.stringify({ operators: operators, links: links });
    }

    private createFbdFile() {
        //Die Datei besteht aus
        //4 Bytes mit der Länge des Binärteils
        //Dem Binärteil
        //Dem JSON-Teil, der die grafische Darstellung enthält
        var compilerInstance = new FlowchartCompiler(this.operators);
        var guidAndBufAndMap = compilerInstance.Compile();
        this.currentDebugInfo = guidAndBufAndMap;
        var viewByteLength = new DataView(new ArrayBuffer(4));
        viewByteLength.setUint32(0, guidAndBufAndMap.buf.byteLength, true); //ESP32 is little-endian: true für little-endian, false für big-endian
        var stringBuffer = new TextEncoder().encode(this.createFlowchartDataJSONString()).buffer;
        var combinedBuffer = new Uint8Array(viewByteLength.byteLength + guidAndBufAndMap.buf.byteLength + stringBuffer.byteLength);
        combinedBuffer.set(new Uint8Array(viewByteLength.buffer), 0);
        combinedBuffer.set(new Uint8Array(guidAndBufAndMap.buf), 4);
        combinedBuffer.set(new Uint8Array(stringBuffer), 4 + guidAndBufAndMap.buf.byteLength);
        return combinedBuffer
    }

    private parseFbdFile(arrayBuffer: ArrayBuffer): FlowchartData {
        const dataView = new DataView(arrayBuffer);
        // Lesen Sie die Länge des Binärteils (erste 4 Bytes)
        const binaryLength = dataView.getUint32(0, true);
        // Extrahieren Sie den Binär- und den JSON-Teil
        const _binaryPart = new Uint8Array(arrayBuffer, 4, binaryLength);
        const jsonPart = new TextDecoder().decode(arrayBuffer.slice(4 + binaryLength));
        return JSON.parse(jsonPart);
    }

    private saveFbdToLocalFile() {
        let blob = new Blob([this.createFbdFile()], { type: "octet/stream" });
        let url = window.URL.createObjectURL(blob);
        let filename = "functionBlockDiagram.fbd";
        var element = document.createElement('a');
        element.style.display = 'none';
        element.href = url;
        element.download = filename;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    }

    private openFbdFromLocalFile(files: FileList | null) {
        if (files == null || files.length != 1) return;
        const reader = new FileReader();
        reader.onloadend = (e) => {
            let buf: ArrayBuffer = <ArrayBuffer>e.target!.result;
            this.setData(this.parseFbdFile(buf));
        }
        reader.readAsArrayBuffer(files[0]);
    }

    private onResponseFbdRun(m: ResponseFbdRun) {
        this.appManagement.ShowSnackbar(Severity.SUCCESS, `File now runs on Lab@Home`);
    }

    private _basenameNoExt(fullPath: string): string {
        const last = fullPath.split('/').pop() || "";
        return last.replace(/\.[^.]+$/, "");
    }


    private async postFbdFile(path: string, onSuccessAction?: (path: string) => void, onFailAction?: (path: string) => void) {

        try {
            const response = await fetch(this.options.httpServerBasePath + path, {
                method: 'POST',
                body: this.createFbdFile(),
                headers: {
                    'Content-Type': 'application/octet-stream'
                }
            });

            if (!response.ok) {
                this.appManagement.ShowDialog(new OkDialog(Severity.ERROR, `HTTP Error ${response.status}`));
                if (onFailAction) onFailAction(path);
                return;
            }

            this.appManagement.ShowSnackbar(Severity.SUCCESS, `Successfully saved`);
            if (onSuccessAction) onSuccessAction(path);

        } catch (error) {
            console.error('There was a problem with the post operation:', error);
            this.appManagement.ShowDialog(new OkDialog(Severity.ERROR, `Generic Error`));
            if (onFailAction) onFailAction(path);
        }
    }

    private createMacroFile(): string {
        const allOperators = Array.from(this.operators.values());

        const operators: OperatorData[] = allOperators.map(o => ({
            globalTypeIndex: o.TypeInfo.GlobalTypeIndex,
            caption: o.Caption,
            index: o.GlobalOperatorIndex,
            posX: o.Xpos,
            posY: o.Ypos,
            configurationData: o.Config_Copy,
        }));

        const links: LinkData[] = Array.from(this.links.values()).map(l => ({
            fromOperatorIndex: l.From.Parent.GlobalOperatorIndex,
            fromOutput: l.From.LocalConnectorIndex,
            toOperatorIndex: l.To.Parent.GlobalOperatorIndex,
            toInput: l.To.LocalConnectorIndex,
        }));

        const macroData: FlowchartData = { operators, links };
        var macroDataJson = JSON.stringify(macroData); // Pretty print for better readability 

        console.log(`Macro Data JSON: \n ${macroDataJson}`);
        return macroDataJson;
    }

    private async enterFilenameAndPostMacroFile(path: string, onSuccessAction?: (path: string) => void, onFailAction?: (path: string) => void) {
        this.appManagement.ShowDialog(new FilenameDialog("Enter macro name (without extension)", (ok: boolean, filename: string) => {
            if (!ok) return;
            this.postMacroFileInternal(path + filename + ".json", onSuccessAction, onFailAction);
        }));
    }

    private async postMacroFileInternal(fullPath: string, onSuccessAction?: (path: string) => void, onFailAction?: (path: string) => void) {
        try {
            const response = await fetch(this.options.httpServerBasePath + fullPath, {
                method: 'POST',
                body: this.createMacroFile(),
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                this.appManagement.ShowDialog(new OkDialog(Severity.ERROR, `HTTP Error ${response.status}`));
                if (onFailAction) onFailAction(fullPath);
                return;
            }

            this.appManagement.ShowSnackbar(Severity.SUCCESS, `Successfully saved`);
            if (onSuccessAction) onSuccessAction(fullPath);

        } catch (error) {
            console.error('There was a problem with the json post operation:', error);
            this.appManagement.ShowDialog(new OkDialog(Severity.ERROR, `Generic Error`));
            if (onFailAction) onFailAction(fullPath);
        }
    }


    private async getMacroFile(path: string, onSuccessAction?: (path: string) => void, onFailAction?: (path: string) => void) {
        try {
            const response = await fetch(this.options.httpServerBasePath + path);
            if (!response.ok) {
                throw new Error(`Failed to load Macro file from path:${response.statusText}`);
            }

            const data = await response.json();
            if (!data) {
                console.error(`Error loading Macro file from ${path}: Invalid JSON`);
                if (onFailAction) onFailAction(path);
                return;
            }

            console.log(`Macro file loaded from ${path}`);
            console.log(`Macro data:`, data);
            const filename = this._basenameNoExt(path);
            this.setMacroData(filename, data);

            if (onSuccessAction) onSuccessAction(path);
        } catch (error) {
            this.appManagement.ShowDialog(new OkDialog(Severity.ERROR, `Failed to load Macro file from ${path}`));
            console.error(`Error loading Macro file from ${path}:`, error);
            if (onFailAction) onFailAction(path);
        }
    }

    private setMacroData(macroName: string, macroData: FlowchartData) {
        const operatorsMap = new Map<number, FlowchartOperator>();
        const linksMap = new Map<number, FlowchartLink>();

        const indexInData2operator = new Map<number, FlowchartOperator>();

        for (const opData of macroData.operators) {
            if (!this.operatorRegistry.IsIndexKnown(opData.globalTypeIndex)) {
                console.warn(`Unknown operator type ${opData.globalTypeIndex} in macro ${macroName}`);
                continue;
            }

            let op = this.operatorRegistry.CreateByIndex(
                opData.globalTypeIndex,
                this,
                opData.caption,
                opData.configurationData
            )!;

            op.MoveTo(opData.posX, opData.posY);

            indexInData2operator.set(opData.index, op);
            operatorsMap.set(op.GlobalOperatorIndex, op);
        }

        for (const linkData of macroData.links) {
            const fromOp = indexInData2operator.get(linkData.fromOperatorIndex);
            const toOp = indexInData2operator.get(linkData.toOperatorIndex);

            if (!fromOp || !toOp) {
                console.warn(`Cannot create link: missing operators in macro ${macroName}`);
                continue;
            }

            const fromConn = fromOp.GetOutputConnectorByIndex(linkData.fromOutput);
            const toConn = toOp.GetInputConnectorByIndex(linkData.toInput);

            if (!fromConn || !toConn) {
                console.warn(`Cannot create link: missing connectors in macro ${macroName}`);
                continue;
            }

            const link = new FlowchartLink(this, "", this.Options.defaultLinkColor, fromConn, toConn);

            linksMap.set(link.GlobalLinkIndex, link);
        }

        this.macros.set(macroName, [operatorsMap, linksMap]);

        console.log(`Stored macro ${macroName} with ${operatorsMap.size} operators and ${linksMap.size} links`);

        
    }
private updateCustomBlocksMenu() {
    // Get UI elements
    const top = this.operatorLibDiv.querySelector("ul");
    let groupLi = top?.querySelector(".custom-blocks-group") as HTMLLIElement;
    
    // Create the group container if it doesn't exist yet
    if (!groupLi) {
        groupLi = document.createElement("li");
        groupLi.classList.add("group-toggle", "custom-blocks-group");
        
        const toggleIcon = document.createElement("span");
        toggleIcon.classList.add("toggle-arrow");
        toggleIcon.innerText = "▶";
        
        const groupLabel = document.createElement("span");
        groupLabel.innerText = "CustomBlocks";
        
        const ul = document.createElement("ul");
        ul.classList.add("nested");
        ul.style.display = "none";
        
        groupLi.appendChild(toggleIcon);
        groupLi.appendChild(groupLabel);
        groupLi.appendChild(ul);
        top?.appendChild(groupLi);

        groupLi.onclick = () => {
            const expanded = ul.style.display === "block";
            ul.style.display = expanded ? "none" : "block";
            toggleIcon.innerText = expanded ? "▶" : "▼";
        };
    }
    
    // Clear and populate the list
    const ul = groupLi.querySelector("ul")!;
    ul.innerHTML = "";
    
    // Use macrosNames instead of localStorage
    for (const macroName of this.macrosNames) {
        const li = document.createElement("li");
        li.classList.add("operator-lib-item");
        li.innerText = macroName;
        
        li.onmousedown = async (e) => {
            // Check if the macro is already loaded
            if (!this.macros.has(macroName)) {
                // Load the macro file first
                await this.getMacroFile(FBDMACROSTORE_BASE_DIRECTORY + macroName + ".json", 
                    // Success callback
                    () => {
                        // Now create the superblock
                        this.buildSuperblockFromCurrentAndPlace(macroName);
                    },
                    // Failure callback
                    (path) => {
                        this.appManagement.ShowDialog(new OkDialog(Severity.ERROR, 
                            `Failed to load macro "${macroName}" from ${path}`));
                    }
                );
            } else {
                // Macro is already loaded, just create the superblock
                this.buildSuperblockFromCurrentAndPlace(macroName);
            }
        };
        
        ul.appendChild(li);
    }
}

    private async getMacroFileList() {
        try {
            const response = await fetch(this.options.httpServerBasePath + FBDMACROSTORE_BASE_DIRECTORY);

            if (!response.ok) {
                throw new Error(`Network response was not ok, status: ${response.status}`);
            }

            const data = await response.json();

            if (!data.files || !data.dirs) {
                throw new Error('Response format is incorrect');
            }

            data.files.forEach((filename: string) => {
                console.log(`Found macro file: ${filename}`);
                this.macrosNames.add(this._basenameNoExt(filename));
            });
        } catch (error) {
            console.error('There was a problem with the fetch operation:', error);
            // Optionally, provide user feedback about the error
        }
    }


    private async getFbdFile(path: string) {
        try {
            const response = await fetch(this.options.httpServerBasePath + path);
            if (!response.ok) {
                throw new Error(`Failed to load file from path:path:${response.statusText}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            if (arrayBuffer.byteLength === 0) {
                console.error(`Error loading file from ${path}: File has size 0`);
                return;
            }
            this.setData(this.parseFbdFile(arrayBuffer))
        } catch (error) {
            this.appManagement.ShowDialog(new OkDialog(Severity.ERROR, `Failed to load file from ${path}`));
            console.error(`Error loading file from ${path}:`, error);
        }
    }

    private async deleteFdbFile(path) {
        try {
            const response = await fetch(this.options.httpServerBasePath + path, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error(`Failed to delete file, status: ${response.status}`);
            }

            this.appManagement.ShowSnackbar(Severity.SUCCESS, `File ${path} deleted successfully`);
        } catch (error) {
            console.error('There was a problem with the delete operation:', error);
            this.appManagement.ShowSnackbar(Severity.ERROR, `Failed to delete file ${path}: ${error.message}`);
        }
    }

    private async getFbdFileList(path_with_slash_at_the_end: string) {
        try {
            const response = await fetch(this.options.httpServerBasePath + path_with_slash_at_the_end);

            if (!response.ok) {
                throw new Error(`Network response was not ok, status: ${response.status}`);
            }

            const data = await response.json();

            if (!data.files || !data.dirs) {
                throw new Error('Response format is incorrect');
            }

            this.appManagement.ShowDialog(new FilelistDialog((<string[]>data.files).filter(v => v.endsWith(".fbd")),
                (ok, filename) => {
                    if (!ok) return;
                    this.getFbdFile(path_with_slash_at_the_end + filename);
                },
                (ok, filename) => {
                    if (!ok) return;
                    this.deleteFdbFile(path_with_slash_at_the_end + filename);
                }
            ));
        } catch (error) {
            console.error('There was a problem with the fetch operation:', error);
            // Optionally, provide user feedback about the error
        }
    }

    private enterFilenameAndPostFbd() {
        this.appManagement.ShowDialog(new FilenameDialog("Enter filename (without Extension", (ok: boolean, filename: string) => {
            if (!ok) return
            this.postFbdFile(FBDSTORE_BASE_DIRECTORY + filename + ".fbd")
        }));

    }

    private buildMenu(subcontainer: HTMLDivElement) {
        let fileInput = <HTMLInputElement>Html(subcontainer, "input", ["type", "file", "id", "fileInput", "accept", ".json"]);
        fileInput.style.display = "none";
        fileInput.onchange = (e) => {
            this.openFbdFromLocalFile(fileInput.files);
        }
        var mm: MenuManager = new MenuManager(
            [
                new Menu("File", [
                    new MenuItem("📂 Open (Local)", () => fileInput.click()),
                    new MenuItem("📂 Open (labathome)", () => this.getFbdFileList(FBDSTORE_BASE_DIRECTORY)),
                    new MenuItem("📂 Open Default (labathome)", () => this.getFbdFile(DEFAULTFBD_FBD_FILEPATH)),
                    new MenuItem("💾 Save (Local)", () => this.saveFbdToLocalFile()),
                    new MenuItem("💾 Save (labathome)", () => this.enterFilenameAndPostFbd())
                ]),
                new Menu("Debug", [
                    new MenuItem("☭ Start Debug", () => this.postFbdFile(TEMPFBD_FBD_FILEPATH,
                        (p: string) => {

                            var b = new flatbuffers.Builder(1024);
                            b.finish(RequestWrapper.createRequestWrapper(b, Requests.RequestFbdRun, RequestFbdRun.createRequestFbdRun(b)));
                            this.appManagement.SendFinishedBuilder(Namespace.Value, b, 3000);
                            this.mode = FlowchartMode.DEBUG;
                            this.flowchartContainerSvgSvg.classList.remove("edit", "simulate");
                            this.flowchartContainerSvgSvg.classList.add("debug");
                        },
                        (p: string) => {
                            console.error(`As file "${p}" could no be saved on labathome, the RequestFbdRun will not be sent to labathome`)
                        }
                    )),
                    new MenuItem("× Stop Debug", () => {
                        this.mode = FlowchartMode.EDIT;
                        this.flowchartContainerSvgSvg.classList.remove("simulate", "debug");
                        this.flowchartContainerSvgSvg.classList.add("edit");
                        this.resetColorsAndCaptions();
                    }),
                    new MenuItem("👣 Set as Startup-App", () => this.postFbdFile(DEFAULTFBD_FBD_FILEPATH)),
                ]),
                new Menu("Simulation", [
                    new MenuItem("➤ Start Simulation", () => {
                        let compilerInstance = new FlowchartCompiler(this.operators);
                        this.simulationManager = new SimulationManager(compilerInstance.CompileForSimulation());
                        this.simulationManager.Start(false);
                        this.mode = FlowchartMode.SIMULATE;
                        this.flowchartContainerSvgSvg.classList.remove("edit", "debug");
                        this.flowchartContainerSvgSvg.classList.add("simulate");
                    }),
                    new MenuItem("× Stop Simulation", () => {
                        this.simulationManager?.Stop();
                        this.mode = FlowchartMode.EDIT;
                        this.resetColorsAndCaptions();
                        this.flowchartContainerSvgSvg.classList.remove("simulate", "debug");
                        this.flowchartContainerSvgSvg.classList.add("edit");
                    })
                ]),
                new Menu("Macro", [
                    new MenuItem("Create Macro", () => this.enterFilenameAndPostMacroFile(FBDMACROSTORE_BASE_DIRECTORY,
                        (fullPath: string) => {
                            console.info(`Macro saved to ${fullPath}`);
                            //const name = this._basenameNoExt(fullPath);
                            //this.buildSuperblockFromCurrentAndPlace(name);
                        })),
                    new MenuItem("Create Macro from current selection", () => { }),
                    new MenuItem("Edit Macro", () => { }),
                    new MenuItem("Delete Macro", () => { }),
                    new MenuItem("Load Macro from PC", () => { })
                ])
            ]
        );
        mm.Render(subcontainer)
    }
    resetColorsAndCaptions() {
        this.operators.forEach(o => o.ResetColorsAndCaptions());
        this.links.forEach(l => l.SetCaption(""))
        this.links.forEach(l => l.UnsetColor())
    }
    public ZoomIn() {
        this.zoomLevel *= 1.1; // z.B. +10%
        this.applyZoom();
    }
    public ZoomOut() {
        this.zoomLevel /= 1.1; // z.B. -10%
        this.applyZoom();
    }
    public GetAllOperators(): FlowchartOperator[] {
        return Array.from(this.operators.values());
    }
    private applyZoom() {
        this.scalingLayer.setAttribute("transform", `scale(${this.zoomLevel})`);
        this.positionRatio = this.zoomLevel;

        // 💡 Größe des SVGs basierend auf Zoom-Level setzen:
        const baseWidth = 3000;
        const baseHeight = 2000;
        this.flowchartContainerSvgSvg.setAttribute("width", `${baseWidth * this.zoomLevel}`);
        this.flowchartContainerSvgSvg.setAttribute("height", `${baseHeight * this.zoomLevel}`);

        if (this.zoomLabel) {
            this.zoomLabel.textContent = `${Math.round(this.zoomLevel * 100)}%`;
        }
    }



    //NEU!!!!!!!!!!!! von Kawi
    private buildSuperblockFromCurrentAndPlace(name: string) {
        // 🧠 Interface-Erkennung (passe die Namen an, falls deine Blöcke anders heißen)
        const isInputIface = (op: FlowchartOperator) =>
            op.TypeInfo.OperatorName === "InputBlock" || /(^|\W)Input(\W|$)/i.test(op.TypeInfo.OperatorName);

        const isOutputIface = (op: FlowchartOperator) =>
            op.TypeInfo.OperatorName === "OutputBlock" || /(^|\W)Output(\W|$)/i.test(op.TypeInfo.OperatorName);

        // 1) interne Operatoren = alle außer den Interface-Blöcken
        const internalOps: FlowchartOperator[] = [];
        const ifaceOps = new Set<FlowchartOperator>();

        for (const op of this.operators.values()) {
            if (isInputIface(op) || isOutputIface(op)) ifaceOps.add(op);
            else internalOps.push(op);
        }

        // 2) Operator-Daten (nur intern)
        const operatorData = internalOps.map(op => ({
            globalTypeIndex: op.TypeInfo.GlobalTypeIndex,
            caption: op.Caption,
            index: op.GlobalOperatorIndex,
            posX: op.Xpos,
            posY: op.Ypos,
            configurationData: op.Config_Copy,
        }));

        // 3) Links klassifizieren
        const macroLinks: { fromOperatorIndex: number; fromOutput: number; toOperatorIndex: number; toInput: number; }[] = [];
        const exposedInputs: any[] = [];
        const exposedOutputs: any[] = [];

        const pickType = (a: ConnectorType | null, b: ConnectorType | null): ConnectorType => {
            if (a !== null && a !== undefined) return a as ConnectorType;
            if (b !== null && b !== undefined) return b as ConnectorType;
            // Fallback: sollte praktisch nicht passieren
            return ConnectorType.FLOAT;
        };

        for (const link of this.links.values()) {
            const fromOp = link.From.Parent;
            const toOp = link.To.Parent;

            const fromIsIface = ifaceOps.has(fromOp);
            const toIsIface = ifaceOps.has(toOp);

            // Interne Links bleiben erhalten:
            if (!fromIsIface && !toIsIface) {
                macroLinks.push({
                    fromOperatorIndex: fromOp.GlobalOperatorIndex,
                    fromOutput: link.From.LocalConnectorIndex,
                    toOperatorIndex: toOp.GlobalOperatorIndex,
                    toInput: link.To.LocalConnectorIndex,
                });
                continue;
            }

            // InputBlock => externes Input wird auf internen Eingang gemappt
            if (isInputIface(fromOp) && !toIsIface) {
                exposedInputs.push({
                    targetOperatorIndex: toOp.GlobalOperatorIndex,
                    targetInput: link.To.LocalConnectorIndex,
                    sourceName: fromOp.Caption,
                    sourceOutput: link.From.LocalConnectorIndex,
                    connectorType: pickType(link.From.Type, link.To.Type),
                    connectorName: fromOp.Caption
                });
                continue;
            }

            // OutputBlock => externes Output liest von internem Ausgang
            if (!fromIsIface && isOutputIface(toOp)) {
                exposedOutputs.push({
                    sourceOperatorIndex: fromOp.GlobalOperatorIndex,
                    sourceOutput: link.From.LocalConnectorIndex,
                    targetName: toOp.Caption,
                    targetInput: link.To.LocalConnectorIndex,
                    connectorType: pickType(link.From.Type, link.To.Type),
                    connectorName: toOp.Caption
                });
                continue;
            }

            // Interface↔Interface ignorieren
        }

        // 4) MacroData zusammensetzen – NUR interne Ops + interne Links + explicit exposed IO
        const macroData = {
            operators: operatorData,
            links: macroLinks,
            exposedInputs,
            exposedOutputs,
        };

        // 5) Superblock erzeugen & einfügen
        const title = name && name.trim() ? name.trim() : "CustomBlock";
        const macro = new MacroOperator(this, title, null, macroData);
        macro.MoveTo(200, 120);
        this.operators.set(macro.GlobalOperatorIndex, macro);
    }


    public async RenderUi(subcontainer: HTMLDivElement) {
        if (!subcontainer) throw new Error("container is null");
        //let subcontainer = <HTMLDivElement>Html(container, "div", [], ["develop-ui"]);


        this.buildMenu(subcontainer);

        let workspace = <HTMLDivElement>Html(subcontainer, "div", ["tabindex", "0"], ["develop-workspace"]);//tabindex, damit keypress-Events abgefangen werden können
        this.propertyGridHtmlDiv = <HTMLDivElement>Html(subcontainer, "div", [], ["develop-properties"]);

        this.flowchartContainerSvgSvg = <SVGSVGElement>Svg(workspace, "svg", ["width", "100%", "height", "100%"], ["flowchart-container", "edit"]);

        this.selectionBoxDiv = document.createElement("div");
        this.selectionBoxDiv.style.position = "absolute";
        this.selectionBoxDiv.style.border = "1px dashed #666";
        this.selectionBoxDiv.style.backgroundColor = "rgba(0,0,255,0.1)";
        this.selectionBoxDiv.style.pointerEvents = "none";
        this.selectionBoxDiv.style.display = "none";
        workspace.appendChild(this.selectionBoxDiv);

        this.scalingLayer = <SVGGElement>Svg(this.flowchartContainerSvgSvg, "g", [], ["scaling-layer"]);

        const gridDefs = Svg(this.scalingLayer, "defs", []);
        const pattern = Svg(gridDefs, "pattern", [
            "id", "grid-pattern",
            "width", "40",
            "height", "40",
            "patternUnits", "userSpaceOnUse"
        ]);
        Svg(pattern, "path", [
            "d", "M 40 0 L 0 0 0 40",
            "fill", "none",
            "stroke", "#cccccc",
            "stroke-width", "1"
        ]);

        Svg(this.scalingLayer, "rect", [
            "x", "0",
            "y", "0",
            "width", "10000",
            "height", "10000",
            "fill", "url(#grid-pattern)"
        ]);

        // Und dann alle Layer in scalingLayer einfügen! alle Zeichenebenen in eine neue <g>-Gruppe (scalingLayer) verschoben, 
        // weil scalingLayer wird mit transform: scale(...) gezoomt.
        //Dadurch bleibt alles andere (Zoom-Buttons, UI-Menüs etc.) unberührt.


        this.linksLayer = <SVGGElement>Svg(this.scalingLayer, "g", [], ["flowchart-links-layer"]);
        this.operatorsLayer = <SVGGElement>Svg(this.scalingLayer, "g", [], ["flowchart-operators-layer", "unselectable"]);
        this.tempLayer = <SVGSVGElement>Svg(this.scalingLayer, "g", [], ["flowchart-temporary-link-layer"]);

        //Button hinzugefügt !!!!!
        let zoomControls = <HTMLDivElement>Html(workspace, "div", [], ["zoom-controls"]);
        let zoomInButton = <HTMLButtonElement>Html(zoomControls, "button", [], [], "+");

        // Prozent-Anzeige links
        this.zoomLabel = <HTMLDivElement>Html(zoomControls, "div", [], ["zoom-label"], `${Math.round(this.zoomLevel * 100)}%`);
        this.zoomLabel.onclick = () => {
            this.zoomLevel = 1.0;
            this.applyZoom();
        };

        let zoomOutButton = <HTMLButtonElement>Html(zoomControls, "button", [], [], "-");
        // Positionieren
        zoomControls.style.position = "fixed";
        zoomControls.style.top = "78px";
        zoomControls.style.right = "50px";
        zoomControls.style.zIndex = "1000";
        zoomControls.style.display = "flex";
        zoomControls.style.alignItems = "center";
        zoomControls.style.gap = "6px"; // etwas Abstand

        zoomInButton.onclick = () => this.ZoomIn();
        zoomOutButton.onclick = () => this.ZoomOut();



        this.tempLayer.style.visibility = "hidden";//visible
        let defs = Svg(this.tempLayer, "defs", []);
        let markerArrow = Svg(defs, "marker", ["id", "marker-arrow", "markerWidth", "4", "markerHeight", "4", "refX", "1", "refY", "2", "orient", "0"]);
        this.markerArrow = <SVGPathElement>Svg(markerArrow, "path", ["d", "M0,0 L0,4 L2,2 z", "fill", "red", "stroke", "black", "stroke-width", "0.5"]);
        let markerCircle = Svg(defs, "marker", ["id", "marker-circle", "markerWidth", "4", "markerHeight", "4", "refX", "2", "refY", "2", "orient", "0"]);
        this.markerCircle = <SVGCircleElement>Svg(markerCircle, "circle", ["cx", "2", "cy", "2", "r", "2", "fill", "red", "stroke-width", "1px", "stroke", "black"]);
        this.temporaryLink = <SVGLineElement>Svg(this.tempLayer, "line", ["x1", "0", "y1", "0", "x2", "0", "y2", "0", "stroke-dasharray", "6,6", "stroke-width", "4", "stroke", "black", "fill", "none", "marker-end", "url(#marker-arrow)"]);

        let operatorLibActivator = <SVGRectElement>Svg(this.flowchartContainerSvgSvg, "rect", ["width", "40", "height", "100%", "fill", "white", "fill-opacity", "0"]);

        this.operatorLibDiv = <HTMLDivElement>Html(subcontainer, "div", [], ["flowchart-operatorlibdiv", "unselectable"]);


        // Button erstellen
        // Links neben Workspace eine eigene Spalte für den Button
        const buttonContainer = document.createElement("div");
        buttonContainer.classList.add("operator-button-container"); // <-- neue Klasse
        const toggleButton = document.createElement("button");
        toggleButton.innerText = "▶";
        toggleButton.classList.add("operator-toggle-button");
        buttonContainer.appendChild(toggleButton);
        subcontainer.appendChild(buttonContainer); // <-- direkt in die skalierbare Zeichenfläche!

        // Öffnet die Sidebar bei Hover
        buttonContainer.addEventListener("mouseenter", () => {
            this.operatorLibDiv.classList.add("visible");
        });
        this.operatorLibDiv.addEventListener("mouseleave", () => {
            this.operatorLibDiv.classList.remove("visible");
        });





        //let toolsRect= <SVGRectElement>$.Svg(this.operatorLibDiv, "rect", ["width","140", "height", "100%", "rx", "10", "ry", "10"], ["tools-container"]);

        //The onmousemove event occurs every time the mouse pointer is moved over the div element.
        //The mouseenter event only occurs when the mouse pointer enters the div element.
        //The onmouseover event occurs when the mouse pointer enters the div element, and its child elements (p and span).

        //The mouseout event triggers when the mouse pointer leaves any child elements as well the selected element.
        //The mouseleave event is only triggered when the mouse pointer leaves the selected element.

        this.flowchartContainerSvgSvg.addEventListener("mousedown", (e) => {
            if (e.button !== 0 || this.mode !== FlowchartMode.EDIT) return;

            // Verhindere Lasso, wenn auf Operator geklickt wurde
            if ((e.target as Element).closest(".operator")) return;

            const svgRect = this.flowchartContainerSvgSvg.getBoundingClientRect();
            const startX = e.clientX - svgRect.left;
            const startY = e.clientY - svgRect.top;

            this.selectionStart = { x: startX, y: startY };

            this.selectionBoxDiv!.style.left = `${startX}px`;
            this.selectionBoxDiv!.style.top = `${startY}px`;
            this.selectionBoxDiv!.style.width = `0px`;
            this.selectionBoxDiv!.style.height = `0px`;
            this.selectionBoxDiv!.style.display = "block";
        });



        document.addEventListener("mousemove", (e) => {
            if (!this.selectionStart) return;

            const svgRect = this.flowchartContainerSvgSvg.getBoundingClientRect();
            const x = e.clientX - svgRect.left;
            const y = e.clientY - svgRect.top;

            const left = Math.min(this.selectionStart.x, x);
            const top = Math.min(this.selectionStart.y, y);
            const width = Math.abs(this.selectionStart.x - x);
            const height = Math.abs(this.selectionStart.y - y);

            Object.assign(this.selectionBoxDiv!.style, {
                left: `${left}px`,
                top: `${top}px`,
                width: `${width}px`,
                height: `${height}px`
            });
        });


        document.addEventListener("mouseup", (e) => {
            if (!this.selectionStart) return;
            this.selectionBoxDiv!.style.display = "none";

            const rect = {
                left: Math.min(this.selectionStart.x, e.clientX),
                top: Math.min(this.selectionStart.y, e.clientY),
                right: Math.max(this.selectionStart.x, e.clientX),
                bottom: Math.max(this.selectionStart.y, e.clientY),
            };

            this.selectionStart = null;

            const svgRect = this.flowchartContainerSvgSvg.getBoundingClientRect();

            const selectionBox = {
                left: rect.left - svgRect.left,
                top: rect.top - svgRect.top,
                right: rect.right - svgRect.left,
                bottom: rect.bottom - svgRect.top,
            };

            // Wenn Shift gedrückt: additiv
            const additive = e.shiftKey;
            if (!additive) this.UnselectAllOperators();

            for (const op of this.operators.values()) {
                const bbox = op.ElementSvgG.getBoundingClientRect();
                const opBox = {
                    left: bbox.left - svgRect.left,
                    top: bbox.top - svgRect.top,
                    right: bbox.right - svgRect.left,
                    bottom: bbox.bottom - svgRect.top
                };

                const isInside = (
                    opBox.left >= selectionBox.left &&
                    opBox.right <= selectionBox.right &&
                    opBox.top >= selectionBox.top &&
                    opBox.bottom <= selectionBox.bottom
                );

                if (isInside) {
                    this.SelectOperator(op, true);
                }
            }
        });


        this.flowchartContainerSvgSvg.addEventListener("click", (e: MouseEvent) => {
            if (e.target !== this.flowchartContainerSvgSvg) return;
            this.UnselectAllOperators();
            this.unselectLink();
        });



        workspace.addEventListener("keydown", (e) => {
            if (e.ctrlKey && (e.key === "+" || e.key === "-" || e.key === "=")) {
                e.preventDefault(); // 🔒 Blockiert den normalen Browser-Zoom

                if (e.key === "+" || e.key === "=") {
                    this.ZoomIn();
                } else if (e.key === "-") {
                    this.ZoomOut();
                }
            }

            // ENTF: Löscht selektierten Operator oder Link
            if (e.key === "Delete") {
                e.preventDefault();
                this.deleteSelectedThing();
            }
        });

        this.flowchartContainerSvgSvg.addEventListener("wheel", (event) => {
            // Optional: nur im Edit-Modus
            if (this.mode !== FlowchartMode.EDIT) return;

            // Touchpad oder Ctrl+Mausrad
            if (event.ctrlKey || Math.abs(event.deltaY) < 50) {
                event.preventDefault(); // verhindert Scroll

                const zoomFactor = 1.05;

                if (event.deltaY < 0) {
                    this.zoomLevel *= zoomFactor;
                } else {
                    this.zoomLevel /= zoomFactor;
                }

                this.applyZoom();
            }
        }, { passive: false }); // passive: false ist wichtig für preventDefault()

        this.operatorRegistry.populateOperatorLib(this.operatorLibDiv, (e: MouseEvent, ti: TypeInfo) => {
            let caption = ti.OperatorName;
            let o = this.createOperatorInternal(ti.GlobalTypeIndex, caption, null);

            //Blöcke auf richtige Position setzen
            const scrollDiv = this.flowchartContainerSvgSvg.parentElement!; // = develop-workspace
            const scrollLeft = scrollDiv.scrollLeft;
            const scrollTop = scrollDiv.scrollTop;

            const x = scrollLeft / this.zoomLevel + 100;
            const y = scrollTop / this.zoomLevel + 100;

            o.MoveTo(x, y);



            o.RegisterDragging(e);
            this.operators.set(o.GlobalOperatorIndex, o);
        });

        await this.getMacroFileList()

        this.updateCustomBlocksMenu();
    

        this.getFbdFile(DEFAULTFBD_FBD_FILEPATH);
        this.recreateFlowchartFromData();
    }

    constructor(private appManagement: IAppManagement, private flowchartData: FlowchartData, private flowchartCallbacks: FlowchartCallback, private options: FlowchartOptions) {
        this.operatorRegistry = operatorimpl.OperatorRegistry.Build();
    }


    private createOperatorInternal(globalTypeIndex: number, caption: string, configurationData: KeyValueTuple[] | null): FlowchartOperator {

        if (!this.operatorRegistry.IsIndexKnown(globalTypeIndex)) {
            throw new Error(`Unknown globalTypeIndex ${globalTypeIndex}`);
        }
        if (this.flowchartCallbacks.onOperatorCreate && !this.flowchartCallbacks.onOperatorCreate(caption, null, false)) {
            throw new Error(`Creation of operator of globalTypeIndex ${globalTypeIndex} prevented by onOperatorCreate plugin`);
        }
        let op = this.operatorRegistry.CreateByIndex(globalTypeIndex, this, caption, configurationData)!;

        this.currentDebugInfo = null;
        return op;
    }

    public setData(data: FlowchartData) {
        this.flowchartData = data;
        this.recreateFlowchartFromData();

    }

    private recreateFlowchartFromData() {
        this.links.forEach((e) => e.RemoveFromDOM());
        this.links.clear();
        this.operators.forEach((e) => e.RemoveFromDOM());
        this.operators.clear();
        FlowchartOperator.ResetMaxIndex();
        let indexInData2operator = new Map<number, FlowchartOperator>();

        for (const d of this.flowchartData!.operators) {
            let o = this.createOperatorInternal(d.globalTypeIndex, d.caption, d.configurationData);
            o.MoveTo(d.posX, d.posY);
            this.operators.set(o.GlobalOperatorIndex, o);
            indexInData2operator.set(d.index, o);
        }
        for (const d of this.flowchartData!.links) {
            let fromOp = indexInData2operator.get(d.fromOperatorIndex);
            let toOp = indexInData2operator.get(d.toOperatorIndex);
            if (fromOp === undefined || toOp === undefined) continue;
            let fromConn = fromOp.GetOutputConnectorByIndex(d.fromOutput);
            let toConn = toOp.GetInputConnectorByIndex(d.toInput);
            if (fromConn == null || toConn == null) continue;
            this.createLink(d, fromConn, toConn);
        }
    }

    public DeleteLink(globalLinkIndex: number) {
        this.currentDebugInfo = null;
        let l = this.links.get(globalLinkIndex);
        if (l === undefined) {
            throw Error("Link to delete is undefined")
        }
        if (this.selectedLink == l) {
            this.unselectLink();
        }
        l.RemoveFromDOM();
        this.links.delete(globalLinkIndex);
        l.To.RemoveLink(l);
        l.From.RemoveLink(l);
    }

    public DeleteOperator(globalOperatorIndex: number) {
        this.currentDebugInfo = null;
        let o = this.operators.get(globalOperatorIndex);
        if (o === undefined) {
            throw Error("Operator to delete is undefined")
        }
        this.selectedOperators.delete(o); // einfach aus dem Set entfernen
        o.ShowAsSelected(false); // Auswahl entfernen
        o.RemoveFromDOM();
        this.operators.delete(o.GlobalOperatorIndex);
        for (const outputKV of o.OutputsKVIt) {
            for (const linkKV of outputKV[1].LinksKVIt) {
                this.DeleteLink(linkKV[1].GlobalLinkIndex);
            }
        }
        for (const inputKV of o.InputsKVIt) {
            for (const linkKV of inputKV[1].LinksKVIt) {
                this.DeleteLink(linkKV[1].GlobalLinkIndex);
            }
        }
    }

    public createLink(data: LinkData | null, from: FlowchartOutputConnector, to: FlowchartInputConnector): FlowchartLink | null {
        if (this.flowchartCallbacks.onLinkCreate && !this.flowchartCallbacks.onLinkCreate(from.Caption, data)) return null;
        if (!this.options.multipleLinksOnOutput && from.LinksLength > 0) return null;
        if (!this.options.multipleLinksOnInput && to.LinksLength > 0) return null;
        this.currentDebugInfo = null;
        let l: FlowchartLink = new FlowchartLink(this, "", this.Options.defaultLinkColor, from, to);
        from.AddLink(l);
        to.AddLink(l);
        this.links.set(l.GlobalLinkIndex, l);
        return l;
    }

    private unsetTemporaryLink() {
        this.lastOutputConnectorClicked = null;
        this.tempLayer.style.visibility = "hidden";
    }

    private setTemporaryLink(c: FlowchartOutputConnector) {
        this.lastOutputConnectorClicked = c;
        let color = Flowchart.DATATYPE2COLOR.get(c.Type)
        if (!color) color = "BLACK";
        this.markerArrow!.style.fill = color;
        this.markerCircle!.style.fill = color;
        this.tempLayer.style.visibility = "visible";
    }

    private unselectOperator() {
        this.UnselectAllOperators();
    }

    public SelectOperator(operator: FlowchartOperator, additive: boolean = false): void {
        if (!additive) {
            this.UnselectAllOperators();
        }

        const alreadySelected = this.selectedOperators.has(operator);

        if (additive && alreadySelected) {
            // Toggle abwählen
            operator.ShowAsSelected(false);
            this.selectedOperators.delete(operator);
        } else if (!alreadySelected) {
            operator.ShowAsSelected(true);
            this.selectedOperators.add(operator);
        }

        this.updatePropertyGrid();
    }

    private updatePropertyGrid() {
        this.propertyGridHtmlDiv.innerText = "";

        if (this.selectedOperators.size === 1) {
            const first = [...this.selectedOperators][0];
            Html(this.propertyGridHtmlDiv, "p", [], ["develop-propertygrid-head"], `Properties for ${first.Caption}`);
            // ggf. weitere Inhalte...
        } else if (this.selectedOperators.size > 1) {
            Html(this.propertyGridHtmlDiv, "p", [], ["develop-propertygrid-head"], `${this.selectedOperators.size} blocks selected.`);
        }
    }


    private UnselectAllOperators() {
        for (const op of this.selectedOperators) {
            op.ShowAsSelected(false);
        }
        this.selectedOperators.clear();
        this.propertyGridHtmlDiv.innerText = "";
        this.updatePropertyGrid();

    }


    // Found here : http://stackoverflow.com/questions/5560248/programmatically-lighten-or-darken-a-hex-color-or-rgb-and-blend-colors
    public static _shadeColor(color: string, percent: number) {
        var f = parseInt(color.slice(1), 16), t = percent < 0 ? 0 : 255, p = percent < 0 ? percent * -1 : percent, R = f >> 16, G = f >> 8 & 0x00FF, B = f & 0x0000FF;
        return "#" + (0x1000000 + (Math.round((t - R) * p) + R) * 0x10000 + (Math.round((t - G) * p) + G) * 0x100 + (Math.round((t - B) * p) + B)).toString(16).slice(1);
    }
    public GetSelectedOperators(): Set<FlowchartOperator> {
        return this.selectedOperators;
    }
    public get OperatorsMap() {
        return this.operators;
    }


}
