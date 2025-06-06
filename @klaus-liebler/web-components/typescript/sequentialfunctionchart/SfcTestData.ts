import { 
  SfcData, 
  SfcStep, 
  SimpleTransition, 
  ActionN, 
  ActionS0, 
  ActionL, 
  ActionD, 
  ActionP, 
  ActionSD,
  SfcBooleans
} from "./SfcData";

export class SfcTestDataProvider {
  public static getBasicSfcData(): SfcData {
    // Erstelle Booleans
    const booleans = new SfcBooleans();
    
    // Erstelle Steps mit den spezifizierten Aktionen
    const step1 = new SfcStep("step1", "Initial Step");
    step1.actions.push(new ActionS0("act1_1", "Set Red LED", "redLed"));
    step1.actions.push(new ActionN("act1_2", "Reset Yellow LED", "yellowLed"));
    
    const step2 = new SfcStep("step2", "Process Step");
    step2.actions.push(new ActionL("act2_1", "Latch Green LED", "greenLed"));
    step2.actions.push(new ActionD("act2_2", "Delayed Red LED", "redLed"));
    step2.actions.push(new ActionP("act2_3", "Pulse Yellow LED", "yellowLed"));
    step2.actions.push(new ActionSD("act2_4", "Store Merk1", "merk1"));
    step2.actions.push(new ActionN("act2_5", "Reset Merk2", "merk2"));
    
    const step3 = new SfcStep("step3", "Verification Step");
    step3.actions.push(new ActionS0("act3_1", "Set Green LED", "greenLed"));
    step3.actions.push(new ActionN("act3_2", "Reset Red LED", "redLed"));
    step3.actions.push(new ActionL("act3_3", "Latch Yellow LED", "yellowLed"));
    step3.actions.push(new ActionD("act3_4", "Delayed Merk2", "merk2"));
    step3.actions.push(new ActionP("act3_5", "Pulse Merk3", "merk3"));
    step3.actions.push(new ActionSD("act3_6", "Store Merk4", "merk4"));
    
    const step4 = new SfcStep("step4", "Output Step");
    step4.actions.push(new ActionS0("act4_1", "Set Yellow LED", "yellowLed"));
    step4.actions.push(new ActionN("act4_2", "Reset Green LED", "greenLed"));
    step4.actions.push(new ActionL("act4_3", "Latch Merk4", "merk4"));
    
    const step5 = new SfcStep("step5", "Final Step");
    step5.actions.push(new ActionP("act5_1", "Pulse Red LED", "redLed"));
    
    // Erstelle Transitionen zwischen den Steps
    const transition1 = new SimpleTransition(
      [step1], [true], [step2], ["merk1 == true"]
    );
    
    const transition2 = new SimpleTransition(
      [step2], [true], [step3], ["merk2 == true"]
    );
    
    const transition3 = new SimpleTransition(
      [step3], [true], [step4], ["merk3 == true"]
    );
    
    const transition4 = new SimpleTransition(
      [step4], [true], [step5], ["merk4 == true"]
    );
    
    // Verbinde Steps mit Transitionen
    step1.outgoingTransitions.push(transition1);
    
    step2.incomingTransitions.push(transition1);
    step2.outgoingTransitions.push(transition2);
    
    step3.incomingTransitions.push(transition2);
    step3.outgoingTransitions.push(transition3);
    
    step4.incomingTransitions.push(transition3);
    step4.outgoingTransitions.push(transition4);
    
    step5.incomingTransitions.push(transition4);
    
    // Erstelle und gib SfcData zurück
    const sfcData = new SfcData(step1, booleans);
    sfcData.steps = [step1, step2, step3, step4, step5];
    
    return sfcData;
  }


  public static getTrafficLightSfcData(): SfcData {
    // Erstelle Booleans für Ampel und Timer
    const booleans = new SfcBooleans();
    
    // Ampelzustände
    const redStep = new SfcStep("step1", "Rot Phase");
    redStep.actions.push(new ActionS0("act1_1", "Rot einschalten", "redLight"));
    redStep.actions.push(new ActionN("act1_2", "Gelb ausschalten", "yellowLight"));
    redStep.actions.push(new ActionN("act1_3", "Grün ausschalten", "greenLight"));
    redStep.actions.push(new ActionSD("act1_4", "Timer starten", "redTimer"));
    
    const redYellowStep = new SfcStep("step2", "Rot-Gelb Phase");
    redYellowStep.actions.push(new ActionS0("act2_1", "Rot einschalten", "redLight"));
    redYellowStep.actions.push(new ActionS0("act2_2", "Gelb einschalten", "yellowLight"));
    redYellowStep.actions.push(new ActionN("act2_3", "Grün ausschalten", "greenLight"));
    redYellowStep.actions.push(new ActionSD("act2_4", "Timer starten", "redYellowTimer"));
    
    const greenStep = new SfcStep("step3", "Grün Phase");
    greenStep.actions.push(new ActionN("act3_1", "Rot ausschalten", "redLight"));
    greenStep.actions.push(new ActionN("act3_2", "Gelb ausschalten", "yellowLight"));
    greenStep.actions.push(new ActionS0("act3_3", "Grün einschalten", "greenLight"));
    greenStep.actions.push(new ActionSD("act3_4", "Timer starten", "greenTimer"));
    
    const yellowStep = new SfcStep("step4", "Gelb Phase");
    yellowStep.actions.push(new ActionN("act4_1", "Rot ausschalten", "redLight"));
    yellowStep.actions.push(new ActionS0("act4_2", "Gelb einschalten", "yellowLight"));
    yellowStep.actions.push(new ActionN("act4_3", "Grün ausschalten", "greenLight"));
    yellowStep.actions.push(new ActionSD("act4_4", "Timer starten", "yellowTimer"));
    
    // Transitionen zwischen den Steps
    const redToRedYellow = new SimpleTransition(
      [redStep], [true], [redYellowStep], ["redTimer == true"]
    );
    
    const redYellowToGreen = new SimpleTransition(
      [redYellowStep], [true], [greenStep], ["redYellowTimer == true"]
    );
    
    const greenToYellow = new SimpleTransition(
      [greenStep], [true], [yellowStep], ["greenTimer == true"]
    );
    
    const yellowToRed = new SimpleTransition(
      [yellowStep], [true], [redStep], ["yellowTimer == true"]
    );
    
    // Verbinde Steps mit Transitionen
    redStep.outgoingTransitions.push(redToRedYellow);
    
    redYellowStep.incomingTransitions.push(redToRedYellow);
    redYellowStep.outgoingTransitions.push(redYellowToGreen);
    
    greenStep.incomingTransitions.push(redYellowToGreen);
    greenStep.outgoingTransitions.push(greenToYellow);
    
    yellowStep.incomingTransitions.push(greenToYellow);
    yellowStep.outgoingTransitions.push(yellowToRed);
    
    redStep.incomingTransitions.push(yellowToRed);
    
    // Erstelle und gib SfcData zurück
    const sfcData = new SfcData(redStep, booleans);
    sfcData.steps = [redStep, redYellowStep, greenStep, yellowStep];
    
    return sfcData;
  }
}