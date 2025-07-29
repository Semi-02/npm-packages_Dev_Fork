import { Html } from "../utils/common";
import { OkCancelDialog } from "../dialog_controller"; // Import hinzufügen
import { SfcUI } from "./SfcUI";
import { SfcManager } from "./SfcManager";

export class SfcData {
  public start: SfcStep;
  public steps: SfcStep[] = [];
  public booleans: SfcBooleans;

  constructor(start?: SfcStep, booleans?: SfcBooleans) {
    this.start = start || null;
    this.booleans = booleans || new SfcBooleans();
    if (start) {
      start.parentSfcData = this;
      this.steps.push(start);
    }
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

  // Hilfsfunktion, um Steps nachträglich die Referenz zu setzen (z.B. nach Deserialisierung)
  public assignParentToAllSteps() {
    this.steps.forEach(step => step.parentSfcData = this);
  }
}
export class SfcBooleans {
  private hardwareBooleans: Map<string, boolean> = new Map<string, boolean>();
  private customBooleans: Map<string, boolean> = new Map<string, boolean>();
  private readonly MAX_NAME_LENGTH = 10; // Maximum allowed characters

  constructor() {  }


  public gethardwareBooleans(): Map<string, boolean> {
    return this.hardwareBooleans;
  }

  public getCustomBooleans(): Map<string, boolean> {
    return this.customBooleans;
  }

  public addHardwareBooleans(key:string, value:boolean): void {
    this.hardwareBooleans.set(key, value);
  }
  public addCustomBooleans(key:string, value:boolean): void {
    this.customBooleans.set(key, value);
  }


  // // Getter und Setter
  // public get(key: string): boolean {
  //   if (this.hardwareBooleans.has(key)) return this.hardwareBooleans.get(key) || false;
  //   if (this.customBooleans.has(key)) return this.customBooleans.get(key) || false;
  //   return false;
  // }

  public set(key: string, value: boolean): void {
    if (this.hardwareBooleans.has(key)) this.hardwareBooleans.set(key, value);
    else if (this.customBooleans.has(key)) this.customBooleans.set(key, value);
  }

  // Für Kompatibilität mit vorhandenem Code
  public getAll(): { hardware: Record<string, boolean>, custom: Record<string, boolean> } {
    const hardware: Record<string, boolean> = {};
    const custom: Record<string, boolean> = {};
    this.hardwareBooleans.forEach((value, key) => { hardware[key] = value; });
    this.customBooleans.forEach((value, key) => { custom[key] = value; });
    return { hardware, custom };
  }

