import {FlowchartInputConnector, FlowchartOutputConnector } from "./FlowchartConnector";
import {Flowchart} from "./Flowchart";
import { SerializeContextAndAdressMap } from "./FlowchartCompiler";
import {Svg} from "../utils/common"
import { SimulationContext } from "./SimulationContext";
import { KeyValueTuple } from "@klaus-liebler/commons";


export enum PositionType{
    Default,
    Input,
    Output,
};
export enum SingletonType{
    Default,
    Singleton,
};
export class TypeInfo
{
    constructor(
        public GlobalTypeIndex:number, 
        public GroupName:string, 
        public OperatorName:string, 
        public Position:PositionType, 
        public Singleton:SingletonType, 
        public Builder:(parent: Flowchart, caption: string, ti:TypeInfo, configurationData:KeyValueTuple[]|null)=>FlowchartOperator)
        {}
}
//FlowchartOperator ist die Basisklasse aller "Boxen", mit denen man ein Programm aufbaut
export abstract class FlowchartOperator {

    //der Index der Inputs ist rein lokal und beginnt bei 0 fortlaufend
    private Inputs: FlowchartInputConnector[]=[];
    //der Index der Outputs ist rein lokal und beginnt bei 0 fortlaufend
    private Outputs: FlowchartOutputConnector[]= [];


    private static MAX_INDEX: number = 0;
    private index: number;
    get GlobalOperatorIndex(){return this.index;}

    private elementSvgG: SVGGElement;
    get ElementSvgG() { return this.elementSvgG; }
    private inputSvgG:SVGGElement;
    get InputSvgG(): SVGGElement { return this.inputSvgG; }
    private outputSvgG:SVGGElement;
    get OutputSvgG(): SVGGElement { return this.outputSvgG;}
    private debugInfoSvgText:SVGTextElement;
    private lastMouseDownDt:number=0;;

    /*[Projekt-Erweiterung] Doppelklick zum Umbenennen*/
    private isSelected = false;
    private isDragging: boolean = false;
    private titleSvgText: SVGTextElement;

    get TypeInfo(){return this.typeInfo;}

    get Xpos(){return this.x;}
    get Ypos(){return this.y;}
    get Config_Copy(){
        return this.configurationData?this.configurationData.slice(0):null;
    }

    private x=0;
    private y=0;

    protected box:SVGRectElement;
    public static ResetMaxIndex(){
        this.MAX_INDEX=0;
    }

    
    public ShowAsSelected(state: boolean) {
        /*[Projekt-Erweiterung] Funktion, um den Selektionsstatus zu setzen*/
        console.log("ShowAsSelected", this.Caption, state);
        this.isSelected = state;

        if (state) {
            this.box.classList.add('selected');
        } else {
            this.box.classList.remove('selected');
        }
    }
    
    /*[Projekt-Erweiterung] Methode, um den Selektionsstatus abzufragen*/
    public IsSelected(): boolean {
        return this.isSelected;
    }

    public SetDebugInfoText(text:string):void{
        this.debugInfoSvgText.textContent=text;
    }

    protected cfg_setDefault(key:string, value:any)
    {
        if(this.configurationData==null) this.configurationData=[];
        for (const e of this.configurationData) {
            if(e.key==key){
                return;
            }
        } 
        this.configurationData.push({key:key, value:value});
    }

    protected cfg_getValue(key:string, defaultValue:any):any
    {
        if(this.configurationData==null) this.configurationData=[];
        for (const e of this.configurationData) {
            if(e.key==key){
                return e.value;
            }
        };
        this.configurationData.push({key:key, value:defaultValue});
        return defaultValue;
    }

    protected cfg_setValue(key:string, value:any)
    {
        if(this.configurationData==null) this.configurationData=[];
        for (const e of this.configurationData) {
            if(e.key==key){
                e.value=value;
                return;
            }
        } 
        this.configurationData.push({key:key, value:value});
    }

    public ResetColorsAndCaptions(){
        return;
    }

