import { Html } from "../utils/common";

export class SfcData {
  public start: SfcStep;
  public steps: SfcStep[] = [];
  public booleans: SfcBooleans;

  constructor(start?: SfcStep, booleans?: SfcBooleans) {
    this.start = start || null;
    this.booleans = booleans || new SfcBooleans();
    if (start) this.steps.push(start);
  }

  public Render(container: HTMLElement, manager?:any): void {
    const stepsGridContainer = Html(container, "div", [], ["steps-grid-container"]);

    if (this.start) {
      this.buildStepsRecursively(stepsGridContainer, [this.start], 0, new Set(),manager);
    }
  }

  private buildStepsRecursively(
    container: HTMLElement,
    steps: SfcStep[],
    level: number,
    visitedSteps: Set<string>,
    manager?:any
  ): void {
    const nextLevelSteps: SfcStep[] = [];

    steps.forEach((step, index) => {
      if (!step || visitedSteps.has(step.uid)) return;
      visitedSteps.add(step.uid);

      const stepElement = step.Render(container,true,true,manager);
      stepElement.style.gridRow = `${level + 1}`;
      stepElement.style.gridColumn = `${index + 1}`;

      if (step.outgoingTransitions && step.outgoingTransitions.length > 0) {
        step.outgoingTransitions.forEach(transition => {
          if (transition.target) {
            transition.target.forEach(targetStep => {
              if (!visitedSteps.has(targetStep.uid)) {
                nextLevelSteps.push(targetStep);
              }
            });
          }
        });
      }
    });

    if (nextLevelSteps.length > 0) {
      this.buildStepsRecursively(container, nextLevelSteps, level + 1, visitedSteps,manager);
    }
  }
}
export class SfcBooleans {
  private booleanValues: Map<string, boolean> = new Map<string, boolean>();

  constructor() {
    // Initialisiere mit Standardwerten
    this.booleanValues.set("redLed", false);
    this.booleanValues.set("yellowLed", false);
    this.booleanValues.set("greenLed", false);

    this.booleanValues.set("merk1", false);
    this.booleanValues.set("merk2", false);
    this.booleanValues.set("merk3", false);
    this.booleanValues.set("merk4", false);
  }

  // Getter und Setter für Map-Zugriff
  public get(key: string): boolean {
    return this.booleanValues.get(key) || false;
  }

  public set(key: string, value: boolean): void {
    this.booleanValues.set(key, value);
  }

  // Für Kompatibilität mit vorhandenem Code
  public getAll(): Record<string, boolean> {
    const result: Record<string, boolean> = {};
    this.booleanValues.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  public Render(container: HTMLElement): void {
    const booleanFieldsContainer = Html(container, "div", [], ["boolean-fields"]);
    Html(booleanFieldsContainer, "h3", [], ["boolean-title"], "Boolean Values");

    // Iteriere über die Map-Einträge
    this.booleanValues.forEach((value, name) => {
      const boolRow = Html(booleanFieldsContainer, "div", [], ["bool-row"]);
      Html(boolRow, "span", [], ["bool-name"], name);

      const selectContainer = Html(boolRow, "div", [], ["bool-value-container"]);
      const select = Html(selectContainer, "select", [], ["bool-value-select"]) as HTMLSelectElement;

      const optionTrue = Html(select, "option", ["value", "true"], [], "true") as HTMLOptionElement;
      const optionFalse = Html(select, "option", ["value", "false"], [], "false") as HTMLOptionElement;

      if (value === true) {
        optionTrue.selected = true;
      } else {
        optionFalse.selected = true;
      }

      select.addEventListener("change", () => {
        const newValue = select.value === "true";
        this.set(name, newValue);
        console.log(`Changed boolean ${name} to ${newValue}`);
      });
    });
  }
}

export class SfcStep {
  public uid: string;
  public caption: string;
  public actions: BaseAction[] = [];
  public outgoingTransitions: BaseTransition[] = [];
  public incomingTransitions: BaseTransition[] = [];

  constructor(uid: string, caption: string) {
    this.uid = uid;
    this.caption = caption;
  }

