import { FlowchartOperator } from "./FlowchartOperator";
import { Flowchart } from "./Flowchart";
import { ConnectorType } from "./FlowchartConnector";
import { FlowchartData } from "./FlowchartData";
import { KeyValueTuple } from "@klaus-liebler/commons";
import { SerializeContextAndAdressMap } from "./FlowchartCompiler";
import { FlowchartInputConnector } from "./FlowchartConnector";
import { FlowchartOutputConnector } from "./FlowchartConnector";
import { PositionType, SingletonType, TypeInfo } from "./FlowchartOperator";

export class MacroOperator extends FlowchartOperator {
    private internalFlowchartData: FlowchartData;

    constructor(
        parent: Flowchart,
        caption: string,
        configurationData: KeyValueTuple[] | null,
        internalData: FlowchartData,
        
    ) {
        super(
            parent,
            caption,
            new TypeInfo(
                MacroOperator.GlobalTypeIndex,
                "Custom",
                "Macro",
                PositionType.Default,
                SingletonType.Default,
                () => {
                    throw "Builder not used here";
                }
            ),
            configurationData
        );
        

        this.internalFlowchartData = internalData;

const internalOperatorIds = new Set(
    this.internalFlowchartData.operators.map(op => op.index)
);

const exposedInputs = this.internalFlowchartData.exposedInputs ?? [];
const exposedOutputs = this.internalFlowchartData.exposedOutputs ?? [];


function getInputType(opIndex: number, inputIndex: number): ConnectorType {
    const op = parent.OperatorsMap.get(opIndex);
 // Zugriff auf echten Operator
    if (!op) return ConnectorType.BOOLEAN;
    const connector = op.GetInputConnectorByIndex(inputIndex);
    return connector?.Type ?? ConnectorType.BOOLEAN;
}

function getOutputType(opIndex: number, outputIndex: number): ConnectorType {
    const op = parent.OperatorsMap.get(opIndex);

    if (!op) return ConnectorType.BOOLEAN;
    const connector = op.GetOutputConnectorByIndex(outputIndex);
    return connector?.Type ?? ConnectorType.BOOLEAN;
}
console.log("🧪 Inputs:", exposedInputs);
console.log("🧪 Outputs:", exposedOutputs);



        // Nur 1 Output (optional: hier kannst du dynamisch Connectoren generieren)
// Im MacroOperator
this.AppendConnectors(
    exposedInputs.map((e, i) =>
        new FlowchartInputConnector(
            this,
            `In${i}`,
           i, 
           e.connectorType ?? ConnectorType.BOOLEAN // 🆕 direkter Zugriff
        )
    ),
    exposedOutputs.map((e, i) =>
        new FlowchartOutputConnector(
            this,
            `Out${i}`,
            i,
            e.connectorType ?? ConnectorType.BOOLEAN // 🆕 direkter Zugriff
            
        )
    )
);





        console.log("Superblock enthält Operatoren:", this.internalFlowchartData.operators);
console.log("Superblock enthält Links:", this.internalFlowchartData.links);
console.log("Exposed Inputs:", exposedInputs);


    }

    public static GlobalTypeIndex = 9999;

    public GetInternalData(): FlowchartData {
        return this.internalFlowchartData;
    }

    public SerializeToBinary(ctx: SerializeContextAndAdressMap): void {
        console.warn("MacroOperator: SerializeToBinary() not implemented yet.");
        // TODO in Schritt 4: hier kommt später das „Aufklappen“ beim Kompilieren rein
    }

    
}

