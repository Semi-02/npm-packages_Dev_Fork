import { KeyValueTuple, Location2D, StringNumberTuple } from "@klaus-liebler/commons";

export function EventCoordinatesInSVG(evt: MouseEvent, element: Element, positionRatio: number = 1): Location2D {
    let rect = element.getBoundingClientRect();
    return { x: (evt.clientX - rect.left) / positionRatio, y: (evt.clientY - rect.top) / positionRatio }
}


export const SVGNS = "http://www.w3.org/2000/svg";
export const XLINKNS = "http://www.w3.org/1999/xlink";
export const HTMLNS = "http://www.w3.org/1999/xhtml";

export function Svg(parent: Element, type: string, attributes: string[], classes?: string[]): SVGElement {
    return parent.appendChild(<SVGElement>Elem(SVGNS, type, attributes, classes));
}

//<svg class="icon icon-wastebasket"><use xlink:href="#icon-wastebasket"></use></svg>
export function SvgIcon(parent: Element, iconname: string): SVGSVGElement {
    let svg = <SVGSVGElement>Svg(parent, "svg", [], ["icon", "icon-" + iconname]);
    let use = Svg(svg, "use", [], []);
    use.setAttributeNS(XLINKNS, "href", "#icon-" + iconname);
    parent.appendChild(svg);
    return svg;
}

export function ColorNumColor2ColorDomString(num: number): string {
    num = num >> 8; //as format is RGBA
    let str = num.toString(16);
    while (str.length < 6) str = "0" + num;
    return "#" + str;
}

export function ColorDomString2ColorNum(colorString: string): number {
    return parseInt(colorString.substring(1), 16);
}

// export function Html(parent: Element, type:string,  attributes:string[], classes?: string[], textContent?:string):HTMLElement {
//     return parent.appendChild(<HTMLElement>Elem(HTMLNS, type, attributes, classes, textContent));
// }

export function Html(
    parent: Element,
    type: string,
    attributes: string[],
    classes?: string[],
    textContent?: string,
    styles?: { [key: string]: string }
): HTMLElement {
    const element = <HTMLElement>Elem(HTMLNS, type, attributes, classes, textContent);
    if (styles) {
        for (const [key, value] of Object.entries(styles)) {
            element.style[key as any] = value;
        }
    }
    return parent.appendChild(element);
}

export function HtmlAsFirstChild(parent: Element, type: string, attributes: string[], classes?: string[], textContent?: string): HTMLElement {
    if (parent.firstChild)
        return parent.insertBefore(<HTMLElement>Elem(HTMLNS, type, attributes, classes, textContent), parent.firstChild);
    else
        return parent.appendChild(<HTMLElement>Elem(HTMLNS, type, attributes, classes, textContent));
}

export function Elem(ns: string, type: string, attributes: string[], classes?: string[], textContent?: string): Element {
    let element = document.createElementNS(ns, type);
    if (classes) {
        for (const clazz of classes) {
            element.classList.add(clazz);
        }
    }
    let i: number;
    for (i = 0; i < attributes.length; i += 2) {
        element.setAttribute(attributes[i], attributes[i + 1]);
    }
    if (textContent) {
        element.textContent = textContent;
    }
    return element;
}

export function InputIntegerNumber(table: HTMLTableSectionElement, min: number, max: number, key: string, cfg: KeyValueTuple[] | null): HTMLInputElement {
    let value: number = 0;
    if (cfg != null) {
        for (const e of cfg) {
            if (e.key == key && !isNaN(e.value)) {
                value = e.value;
                break;
            }
        }
    }
    let tr = Html(table, "tr", [], ["develop-propertygrid-tr"]);
    Html(tr, "td", [], ["develop-propertygrid-td"], key);
    let inputContainer = Html(tr, "td", [], ["develop-propertygrid-td"]);
    return <HTMLInputElement>Html(inputContainer, "input", ["type", "number", "step", "1", "min", "" + Math.round(min), "max", "" + Math.round(max), "value", "" + Math.round(value),]);
}

export function InputFloatNumber(table: HTMLTableSectionElement, key: string, cfg: KeyValueTuple[] | null): HTMLInputElement {
    let value: number = 0;
    if (cfg != null) {
        for (const e of cfg) {
            if (e.key == key && !isNaN(e.value)) {
                value = e.value;
                break;
            }
        }
    }
    let tr = Html(table, "tr", [], ["develop-propertygrid-tr"]);
    Html(tr, "td", [], ["develop-propertygrid-td"], key);
    let inputContainer = Html(tr, "td", [], ["develop-propertygrid-td"]);
    return <HTMLInputElement>Html(inputContainer, "input", ["type", "number", "value", "" + value,]);
}

export function InputSelect(table: HTMLTableSectionElement, displayValueAndKeyvalues: StringNumberTuple[], key: string, cfg: KeyValueTuple[] | null): HTMLSelectElement {
    let value: number = 0;
    if (cfg != null) {
        for (const e of cfg) {
            if (e.key == key && !isNaN(e.value)) {
                value = e.value;
                break;
            }
        }
    }
    let tr = Html(table, "tr", [], ["develop-propertygrid-tr"]);
    Html(tr, "td", [], ["develop-propertygrid-td"], key);
    let inputContainer = Html(tr, "td", [], ["develop-propertygrid-td"]);
    let select = <HTMLSelectElement>Html(inputContainer, "select", [], []);
    for (let i = 0; i < displayValueAndKeyvalues.length; i++) {
        let option = Html(select, "option", ["value", "" + displayValueAndKeyvalues[i].n], [], displayValueAndKeyvalues[i].s);
        if (i == value) {
            option.setAttribute("selected", "");
        }
    }
    return select;
}



export function InputColor(table: HTMLTableSectionElement, key: string, cfg: KeyValueTuple[] | null): HTMLInputElement {
    let value: string = "#ff0000";
    if (cfg != null) {
        for (const e of cfg) {
            if (e.key == key) {
                value = e.value;
                break;
            }
        }
    }
    let tr = Html(table, "tr", [], ["develop-propertygrid-tr"]);
    Html(tr, "td", [], ["develop-propertygrid-td"], key);
    let inputContainer = Html(tr, "td", [], ["develop-propertygrid-td"]);
    return <HTMLInputElement>Html(inputContainer, "input", ["type", "color", "value", value]);
}
