import { KeyValueTuple } from "@klaus-liebler/commons";
import { ConnectorType } from "./FlowchartConnector";



export interface FlowchartData {
    operators: OperatorData[];
    links: LinkData[];

    /*[Projekt-Erweiterung] Exposed Inputs/Outputs*/
    exposedInputs?: {
        targetOperatorIndex: number;
        targetInput: number;
        sourceName: string;
        sourceOutput: number;
        connectorType?: ConnectorType;
        connectorName?: string; // Optional, falls der Name des Connectors angegeben werden soll

    }[];
    exposedOutputs?: {
        sourceOperatorIndex: number;
        sourceOutput: number;
        targetName: string;
        targetInput: number;
        connectorType?: ConnectorType;
        connectorName?: string; // Optional, falls der Name des Connectors angegeben werden soll
    }[];
}

export interface OperatorData {
    globalTypeIndex: number;
    caption: string;
    index: number;
    posX: number;
    posY: number;
    configurationData: KeyValueTuple[] | null;
}



export interface LinkData {
    fromOperatorIndex: number;
    fromOutput: number;
    toOperatorIndex: number;
    toInput: number;
}