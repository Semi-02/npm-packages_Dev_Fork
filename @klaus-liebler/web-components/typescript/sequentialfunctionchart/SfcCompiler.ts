/**
 * =============================================================================
 * @file        SfcCompiler.ts
 * @description Compiliert den SFC-Graphen in eine ausführbare Form.
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

import { SfcData, SfcOperator, SfcTransition, SfcAction } from "./SfcData";
import { FlowchartData } from "../flowchart/FlowchartData";

//[Init]
//  ↓
//[Rot] ──(T1: Zeit abgelaufen)────▶ [Rot-Gelb] ──(T2: kurze Zeit)────▶ [Grün]────▶  (T3: Zeit abgelaufen)────▶     [Gelb] ──(T4: kurze Zeit)──▶ [Rot]

// //Pseudo Code für Ampelschaltung
// while (running) {
//     WaitFor(2sec);
//     SetGelb(false);
//     SetRot(true);

//     WaitFor(2sec);
//     SetGelb(true);

//     WaitFor(2sec);
//     SetRot(false);
//     SetGelb(false);
//     SetGrün(true);

//     WaitFor(2sec);
//     SetGrün(false);
//     SetGelb(true);


// }
// runLights()

// export class SfcCompiler {
//     constructor() {

//     }
//     translateSfcDataToFlowchartData(sfcData: SfcData): SfcData {
//         //Hier wird der SFC-Graph in eine ausführbare Form umgewandelt.
//         //Der Graph wird in eine Liste von Operatoren und Links umgewandelt.
//         //Die Operatoren werden in eine Liste von Funktionen umgewandelt, die dann ausgeführt werden können.
//         //Die Links werden in eine Liste von Adressen umgewandelt, die dann verwendet werden können, um die Daten zwischen den Operatoren zu übertragen.

//         let operators: SfcOperator[] = sfcData.operator;
//         let links: SfcTransition[] = sfcData.links;
//         return sfcData;
//     }

//     Compile(sfcData: SfcData): Uint8Array {
//         //Hier wird der SFC-Graph in eine ausführbare Form umgewandelt.
//         //Der Graph wird in eine Liste von Operatoren und Links umgewandelt.
//         //Die Operatoren werden in eine Liste von Funktionen umgewandelt, die dann ausgeführt werden können.
//         //Die Links werden in eine Liste von Adressen umgewandelt, die dann verwendet werden können, um die Daten zwischen den Operatoren zu übertragen.

//         let operators: SfcOperator[] = sfcData.operators;
//         let links: SfcTransition[] = sfcData.links;
//         let maps = this.createLookupMaps(operators);
//         let hashAndBuf = this.serialize(operators, maps);
//         return hashAndBuf.buf;
//     } 
//}