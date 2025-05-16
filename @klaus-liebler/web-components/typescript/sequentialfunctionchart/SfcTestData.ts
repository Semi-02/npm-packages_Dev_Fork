import { SfcData, SfcStep, TransitionSimple, ActionN, ActionS0, ActionL, ActionD, ActionP, ActionSD } from "./SfcData";


export class SfcTestDataProvider {

  public static getBasicSfcData(): SfcData {
    // Create steps with specified number of actions
    const step1 = this.createStep("step1", "Initial Step", [
      this.createActionS0("act1_1", "Set Red LED", "redLed"),
      this.createActionN("act1_2", "Reset Yellow LED", "yellowLed")
    ]);
    
    const step2 = this.createStep("step2", "Process Step", [
      this.createActionL("act2_1", "Latch Green LED", "greenLed"),
      this.createActionD("act2_2", "Delayed Red LED", "redLed"),
      this.createActionP("act2_3", "Pulse Yellow LED", "yellowLed"),
      this.createActionSD("act2_4", "Store Merk1", "merk1"),
      this.createActionN("act2_5", "Reset Merk2", "merk2")
    ]);
    
    const step3 = this.createStep("step3", "Verification Step", [
      this.createActionS0("act3_1", "Set Green LED", "greenLed"),
      this.createActionN("act3_2", "Reset Red LED", "redLed"),
      this.createActionL("act3_3", "Latch Yellow LED", "yellowLed"),
      this.createActionD("act3_4", "Delayed Merk2", "merk2"),
      this.createActionP("act3_5", "Pulse Merk3", "merk3"),
      this.createActionSD("act3_6", "Store Merk4", "merk4")
    ]);
    
    const step4 = this.createStep("step4", "Output Step", [
      this.createActionS0("act4_1", "Set Yellow LED", "yellowLed"),
      this.createActionN("act4_2", "Reset Green LED", "greenLed"),
      this.createActionL("act4_3", "Latch Merk4", "merk4")
    ]);
    
    const step5 = this.createStep("step5", "Final Step", [
      this.createActionP("act5_1", "Pulse Red LED", "redLed")
    ]);
    
    // Create transitions between steps
    const transition1 = this.createSimpleTransition(
      [step1], [true], [step2], ["merk1 == true"]
    );
    
    const transition2 = this.createSimpleTransition(
      [step2], [true], [step3], ["merk2 == true"]
    );
    
    const transition3 = this.createSimpleTransition(
      [step3], [true], [step4], ["merk3 == true"]
    );
    
    const transition4 = this.createSimpleTransition(
      [step4], [true], [step5], ["merk4 == true"]
    );
    
    // Connect steps with transitions
    step1.outgoingTransitions.push(transition1);
    
    if (!step2.incomingTransitions) step2.incomingTransitions = [];
    step2.incomingTransitions.push(transition1);
    step2.outgoingTransitions.push(transition2);
    
    if (!step3.incomingTransitions) step3.incomingTransitions = [];
    step3.incomingTransitions.push(transition2);
    step3.outgoingTransitions.push(transition3);
    
    if (!step4.incomingTransitions) step4.incomingTransitions = [];
    step4.incomingTransitions.push(transition3);
    step4.outgoingTransitions.push(transition4);
    
    if (!step5.incomingTransitions) step5.incomingTransitions = [];
    step5.incomingTransitions.push(transition4);
    

    return {
      start: step1,
      steps: [step1, step2, step3, step4, step5],
      booleans: {
        redLed: false,
        yellowLed: false,
        greenLed: false,
        merk1: false,
        merk2: false,
        merk3: false,
        merk4: false
      }
    };
  }

  // Helper methods for creating SFC elements

  private static createStep(uid: string, caption: string, actions: any[]): SfcStep {
    return {
      uid,
      caption,
      actions,
      outgoingTransitions: []
    };
  }

  private static createSimpleTransition(
    source: SfcStep[], 
    sourceDone: boolean[], 
    target: SfcStep[], 
    condition: string[]
  ): TransitionSimple {
    return {
      type: "simple",
      source,
      sourceDone,
      target,
      condition
    };
  }

  // Action creation helpers
  
  private static createActionN(codeUid: string, caption: string, targetBoolean: string): ActionN {
    return {
      codeUid,
      caption,
      targetBoolean,
      qualifier: "N"
    };
  }

  private static createActionS0(codeUid: string, caption: string, targetBoolean: string): ActionS0 {
    return {
      codeUid,
      caption,
      targetBoolean,
      qualifier: "S0"
    };
  }

  private static createActionL(codeUid: string, caption: string, targetBoolean: string): ActionL {
    return {
      codeUid,
      caption,
      targetBoolean,
      qualifier: "L"
    };
  }

  private static createActionD(codeUid: string, caption: string, targetBoolean: string): ActionD {
    return {
      codeUid,
      caption,
      targetBoolean,
      qualifier: "D"
    };
  }

  private static createActionP(codeUid: string, caption: string, targetBoolean: string): ActionP {
    return {
      codeUid,
      caption,
      targetBoolean,
      qualifier: "P"
    };
  }

  private static createActionSD(codeUid: string, caption: string, targetBoolean: string): ActionSD {
    return {
      codeUid,
      caption,
      targetBoolean,
      qualifier: "SD"
    };
  }
}