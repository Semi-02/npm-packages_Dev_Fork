import { FlowchartOperator } from "./FlowchartOperator";
import { Flowchart } from "./Flowchart";
import { ConnectorType } from "./FlowchartConnector";
import { FlowchartData } from "./FlowchartData";
import { KeyValueTuple } from "@klaus-liebler/commons";
import { SerializeContextAndAdressMap } from "./FlowchartCompiler";
import { FlowchartInputConnector } from "./FlowchartConnector";
import { FlowchartOutputConnector } from "./FlowchartConnector";
import { PositionType, SingletonType, TypeInfo } from "./FlowchartOperator";

/**
 * [Projekt-Erweiterung]
 * Repräsentiert einen Superblock (Makroblock) im Flowchart-System.
 *
 * Diese Klasse kapselt eine eigene interne Logik – bestehend aus Operatoren und Verbindungen –
 * und stellt nur bestimmte Eingänge und Ausgänge nach außen zur Verfügung.
 *
 * Ein Superblock kann gespeichert, geladen und wie ein normaler Operator in ein Flowchart eingefügt werden.
 * Er wird visuell als einzelner Block dargestellt, intern enthält er aber ein ganzes Sub-Diagramm.
 */
export class MacroOperator extends FlowchartOperator {
    /** Die interne Datenstruktur des Superblocks (Operatoren, Links, exposed Inputs/Outputs) */
    private internalFlowchartData: FlowchartData;

    /**
     * Erstellt einen neuen Makro-Operator basierend auf einer gespeicherten internen Flowchart-Struktur.
     *
     * @param parent Das übergeordnete Flowchart, in das der Superblock eingefügt wird.
     * @param caption Der angezeigte Titel des Superblocks im Diagramm.
     * @param configurationData Optionale Konfigurationsdaten (derzeit nicht verwendet).
     * @param internalData Die interne Struktur (Operatoren und Verbindungen), die der Superblock kapselt.
     */
    constructor(
        parent: Flowchart,
        caption: string,
        configurationData: KeyValueTuple[] | null,
        internalData: FlowchartData,
    ) {
        super(
            parent,
            caption,
            new TypeInfo(
                MacroOperator.GlobalTypeIndex,
                "Custom",
                "Macro",
                PositionType.Default,
                SingletonType.Default,
                () => {
                    throw "Builder not used here";
                }
            ),
            configurationData
        );
        
        this.internalFlowchartData = internalData;

        const internalOperatorIds = new Set(
            this.internalFlowchartData.operators.map(op => op.index)
        );

        const exposedInputs = this.internalFlowchartData.exposedInputs ?? [];
        const exposedOutputs = this.internalFlowchartData.exposedOutputs ?? [];

        /**
         * Bestimmt den Konnektortyp eines bestimmten Eingangs
         */
        function getInputType(opIndex: number, inputIndex: number): ConnectorType {
            const op = parent.OperatorsMap.get(opIndex);
            if (!op) return ConnectorType.BOOLEAN;
            const connector = op.GetInputConnectorByIndex(inputIndex);
            return connector?.Type ?? ConnectorType.BOOLEAN;
        }

        /**
         * Bestimmt den Konnektortyp eines bestimmten Ausgangs
         */
        function getOutputType(opIndex: number, outputIndex: number): ConnectorType {
            const op = parent.OperatorsMap.get(opIndex);
            if (!op) return ConnectorType.BOOLEAN;
            const connector = op.GetOutputConnectorByIndex(outputIndex);
            return connector?.Type ?? ConnectorType.BOOLEAN;
        }

        // 🔎 Debug-Ausgaben zur Kontrolle der Struktur
        console.log("🧪 Inputs:", exposedInputs);
        console.log("🧪 Outputs:", exposedOutputs);
        console.log("Superblock enthält Operatoren:", this.internalFlowchartData.operators);
        console.log("Superblock enthält Links:", this.internalFlowchartData.links);
        console.log("Exposed Inputs:", exposedInputs);

        /**
         * Erzeugt sichtbare Ein- und Ausgänge für den Block basierend auf den Exposed-Definitionen
         */
        this.AppendConnectors(
            exposedInputs.map((e, i) =>
                new FlowchartInputConnector(
                    this,
                    e.connectorName ?? `In${i}`,
                    i,
                    e.connectorType ?? ConnectorType.BOOLEAN
                )
            ),
            exposedOutputs.map((e, i) =>
                new FlowchartOutputConnector(
                    this,
                    e.connectorName ?? `Out${i}`,
                    i,
                    e.connectorType ?? ConnectorType.BOOLEAN
                )
            )
        );
    }

    /**
     * Global eindeutige ID, um diesen Blocktyp im System zu identifizieren.
     */
    public static GlobalTypeIndex = 9999;

    /**
     * Gibt die interne gespeicherte Struktur (Operatoren, Verbindungen, I/Os) dieses Superblocks zurück.
     *
     * @returns Die gekapselte FlowchartData des Blocks.
     */
    public GetInternalData(): FlowchartData {
        return this.internalFlowchartData;
    }

    /**
     * Noch nicht implementiert: Diese Methode soll später die internen Operatoren beim Kompilieren "aufklappen".
     *
     * @param ctx Kontext für die Serialisierung beim Kompilierungsvorgang.
     */
    public SerializeToBinary(ctx: SerializeContextAndAdressMap): void {
        console.warn("MacroOperator: SerializeToBinary() not implemented yet.");
    }
}