    /*[Projekt-Erweiterung] Methode, um den Umbenennungsdialog anzuzeigen*/
    public showRenameDialog(): void {

        
    
    /*[Projekt-Erweiterung] Sicherstellen, dass nur ein Dialog geöffnet ist*/
    const existing = document.getElementById("rename-dialog");
    if (existing) existing.remove();

    const dialog = document.createElement("div");
    dialog.id = "rename-dialog";
    dialog.style.position = "fixed";
    dialog.style.top = "50%";
    dialog.style.left = "50%";
    dialog.style.transform = "translate(-50%, -50%)";
    dialog.style.backgroundColor = "white";
    dialog.style.border = "2px solid #444";
    dialog.style.borderRadius = "10px";
    dialog.style.padding = "20px";
    dialog.style.boxShadow = "0 4px 10px rgba(0,0,0,0.3)";
    dialog.style.zIndex = "10000";
    dialog.style.minWidth = "300px";

    const title = document.createElement("h3");
    title.innerText = "Block umbenennen";
    dialog.appendChild(title);

    const input = document.createElement("input");
    input.type = "text";
    input.value = this.Caption;
    input.style.width = "100%";
    input.style.margin = "10px 0";
    dialog.appendChild(input);

    const buttonRow = document.createElement("div");
    buttonRow.style.display = "flex";
    buttonRow.style.justifyContent = "flex-end";
    buttonRow.style.gap = "10px";

    const btnOk = document.createElement("button");
    btnOk.innerText = "OK";
    btnOk.onclick = () => {
        const newName = input.value.trim();
        if (newName !== "") {
            this.Caption = newName;
        }
        dialog.remove();
    };

    const btnCancel = document.createElement("button");
    btnCancel.innerText = "Abbrechen";
    btnCancel.onclick = () => dialog.remove();

    buttonRow.appendChild(btnCancel);
    buttonRow.appendChild(btnOk);
    dialog.appendChild(buttonRow);

    document.body.appendChild(dialog);

    input.focus();
    input.select();
}


    constructor(private parent: Flowchart, private caption: string, private typeInfo: TypeInfo, protected configurationData:KeyValueTuple[]|null) {
        this.index = FlowchartOperator.MAX_INDEX++;
        this.elementSvgG = <SVGGElement>Svg(parent.OperatorsLayer, "g", [], ["operator"]);
        this.elementSvgG.setAttribute('data-operator-index', "" + this.index);
        let dragGroup = <SVGGElement>Svg(this.elementSvgG, "g", [], []);
        this.box = <SVGRectElement>Svg(dragGroup, "rect", ["width","140", "height", "100", "rx", "10", "ry", "10"], ["operator-box"]);
this.titleSvgText = <SVGTextElement>Svg(dragGroup,"text", ["x", "5", "y", "21"],["operator-title"]);
this.titleSvgText.textContent = caption;
        this.debugInfoSvgText = <SVGTextElement>Svg(dragGroup, "text", ["x", "0", "y", "100"],["operator-debuginfo"]);
        this.debugInfoSvgText.textContent="No debug info";

        this.inputSvgG= <SVGGElement>Svg(this.elementSvgG,"g", ["transform", "translate(0 50)"], ["operator-inputs"]);
        this.outputSvgG= <SVGGElement>Svg(this.elementSvgG,"g", ["transform", "translate(140 50)"], ["operator-outputs"]);


        
  /*[Projekt-Erweiterung] macht Doppelklick auf den Operator-Namen möglich, um den Umbenennungsdialog zu öffnen*/
  this.elementSvgG.addEventListener("click", (e) => {
    console.log("CLICK on elementSvgG", this.Caption);

    if (this.isDragging) {
        console.log("Skip click due to drag");
        this.isDragging = false; // Reset für nächste Interaktion
        return;
    }

    e.stopPropagation();
    parent._notifyOperatorClicked(this, e);
});

        
        dragGroup.addEventListener("pointerdown", (e) => {
            if (this.parent.UserMayMoveOperators() && !e.shiftKey) {
                this.RegisterDragging(e);
            }
            e.stopPropagation();
        });
        
        
        
        
    }

    /*[Projekt-Erweiterung] Methode, um das Ziehen des Operators zu registrieren und durchzuführen*/
    RegisterDragging(startEvent: MouseEvent): void {
        const startX = startEvent.clientX;
        const startY = startEvent.clientY;

        const flowchart = this.parent;
        const selected = flowchart.GetSelectedOperators();
        const isMultiSelect = selected.has(this);

        this.isDragging = false;

        // Positionen aller selektierten Operatoren merken
        const originalPositions = new Map<FlowchartOperator, { x: number; y: number }>();
        for (const op of selected) {
            originalPositions.set(op, { x: op.Xpos, y: op.Ypos });
        }

        const onMouseMove = (moveEvent: MouseEvent) => {
            const dx = (moveEvent.clientX - startX) / flowchart.PositionRatio;
            const dy = (moveEvent.clientY - startY) / flowchart.PositionRatio;

            if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
                this.isDragging = true;
            }

            if (isMultiSelect) {
                for (const op of selected) {
                    const orig = originalPositions.get(op);
                    if (orig) {
                        op.MoveTo(orig.x + dx, orig.y + dy);
                    }
                }
            } else {
                const orig = originalPositions.get(this);
                if (orig) {
                    this.MoveTo(orig.x + dx, orig.y + dy);
                }
            }
        };

