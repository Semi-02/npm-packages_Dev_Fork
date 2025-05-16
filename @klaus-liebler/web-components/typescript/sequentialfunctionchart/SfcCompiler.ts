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

import { SfcData, SfcStep, SfcTransition, SfcAction } from "./SfcData";
// In SfcCompiler.ts
export class SfcCompiler {
  // Existing constructor
  
  // Replace existing Compile method with this implementation
  // Or add it as a new method
  Compile(sfcData: SfcData): string {
    return this.compileSfcData(sfcData);
  }
  
/**
 * Compiles the SFC data into a JSON structure suitable for transfer to the ESP32.
 * Performs validation, optimization, and ensures proper structure for the C++ plugin.
 * 
 * @param sfcData The Sequential Function Chart data to compile
 * @returns A JSON string ready to be sent to the ESP32
 */
compileSfcData(sfcData: SfcData): string {
  try {
    // 1. Validate required data structures
    if (!sfcData) throw new Error("SFC data is null or undefined");
    if (!sfcData.start) throw new Error("Start step is missing");
    if (!Array.isArray(sfcData.steps) || sfcData.steps.length === 0) throw new Error("No steps defined");
    if (!sfcData.booleans) throw new Error("Boolean values are missing");
    
    // 2. Create a clean copy of data without circular references
    const optimizedData = {
      start: this.prepareStepForTransfer(sfcData.start),
      steps: sfcData.steps.map(step => this.prepareStepForTransfer(step)),
      booleans: {...sfcData.booleans}  // Create a copy of booleans
    };
    
    // 3. Convert to JSON string
    return JSON.stringify(optimizedData, null, 2);
  } catch (error) {
    console.error("Error compiling SFC data:", error);
    throw new Error(`Compilation failed: ${error.message}`);
  }
}

/**
 * Prepares a step for transfer by removing circular references
 * and unnecessary properties
 */
private prepareStepForTransfer(step: SfcStep): any {
  if (!step) return null;
  
  // Create a clean step object without circular references
  const cleanStep = {
    uid: step.uid,
    caption: step.caption,
    actions: step.actions.map(action => ({
      codeUid: action.codeUid,
      caption: action.caption,
      targetBoolean: action.targetBoolean,
      qualifier: action.qualifier
    })),
    
    // Handle transitions without circular references
    outgoingTransitions: step.outgoingTransitions.map(trans => ({
      type: trans.type,
      condition: [...trans.condition],
      sourceDone: [...trans.sourceDone],
      
      // For source and target, only include UIDs to avoid circularity
      source: trans.source.map(s => s.uid),
      target: trans.target.map(t => t.uid)
    }))
  };
  
  return cleanStep;
}
  
  // Keep the safeStringify method as a fallback
}