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
 * 
 * =============================================================================
 */

import { SfcData, SfcOperator, SfcTransition, SfcAction } from "./SfcData";

export class SfcCompiler {
    constructor() {

    }

    Compile(sfcData: SfcData): string {
        // Konvertiere SfcData in JSON und erhalte die Struktur
        try {
            const jsonData = this.safeStringify(sfcData, 2); // Nutze die eigene Implementierung für zyklische Referenzen
            return jsonData;
        } catch (error) {
            console.error("Fehler beim Kompilieren von SfcData:", error);
            throw new Error("Kompilierung fehlgeschlagen");
        }
    }
    
    safeStringify(obj: any, space: number = 2): string {
    const seen = new WeakSet();
    return JSON.stringify(obj, (key, value) => {
        if (typeof value === "object" && value !== null) {
            if (seen.has(value)) {
                return "[Circular]"; // Markiere zyklische Referenzen
            }
            seen.add(value);
        }
        return value;
    }, space);
}

}
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