  public Render(container: HTMLElement, renderActions?: boolean, renderLowerPart?: boolean, manager?:any): HTMLElement {
    const stepContainer = Html(container, "div", [], ["step-container"]);
    this.renderUpperPart(stepContainer, renderActions,manager);
    if (renderLowerPart === undefined || renderLowerPart === true) {
      this.renderLowerPart(stepContainer);
    }
    return stepContainer;
  }

  private renderUpperPart(container: HTMLElement, renderActions?: boolean,manager?:any): void {
    const upperPart = Html(container, "div", [], ["step-upper-part"]);

    const nameArea = Html(upperPart, "div", [], ["step-name"]);
    nameArea.setAttribute("data-step-uid", this.uid);
    Html(nameArea, "span", [], [], this.caption);

    this.addHoverButtonsToStepName(nameArea,manager);

    if (renderActions === undefined || renderActions === true) {
    const bridgeArea = Html(upperPart, "div", [], ["step-bridge"]);
    Html(bridgeArea, "div", [], ["bridge-line"]);


      const actionsArea = Html(upperPart, "div", [], ["step-actions"]);
      this.addHoverButtonToStepActions(actionsArea);
      this.renderActionsTable(actionsArea);
    }


  }

  private renderLowerPart(container: HTMLElement): void {
    const lowerPart = Html(container, "div", [], ["step-lower-part"]);

    if (this.outgoingTransitions.length > 0) {
      this.outgoingTransitions.forEach(transition => {
        transition.Render(lowerPart);
      });
    }
  }

  private renderActionsTable(container: HTMLElement): void {
    const table = Html(container, "table", [], ["actions-table"]);
    const tbody = Html(table, "tbody", [], []);

    if (this.actions.length > 0) {
      this.actions.forEach(action => {
        action.Render(tbody, this);
      });
    }
  }

  private addHoverButtonToStepActions(stepActionsContainer: HTMLElement): void {
    const hoverButton = Html(stepActionsContainer, "button", [], ["hover-button"], "Add Action");
    hoverButton.style.display = "none";

    hoverButton.addEventListener("click", () => {
      const newAction = new ActionN(`A-${Date.now()}`, "New Action", "newBoolean");
      this.actions.push(newAction);

      const tableBody = stepActionsContainer.querySelector('.actions-table tbody');
      if (tableBody) {
        newAction.Render(tableBody as HTMLElement);
      }
    });

    const showButton = () => { hoverButton.style.display = "block"; };
    const hideButton = (event: MouseEvent) => {
      const relatedTarget = event.relatedTarget as HTMLElement;
      if (!stepActionsContainer.contains(relatedTarget) && relatedTarget !== hoverButton) {
        hoverButton.style.display = "none";
      }
    };

    stepActionsContainer.addEventListener("mouseenter", showButton);
    stepActionsContainer.addEventListener("mouseleave", hideButton);
    hoverButton.addEventListener("mouseenter", showButton);
    hoverButton.addEventListener("mouseleave", hideButton);
  }

  private addHoverButtonsToStepName(stepNameDiv: HTMLElement,manager?:any): void {
    stepNameDiv.style.position = "relative";

    const btnTopRight = Html(stepNameDiv, "button", [], ["step-name-btn", "top-right"], "➕");
    btnTopRight.onclick = () => {
      console.log("Neuen Step ÜBER", this.uid, "einfügen");
      //ERGÄNZUNG FÜR NEW STEPS IN SFC
        if (!manager) {
          console.error("Manager is not defined");
          return;
        }
       manager.addStepAbove(this.uid);
       manager.sfcUI.RenderUI();
    };

    const btnBottomRight = Html(stepNameDiv, "button", [], ["step-name-btn", "bottom-right"], "➕");
    btnBottomRight.onclick = () => {
      console.log("Neuen Step UNTER", this.uid, "einfügen");
      //ERGÄNZUNG FÜR NEW STEPS IN SFC
        if (!manager) {
          console.error("Manager is not defined");
          return;
        }
        
        manager.addStepBelow(this.uid);
        manager.sfcUI.RenderUI();
    };

    const btnTopLeft = Html(stepNameDiv, "button", [], ["step-name-btn", "top-left"], "−");
    btnTopLeft.onclick = () => {
      console.log("Step", this.uid, "löschen");
      //ERGÄNZUNG FÜR DELETE STEPS IN SFC
        if (!manager) {
          console.error("Manager is not defined");
          return;
        }	
        manager.deleteStep(this.uid);
        manager.sfcUI.RenderUI();
    };
  }
}

export abstract class BaseAction {
  public codeUid: string;
  public caption: string;
  public targetBoolean: string;
  public abstract qualifier: string;