  public Render(container: HTMLElement, manager?: SfcManager): void {
    const booleanFieldsContainer = Html(container, "div", [], ["boolean-fields"]);

    // Hardware-Bereich
    Html(booleanFieldsContainer, "h3", [], ["boolean-title"], "Hardware Booleans");
    this.hardwareBooleans.forEach((value, name) => {
      const boolRow = Html(booleanFieldsContainer, "div", [], ["bool-row"]);
      Html(boolRow, "span", [], ["bool-name"], name);

      const selectContainer = Html(boolRow, "div", [], ["bool-value-container"]);
      const select = Html(selectContainer, "select", [], ["bool-value-select"]) as HTMLSelectElement;

      const optionTrue = Html(select, "option", ["value", "true"], [], "true") as HTMLOptionElement;
      const optionFalse = Html(select, "option", ["value", "false"], [], "false") as HTMLOptionElement;

      if (value === true) optionTrue.selected = true;
      else optionFalse.selected = true;

      select.addEventListener("change", () => {
        const newValue = select.value === "true";
        this.set(name, newValue);
        console.log(`Changed hardware boolean ${name} to ${newValue}`);
      });
    });

    // Custom-Bereich
    Html(booleanFieldsContainer, "h3", [], ["boolean-title"], "Custom Booleans");

    // Add button to create a new custom boolean
    defineNewCustomBooleanButton(this, booleanFieldsContainer);

    this.customBooleans.forEach((value, name) => {
      const boolRow = Html(booleanFieldsContainer, "div", [], ["bool-row"]);
      // Editable name
      const nameSpan = Html(boolRow, "span", [], ["bool-name", "editable-field-hover"], name) as HTMLSpanElement;
      nameSpan.contentEditable = "true";
      nameSpan.title = `Klicken zum Bearbeiten (max. ${this.MAX_NAME_LENGTH} Zeichen)`;
      
      nameSpan.addEventListener("blur", () => {
        const newName = nameSpan.innerText.trim();
        
        // Check if name exceeds maximum length
        if (newName.length > this.MAX_NAME_LENGTH) {
          // Use the public method instead of accessing private property
          manager.showSnackbar(2, `Name zu lang! Maximal ${this.MAX_NAME_LENGTH} Zeichen erlaubt.`);
          nameSpan.innerText = name; // revert to original
          return;
        }
        
        // Proceed with normal validation
        if (newName && newName !== name && !this.customBooleans.has(newName)) {
          const currentValue = this.customBooleans.get(name);
          this.customBooleans.delete(name);
          this.customBooleans.set(newName, currentValue);
          // Re-render to update UI
          manager.sfcUI.RenderUI();
        } else if (newName !== name) {
          // Name already exists or is invalid
          nameSpan.innerText = name; // revert to original
        }
      });

      // Delete button
      const deleteBtn = Html(boolRow, "button", [], ["bool-delete-btn"], "✕") as HTMLButtonElement;
      deleteBtn.title = "Delete Boolean";
      deleteBtn.style.marginLeft = "8px";
      deleteBtn.onclick = () => {
        this.customBooleans.delete(name);
        boolRow.remove();
         // Re-render to update UI
        manager.sfcUI.RenderUI();
      };

      const selectContainer = Html(boolRow, "div", [], ["bool-value-container"]);
      const select = Html(selectContainer, "select", [], ["bool-value-select"]) as HTMLSelectElement;

      const optionTrue = Html(select, "option", ["value", "true"], [], "true") as HTMLOptionElement;
      const optionFalse = Html(select, "option", ["value", "false"], [], "false") as HTMLOptionElement;

      if (value === true) optionTrue.selected = true;
      else optionFalse.selected = true;

      select.addEventListener("change", () => {
        const newValue = select.value === "true";
        this.set(nameSpan.innerText.trim(), newValue);
        // No re-render needed for value change
      });
    });

    function defineNewCustomBooleanButton(self: SfcBooleans, container: HTMLElement) {
      const addBtn = Html(container, "button", [], ["bool-add-btn"], "+ Neuer Custom Boolean") as HTMLButtonElement;
      addBtn.style.margin = "8px 0";
      addBtn.onclick = () => {
        let baseName = "customBool";
        let idx = 1;
        let newName = baseName + idx;
        while (self.customBooleans.has(newName)) {
          idx++;
          newName = baseName + idx;
        }
        self.customBooleans.set(newName, false);
         // Re-render to update UI
          manager.sfcUI.RenderUI();
      };
    }
  }

  public static getAllBooleanKeys(booleans: SfcBooleans): string[] {
    return [
      ...Array.from(booleans.gethardwareBooleans().keys()),
      ...Array.from(booleans.getCustomBooleans().keys())
    ];
  }
}

export class SfcStep {
  public uid: string;
  public caption: string;
  public actions: BaseAction[] = [];
  public outgoingTransitions: BaseTransition[] = [];
  public incomingTransitions: BaseTransition[] = [];
  public parentSfcData: SfcData;

