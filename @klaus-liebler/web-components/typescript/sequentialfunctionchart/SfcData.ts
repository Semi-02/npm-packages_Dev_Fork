//generate a class structure to be filled later 


/* export interface SfcData {
    nodes: SfcNode[];
}

export interface SfcNode {
    operator : SfcOperator;
    actions: SfcAction[];
    transitions: SfcTransition[];
}
 */

export interface SfcData {    
    start: SfcOperator; //Start operator of the chart
    operator : SfcOperator[];
    transitions: SfcTransition[]; //Hier können mehrere Ziele drin definiert werden
    bools: boolean[]; //Boolean conditions for the whole chart
}

export interface SfcOperator {
    Uid: string; // Unique identifier of the operator
    caption: string; //Caption of the operator
    actions: SfcAction[];
}

export interface SfcAction {
    name: string; //Name of the action
    codeUid: string; // Unique identifier of the action
}
export interface SfcTransition {
    source: SfcOperator; //Wo man herkommt
    target: SfcOperator; //wo man hin kann , 
    condition: string; //Boolean condition
}