  constructor(codeUid: string, caption: string, targetBoolean: string) {
    this.codeUid = codeUid;
    this.caption = caption;
    this.targetBoolean = targetBoolean;
  }

  public Render(container: HTMLElement, step?: SfcStep): void {
    const actionRow = Html(container, "tr", [], []);

    // Dropdown für Action-Typen
    const tdType = Html(actionRow, "td", [], []);
    const select = Html(tdType, "select", [], ["action-type-select"]) as HTMLSelectElement;
    const actionTypes = [
      { label: "N", classRef: ActionN },
      { label: "S0", classRef: ActionS0 },
      { label: "L", classRef: ActionL },
      { label: "D", classRef: ActionD },
      { label: "P", classRef: ActionP },
      { label: "SD", classRef: ActionSD }
    ];

    actionTypes.forEach(type => {
      const option = Html(select, "option", ["value", type.label], [], type.label) as HTMLOptionElement;
      if (this.qualifier === type.label) option.selected = true;
    });

    select.addEventListener("change", () => {
      if (this.qualifier === select.value) return;
      // Action im Step ersetzen
      if (step) {
        const idx = step.actions.indexOf(this);
        if (idx >= 0) {
          // Neue Action-Instanz mit gleichem codeUid, caption, targetBoolean
          const newAction = new (actionTypes.find(t => t.label === select.value)!.classRef)(
            this.codeUid,
            this.caption,
            this.targetBoolean
          );
          step.actions[idx] = newAction;
          // Tabelle neu rendern
          const tableBody = container.closest("tbody");
          if (tableBody) {
            tableBody.innerHTML = "";
            step.actions.forEach(a => a.Render(tableBody as HTMLElement, step));
          }
        }
      }
    });

    // Editierbares Feld für Caption (Name)
    const tdCaption = Html(actionRow, "td", [], []);
    const input = Html(tdCaption, "input", ["type", "text"], [], undefined) as HTMLInputElement;
    input.value = this.caption;
    input.style.width = "95%";
    input.addEventListener("change", () => {
      this.caption = input.value;
      // Optional: Tabelle neu rendern, falls du sofortige Aktualisierung willst
      if (step) {
        const tableBody = container.closest("tbody");
        if (tableBody) {
          tableBody.innerHTML = "";
          step.actions.forEach(a => a.Render(tableBody as HTMLElement, step));
        }
      }
    });

    // ...weitere Spalten wie bisher...
  }
}

export class ActionN extends BaseAction {
  public qualifier: string = "N";
}

export class ActionS0 extends BaseAction {
  public qualifier: string = "S0";
}

export class ActionL extends BaseAction {
  public qualifier: string = "L";
}

export class ActionD extends BaseAction {
  public qualifier: string = "D";
}

export class ActionP extends BaseAction {
  public qualifier: string = "P";
}

export class ActionSD extends BaseAction {
  public qualifier: string = "SD";
}

export abstract class BaseTransition {
  public source: SfcStep[] = [];
  public sourceDone: boolean[] = [];
  public target: SfcStep[] = [];
  public condition: string[] = [];

  constructor(source?: SfcStep[], sourceDone?: boolean[], target?: SfcStep[], condition?: string[]) {
    this.source = source || [];
    this.sourceDone = sourceDone || [];
    this.target = target || [];
    this.condition = condition || [];
  }

  public abstract Render(container: HTMLElement): void;
}

export class SimpleTransition extends BaseTransition {
  public type: string = "simple";

  public Render(container: HTMLElement): void {
    const transitionContainer = Html(container, "div", [], ["transition-container"]);

    const conditionDisplay = Html(transitionContainer, "div", [], ["transition-condition"]);
    Html(conditionDisplay, "span", [], [], this.condition.join(" && "));
  }
}