  constructor(uid: string, caption: string, parentSfcData?: SfcData) {
    this.uid = uid;
    this.caption = caption;
    this.parentSfcData = parentSfcData;
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

    // Mach das Step-Name-Span editierbar
    const nameSpan = Html(nameArea, "span", [], ["editable-field-hover"], this.caption) as HTMLSpanElement;
    nameSpan.contentEditable = "true";
    nameSpan.style.outline = "none";
    nameSpan.title = "Klicken zum Bearbeiten";

    // Speichern bei Verlassen des Feldes oder Enter
    const saveCaption = () => {
      const newCaption = nameSpan.innerText.trim();
      if (newCaption !== this.caption) {
        this.caption = newCaption;
        // Optional: Manager/UI benachrichtigen
        if (manager && typeof manager.notifyChange === "function") {
          manager.notifyChange();
        }
      }
    };
    nameSpan.addEventListener("blur", saveCaption);
    nameSpan.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        nameSpan.blur();
      }
    });

    this.addHoverButtonsToStepName(nameArea,manager);

    if (renderActions === undefined || renderActions === true) {
      const bridgeArea = Html(upperPart, "div", [], ["step-bridge"]);
      Html(bridgeArea, "div", [], ["bridge-line"]);

      const actionsArea = Html(upperPart, "div", [], ["step-actions"]);
      this.addHoverButtonToStepActions(actionsArea,manager);
      this.renderActionsTable(actionsArea,manager);
    }
  }

  private renderLowerPart(container: HTMLElement): void {
    const lowerPart = Html(container, "div", [], ["step-lower-part"]);
    const columns = Html(lowerPart, "div", [], ["step-lower-columns"]);
    const lineCol = Html(columns, "div", [], ["step-lower-line-col"]);
    Html(lineCol, "div", [], ["step-lower-vertical-line"]);
    const transCol = Html(columns, "div", [], ["step-lower-trans-col"]);
    if (this.outgoingTransitions.length > 0) {
      this.outgoingTransitions.forEach((transition, idx) => {
        const condDiv = Html(transCol, "div", [], ["transition-condition", "editable-field-hover"]) as HTMLDivElement;
        condDiv.contentEditable = "true";
        condDiv.innerText = transition.condition.join(" && ");
        condDiv.title = "Erlaubte Struktur: Variablen, !, &&, ||, (, ) (z.B. a && (b || !c))";

        // Regex für gültige SFC-Bedingungen
        const sfcConditionRegex = /^[a-zA-Z_][a-zA-Z0-9_]*\s*(==|!=|<=|>=|<|>)\s*(true|false|[a-zA-Z_][a-zA-Z0-9_]*|\d+)(\s*(&&|\|\|)\s*[a-zA-Z_][a-zA-Z0-9_]*\s*(==|!=|<=|>=|<|>)\s*(true|false|[a-zA-Z_][a-zA-Z0-9_]*|\d+))*\s*$/;

        // Validierung und Speichern
        const saveCondition = () => {
          const value = condDiv.innerText.trim();
          if (!sfcConditionRegex.test(value)) {
            condDiv.style.background = "#ffe0e0";
            condDiv.title = "Erlaubt: <Variable> <Vergleich> <Wert> [&&/|| ...] (z.B. redTimer == true)";
            return;
          } else {
            condDiv.style.background = "";
            condDiv.title = "Erlaubte Struktur: <Variable> <Vergleich> <Wert> [&&/|| ...]";
          }
          const newConds = value.split("&&").map(s => s.trim()).filter(Boolean);
          transition.condition = newConds;
        };

        condDiv.addEventListener("blur", saveCondition);
        condDiv.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            condDiv.blur();
          }
        });
      });
    }
  }

  private renderActionsTable(container: HTMLElement, manager?:any): void {
    const table = Html(container, "table", [], ["actions-table"]);
    
    // Legenden-Zeile einfügen (Dauer jetzt hinter Typ, Name danach)
    const thead = Html(table, "thead", [], []);
    const legendRow = Html(thead, "tr", [], []);
    Html(legendRow, "th", [], [], "Einfügen");
    Html(legendRow, "th", [], [], "Typ");
    Html(legendRow, "th", [], [], "Dauer (ms)");
    Html(legendRow, "th", [], [], "Name");
    Html(legendRow, "th", [], [], "Ziel-Boolean");
    Html(legendRow, "th", [], [], "Löschen");

    const tbody = Html(table, "tbody", [], []);

    if (this.actions.length > 0) {
      this.actions.forEach(action => {
        action.Render(tbody, this, manager);
      });
    }
  }

  private addHoverButtonToStepActions(stepActionsContainer: HTMLElement,manager?:any ): void {
    const hoverButton = Html(stepActionsContainer, "button", [], ["hover-button"], "➕");
    hoverButton.style.display = "none";

    hoverButton.addEventListener("click", () => {
      const newAction = new ActionN(`A-${Date.now()}`, "New Action", "newBoolean");
      this.actions.push(newAction);

      // Statt nur die neue Action zu rendern, die ganze Tabelle neu rendern:
      const tableBody = stepActionsContainer.querySelector('.actions-table tbody');
      if (tableBody) {
        tableBody.innerHTML = "";
        this.actions.forEach(a => a.Render(tableBody as HTMLElement, this, manager));
      }
      // Optional: Manager/UI benachrichtigen
      if (manager && typeof manager.notifyChange === "function") {
        manager.notifyChange();
      }
    });

    const showButton = () => { hoverButton.style.display = "flex"; };
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

    const btnTopLeft = Html(stepNameDiv, "button", [], ["step-name-btn", "top-left"], "✕");
    btnTopLeft.onclick = () => {
      // Sicherheitsabfrage vor dem Löschen
      if (!manager) {
        console.error("Manager is not defined");
        return;
      }
      // OkCancelDialog statt window.confirm
      const dialog = new OkCancelDialog(
        2, // Severity.WARN (2)
        "Sind Sie sicher, dass Sie diesen Step löschen möchten?",
        (ok) => {
          if (ok) {
            console.log("Step", this.uid, "löschen");
            manager.deleteStep(this.uid);
            manager.sfcUI.RenderUI();
          }
        }
      );
      if (manager.appManagement && typeof manager.appManagement.ShowDialog === "function") {
        manager.appManagement.ShowDialog(dialog);
      } else if (window && (window as any).appController && typeof (window as any).appController.ShowDialog === "function") {
        (window as any).appController.ShowDialog(dialog);
      }
    };
  }
}

