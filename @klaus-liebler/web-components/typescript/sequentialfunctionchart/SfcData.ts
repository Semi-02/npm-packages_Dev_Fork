/**
 * =============================================================================
 * @file        SfcData.ts
 * @description Datenstruktur für den Sequential Function Chart (SFC).
 * 
 * @author      Felix Lukowski, Jan Heitmeier
 * @created     2025-04-25
 * @version     1.0.0
 * 
 * =============================================================================
 */

export interface SfcData {    
    start: SfcOperator; //Start operator of the chart
    operator : SfcOperator[];
}

export interface SfcOperator {
    Uid: string; // Unique identifier of the operator
    caption: string; //Caption of the operator
    actions: SfcAction[];
    sourceTransitions: SfcTransition; 
    targetTransitions: SfcTransition; 
}

export interface SfcAction {
    qualifier: SfcQualifier; //NQualifizierer, siehe SFC-Standard.
    codeUid: string; // Unique identifier of the action
    hardwareBooleanName: string; //Name of the hardware boolean that is manipulated by the action
    hardwareBoolean: boolean; //Boolean value that is manipulated by the action
}
//Qualifizierer, siehe SFC-Standard.
enum SfcQualifier {
    N = "N", // Die Aktion ist aktiv, solange der Schritt aktiv ist.
    R0 = "R0", // Reset überschreiben: Die Aktion wird deaktiviert.
    S0 = "S0", // Festgelegt (gespeichert): Aktion startet bei Aktivierung des Schritts und bleibt bis zum Reset aktiv.
    L = "L", // Begrenzte Zeit: Aktion läuft, bis der Schritt inaktiv ist oder die Zeit abläuft.
    D = "D", // Verzögerte Zeit: Aktion startet nach Verzögerung, wenn der Schritt aktiv bleibt.
    P = "P", // Impuls: Aktion wird einmal bei Aktivierung/Deaktivierung des Schritts ausgeführt.
    SD = "SD", // Gespeichert und verzögerte Zeit: Aktion startet nach Verzögerung und bleibt bis zum Reset aktiv.
    DS = "DS", // Verzögert und gespeichert: Aktion startet nach Verzögerung und bleibt bis zum Reset aktiv.
    SL = "SL" // Gespeichert und begrenzte Zeit: Aktion läuft für eine Zeit oder bis zum Reset.
}

export interface SfcTransition {
    type: SfcTransitionType; //Type of the transition (simple, joiner, splitter)
    source: SfcOperator[]; //Menge der Operatoren, die die Transition auslösen können
    sourceDone: boolean []; //Array of booleans indicating if the source operator is done
    target: SfcOperator[]; //
    condition: string[]; //Boolean condition
}

export enum SfcTransitionType {
    simple = "simple", //Simple transition with one source and one target
    joiner = "joiner", //Joiner transition with multiple sources and one target
    splitter_simultan = "splitter_simultan", //Splitter transition with one source and multiple targets
    splitter_alternativ = "splitter_alternativ", //Splitter transition with one source and multiple targets
}