        const onMouseUp = () => {
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
        };

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
    }



        get Parent() { return this.parent };
        get Caption() { return this.caption; }
        set Caption(value: string) {
        this.caption = value;
        if (this.titleSvgText) {
            this.titleSvgText.textContent = value;
        }
    }

    get InputsKVIt(){return this.Inputs.entries()}
    get OutputsKVIt(){return this.Outputs.entries()}
    public GetOutputConnectorByIndex=(i:number)=>this.Outputs[i];
    public GetInputConnectorByIndex=(i:number)=>this.Inputs[i];

    public RemoveFromDOM(): void {
        this.elementSvgG.remove();
    }

    protected AppendConnectors(inputs: FlowchartInputConnector[], outputs: FlowchartOutputConnector[]) {
        if(this.Inputs.length!=0 || this.Outputs.length !=0) throw new Error("AppendConnectors may only be called once!");
        for (const i of inputs) {
            if (i.Parent != this) continue;
            this.Inputs.push(i);
        }
        for (const o of outputs) {
            if (o.Parent != this) continue;
            this.Outputs.push(o);
        }
        let num = Math.max(this.Inputs.length, this.Outputs.length);
        let height = 50+num*20+10;
        this.box.setAttribute("height", ""+height);
        this.debugInfoSvgText.setAttribute("y", ""+height);
    }

    public MoveTo(x: number, y: number) {
        let g = this.parent.Options.grid;
        this.x = Math.round(x / g) * g;
        this.y = Math.round(y / g) * g;
        this.elementSvgG.setAttribute("transform", `translate(${this.x} ${this.y})`);
        for (const c of this.Inputs) {
            c.RefreshLinkPositions();
        }
        for (const c of this.Outputs) {
            c.RefreshLinkPositions();
        }
    }

    public PopulateProperyGrid(parent:HTMLTableSectionElement):boolean
    {
        return false;
    }

    public SavePropertyGrid(tbody:HTMLTableSectionElement){
        return;
    }

    public OnSimulationStart(ctx:SimulationContext){
        return;
    }

    public OnSimulationStep(ctx:SimulationContext){
        return;
    }

    public OnSimulationStop(ctx:SimulationContext){
        return;
    }

    
    protected SerializeInputsAndOutputs(ctx:SerializeContextAndAdressMap)
    {
        for (const input of this.Inputs) {
            let variableAdress = 0;
            let links = input.GetLinksCopy();
            if(links.length==0){
                variableAdress=1; //because unconnected inputs read from adress 1 (which is "false", 0, 0.0, black...)
            }
            else{
                let out = links[0].From;
                variableAdress=ctx.typeIndex2globalConnectorIndex2adressOffset.get(out.Type)!.get(out.GlobalConnectorIndex)||1;
            }
            ctx.ctx.writeU32(variableAdress);
        }
        for(const output of this.Outputs)
        {
            let variableAdress = 0;
            if(output.LinksLength==0){
                variableAdress=0; //because unconnected outputs write to adress 0 (which is never read!)
            }
            else{
                variableAdress=ctx.typeIndex2globalConnectorIndex2adressOffset.get(output.Type)!.get(output.GlobalConnectorIndex)||1;
            }
            ctx.ctx.writeU32(variableAdress);
        }
    }

    public SerializeToBinary(ctx:SerializeContextAndAdressMap)
    {
        //serialize Type
        ctx.ctx.writeU32(this.TypeInfo.GlobalTypeIndex);
        //Index of instance
        ctx.ctx.writeU32(this.GlobalOperatorIndex);
        this.SerializeInputsAndOutputs(ctx);
        this.SerializeFurtherProperties(ctx);
    }
    
    protected SerializeFurtherProperties(mapper:SerializeContextAndAdressMap):void{
        return;
    }
    
}