export abstract class BaseAction {
  public codeUid: string;
  public caption: string;
  public targetBoolean: string;
  public durationMs: number; // <--- NEU
  public abstract qualifier: string;

  constructor(codeUid: string, caption: string, targetBoolean: string, durationMs: number = 0) {
    this.codeUid = codeUid;
    this.caption = caption;
    this.targetBoolean = targetBoolean;
    this.durationMs = durationMs; // <--- NEU
  }

  public Render(container: HTMLElement, step?: SfcStep, manager?: any): void {
    const actionRow = Html(container, "tr", [], []);

    // Einfügen-Button
    const tdInsert = Html(actionRow, "td", [], []);
    const insertBtn = Html(tdInsert, "button", [], ["action-insert-btn"], "+");
    insertBtn.title = "Neue Aktion unterhalb einfügen";
    insertBtn.style.background = "#27ae60";
    insertBtn.style.color = "#fff";
    insertBtn.style.border = "none";
    insertBtn.style.borderRadius = "50%";
    insertBtn.style.width = "20px";
    insertBtn.style.height = "20px";
    insertBtn.style.cursor = "pointer";
    insertBtn.style.marginRight = "4px";
    insertBtn.style.opacity = "0.8";
    insertBtn.style.fontWeight = "bold";
    insertBtn.onmouseenter = () => insertBtn.style.opacity = "1";
    insertBtn.onmouseleave = () => insertBtn.style.opacity = "0.8";

    insertBtn.onclick = () => {
      if (!step) return;
      const idx = step.actions.indexOf(this);
      if (idx >= 0) {
        const newAction = new ActionN(`A-${Date.now()}`, "New Action", "newBoolean");
        step.actions.splice(idx + 1, 0, newAction);
        // Tabelle neu rendern
        const tableBody = container.closest("tbody");
        if (tableBody) {
          tableBody.innerHTML = "";
          step.actions.forEach(a => a.Render(tableBody as HTMLElement, step, manager));
        }
        if (manager && typeof manager.notifyChange === "function") {
          manager.notifyChange();
        }
      }
    };

    // Dropdown für Action-Typen
    const tdType = Html(actionRow, "td", [], []);
    const select = Html(tdType, "select", [], ["action-type-select"]) as HTMLSelectElement;
    // Qualifier-Auswahl nach CODESYS-Standard
    const actionTypes = [
      { label: "N", classRef: ActionN },   // Non-stored
      { label: "R", classRef: ActionR },   // overriding Reset
      { label: "S", classRef: ActionS },   // Set (Stored)
      { label: "L", classRef: ActionL },   // time Limited
      { label: "D", classRef: ActionD },   // time Delayed
      { label: "P", classRef: ActionP },   // Pulse
      { label: "SD", classRef: ActionSD }, // Stored and time Delayed
      { label: "DS", classRef: ActionDS }, // Delayed and Stored
      { label: "SL", classRef: ActionSL }, // Stored and time limited
    ];

    actionTypes.forEach(type => {
      const option = Html(select, "option", ["value", type.label], [], type.label) as HTMLOptionElement;
      if (this.qualifier === type.label) option.selected = true;
    });

    // Dauer (ms) Feld (jetzt direkt nach Typ)
    const tdDuration = Html(actionRow, "td", [], []);
    const inputDuration = Html(tdDuration, "input", ["type", "number"], [], undefined) as HTMLInputElement;
    inputDuration.value = this.durationMs.toString();
    inputDuration.min = "0";
    inputDuration.placeholder = "ms";
    inputDuration.style.width = "70px";
    inputDuration.addEventListener("change", () => {
      this.durationMs = parseInt(inputDuration.value) || 0;
    });

    // Sichtbarkeit je nach Qualifier:
    const timeQualifiers = ["L", "D", "SD", "DS", "SL"];
    if (!timeQualifiers.includes(this.qualifier)) {
      inputDuration.disabled = true;
    } else {
      inputDuration.disabled=false;
    }

    // Name-Feld (jetzt nach Dauer)
    const tdCaption = Html(actionRow, "td", [], []);
    const input = Html(tdCaption, "input", ["type", "text"], ["editable-field-hover"], undefined) as HTMLInputElement;
    input.value = this.caption;
    input.style.width = "95%";

    // Ziel-Boolean Dropdown
    const tdTarget = Html(actionRow, "td", [], []);
    const selectTarget = Html(tdTarget, "select", [], ["target-boolean-select"]) as HTMLSelectElement;


    //TODO: Eine methode um die booleans auszulesen:
      let booleanKeys: string[] = [];
        if (step && (step as any).parentSfcData && (step as any).parentSfcData.booleans) {
      booleanKeys = SfcBooleans.getAllBooleanKeys((step as any).parentSfcData.booleans);
    }
    console.log("Available booleans:", booleanKeys);

    booleanKeys.forEach(key => {
      const option = Html(selectTarget, "option", ["value", key], [], key) as HTMLOptionElement;
      if (this.targetBoolean === key) option.selected = true;
    });

    selectTarget.addEventListener("change", () => {
      this.targetBoolean = selectTarget.value;
    });

    // Typwechsel-Handler
    select.addEventListener("change", () => {
      if (this.qualifier === select.value) return;
      if (step) {
        const idx = step.actions.indexOf(this);
        if (idx >= 0) {
          // Aktuelle Werte übernehmen
          const newCaption = input.value;
          const newTarget = selectTarget.value;
          // Neue Action-Instanz mit aktuellem Typ
          const newAction = new (actionTypes.find(t => t.label === select.value)!.classRef)(
            this.codeUid,
            newCaption,
            newTarget
          );
          step.actions[idx] = newAction;


            // Umschalten der Sichtbarkeit von Dauer (ms)
      const timeQualifiers = ["L", "D", "SD", "DS", "SL"];
      if (!timeQualifiers.includes(select.value)) {
        inputDuration.disabled= true;
      } else {
        inputDuration.disabled=false;
      }

          // Tabelle neu rendern
          const tableBody = container.closest("tbody");
          if (tableBody) {
            tableBody.innerHTML = "";
            step.actions.forEach(a => a.Render(tableBody as HTMLElement, step));
          }
             // Notify manager/UI about the change
          if (manager && typeof manager.notifyChange === "function") {
            manager.notifyChange();
          }
        }
      }
    });

    // Caption-Handler
    input.addEventListener("change", () => {
      this.caption = input.value;
    });

    // Löschen-Button
    const tdDelete = Html(actionRow, "td", [], []);
    const deleteBtn = Html(tdDelete, "button", [], ["action-delete-btn"], "✕");
    deleteBtn.title = "Diese Aktion löschen";

    deleteBtn.onclick = () => {
      if (!step) return;
      const dialog = new OkCancelDialog(
      2, // Severity.WARN (2)
      "Sind Sie sicher, dass Sie diese Aktion löschen möchten?",
      (ok) => {
        if (ok) {
        const idx = step.actions.indexOf(this);
        if (idx >= 0) {
          step.actions.splice(idx, 1);
          // Tabelle neu rendern
          const tableBody = container.closest("tbody");
          if (tableBody) {
          tableBody.innerHTML = "";
          step.actions.forEach(a => a.Render(tableBody as HTMLElement, step, manager));
          }
          // Optional: UI neu rendern
          if (manager && typeof manager.notifyChange === "function") {
          manager.notifyChange();
          }
        }
        }
      }
      );
      if (manager && manager.appManagement && typeof manager.appManagement.ShowDialog === "function") {
      manager.appManagement.ShowDialog(dialog);
      } else if (window && (window as any).appController && typeof (window as any).appController.ShowDialog === "function") {
      (window as any).appController.ShowDialog(dialog);
      }
    };
}
  }



