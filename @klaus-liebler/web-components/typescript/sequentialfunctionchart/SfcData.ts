/**
 * =============================================================================
 * @file        MyAwesomeClass.ts
 * @description Zentrale Klasse zur Verarbeitung von Nutzerdaten.
 *              Implementiert Geschäftslogik für das Auth-Modul.
 * 
 * @author      Felix Lukowski, Jan Heitmeier
 * @created     2025-04-25
 * @version     1.0.0
 * 
 * @methods
 *    - constructor(config: Config): void
 *        Initialisiert die Klasse mit der gegebenen Konfiguration.
 * 
 *    - validateUserInput(user: UserInput, strict: boolean): ValidationResult
 *        Führt Validierungen auf Nutzerdaten durch.
 * 
 *    - authenticate(token: string): Promise<User>
 *        Authentifiziert den Benutzer über ein JWT.
 * 
 *    - reset(): void
 *        Setzt den internen Zustand zurück.
 * 
 * =============================================================================
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
    transitions: SfcTransition[]; //Hier können mehrere Ziele drin definiert werden
}

export interface SfcAction {
    name: string; //Name of the action
    codeUid: string; // Unique identifier of the action
    //aktionsbestimmungskennzeichnen ENUM, Standart nachlesen.
}

//Verschiedene Transitionen beachten wie , simple, joiner, splitter.
export interface SfcTransition {
    source: SfcOperator; //Wo man herkommt
    target: SfcOperator; //wo man hin kann , 
    condition: string; //Boolean condition
}

//Parraliser Joiner
//Wo genau steckt die Transition bedinungen drin. expliziter darstellen.

