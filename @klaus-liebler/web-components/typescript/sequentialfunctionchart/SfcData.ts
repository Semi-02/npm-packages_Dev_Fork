/**
 * =============================================================================
 * @file        SfcData.ts
 * @description Datenstruktur für den Sequential Function Chart (SFC) unter
 *              Anwendung von (Discriminated Union / Vererbung).
 * @authors     Felix Lukowski, Jan Heitmeier
 * @created     2025-04-25
 * @version     1.0.1
 * =============================================================================
 */

/* Gesamtstruktur des SFC */
export interface SfcData {
  start: SfcStep;
  steps: SfcStep[];
  booleans: SfcBooleans;
}

/* Definition der Booleans, z. B. für LED-Steuerungen oder Merker */
export interface SfcBooleans {
  redLed: boolean;
  yellowLed: boolean;
  greenLed: boolean;
  merk1: boolean;
  merk2: boolean;
  merk3: boolean;
  merk4: boolean;
}

/* Repräsentation einzelner Schritte im SFC */
export interface SfcStep {
  uid: string;                        // Eindeutiger Bezeichner
  caption: string;                    // Beschriftung des Schritts
  actions: SfcAction[];               // Aktionen, die in diesem Schritt ausgeführt werden
  outgoingTransitions: SfcTransition[]; // Übergänge, die von diesem Schritt ausgehen
  incomingTransitions?: SfcTransition[];  // Übergänge, die in diesen Schritt hineinführen
}

export interface BaseAction {
  codeUid: string;      // Eindeutiger Identifikator der Aktion
  caption: string;      // Beschriftung der Aktion
  targetBoolean: string; // Name des Booleans, der manipuliert wird
}

export interface ActionN extends BaseAction {
  qualifier: "N";
}

export interface ActionR0 extends BaseAction {
  qualifier: "R0";
}

export interface ActionS0 extends BaseAction {
  qualifier: "S0";
}

export interface ActionL extends BaseAction {
  qualifier: "L";
}

export interface ActionD extends BaseAction {
  qualifier: "D";
}

export interface ActionP extends BaseAction {
  qualifier: "P";
}

export interface ActionSD extends BaseAction {
  qualifier: "SD";
}

export interface ActionDS extends BaseAction {
  qualifier: "DS";
}

export interface ActionSL extends BaseAction {
  qualifier: "SL";
}

export type SfcAction =
  | ActionN
  | ActionR0
  | ActionS0
  | ActionL
  | ActionD
  | ActionP
  | ActionSD
  | ActionDS
  | ActionSL;


export interface BaseTransition {
  source: SfcStep[];      // Schritte, die den Transition auslösen
  sourceDone: boolean[];  // Array, das anzeigt, ob die Quellen abgeschlossen sind
  target: SfcStep[];      // Zielschritte der Transition
  condition: string[];    // Liste logischer Bedingungen
}

export interface TransitionSimple extends BaseTransition {
  type: "simple";
}

export interface TransitionJoiner extends BaseTransition {
  type: "joiner";
  // Zusätzliche transitionsspezifische Properties können hier ergänzt werden.
}

export interface TransitionSplitterSimultan extends BaseTransition {
  type: "splitter_simultan";
}

export interface TransitionSplitterAlternativ extends BaseTransition {
  type: "splitter_alternativ";
}

export type SfcTransition =
  | TransitionSimple
  | TransitionJoiner
  | TransitionSplitterSimultan
  | TransitionSplitterAlternativ;