export class ActionN extends BaseAction {
  public qualifier: string = "N";
  constructor(codeUid: string, caption: string, targetBoolean: string, durationMs: number = 0) {
    super(codeUid, caption, targetBoolean, durationMs);
  }
}
export class ActionR extends BaseAction {
  public qualifier: string = "R";
  constructor(codeUid: string, caption: string, targetBoolean: string, durationMs: number = 0) {
    super(codeUid, caption, targetBoolean, durationMs);
  }
}
export class ActionS extends BaseAction {
  public qualifier: string = "S";
  constructor(codeUid: string, caption: string, targetBoolean: string, durationMs: number = 0) {
    super(codeUid, caption, targetBoolean, durationMs);
  }
}
export class ActionL extends BaseAction {
  public qualifier: string = "L";
  constructor(codeUid: string, caption: string, targetBoolean: string, durationMs: number = 0) {
    super(codeUid, caption, targetBoolean, durationMs);
  }
}
export class ActionD extends BaseAction {
  public qualifier: string = "D";
  constructor(codeUid: string, caption: string, targetBoolean: string, durationMs: number = 0) {
    super(codeUid, caption, targetBoolean, durationMs);
  }
}
export class ActionP extends BaseAction {
  public qualifier: string = "P";
  constructor(codeUid: string, caption: string, targetBoolean: string, durationMs: number = 0) {
    super(codeUid, caption, targetBoolean, durationMs);
  }
}
export class ActionSD extends BaseAction {
  public qualifier: string = "SD";
  constructor(codeUid: string, caption: string, targetBoolean: string, durationMs: number = 0) {
    super(codeUid, caption, targetBoolean, durationMs);
  }
}
export class ActionDS extends BaseAction {
  public qualifier: string = "DS";
  constructor(codeUid: string, caption: string, targetBoolean: string, durationMs: number = 0) {
    super(codeUid, caption, targetBoolean, durationMs);
  }
}
export class ActionSL extends BaseAction {
  public qualifier: string = "SL";
  constructor(codeUid: string, caption: string, targetBoolean: string, durationMs: number = 0) {
    super(codeUid, caption, targetBoolean, durationMs);
  }
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