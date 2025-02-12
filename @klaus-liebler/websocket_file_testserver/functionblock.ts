import * as fs from "node:fs"
import path from "node:path"
import * as flatbuffers from "flatbuffers"

import { randomInt } from "node:crypto";

const FBDSTORE_BASE_DIRECTORY = "fbdstore";
const DEFAULT_FBD_FILEPATH = "default.fbd";
const TEMP_FBD_FILEPATH = "temp.fbd";


import * as functionblock from "@generated/flatbuffers_ts/functionblock"
import { ISender, NamespaceAndHandler } from "./utils";

export class FunctionblockHandler extends NamespaceAndHandler {
    constructor(private readonly spiffsRoot:string) {
        super(functionblock.Namespace.Value)
    }
    public Handle(buffer: flatbuffers.ByteBuffer, sender: ISender) {
        var rw = functionblock.RequestWrapper.getRootAsRequestWrapper(buffer)
        switch (rw.requestType()) {
            case functionblock.Requests.RequestDebugData: {
                var temp = fs.readFileSync(path.join(this.spiffsRoot, TEMP_FBD_FILEPATH))
                var dv = new DataView(temp.buffer);
                var sizeOfBinaryData = dv.getUint32(0, true)
                var dataStructureVersion = dv.getUint32(4, true);
                if (dataStructureVersion != 0xAFFECAFE) {
                    console.error("dataStructureVersion!=0xAFFECAFE")
                    return
                }
                var hash = dv.getUint32(8, true);
                var booleansCount = dv.getUint32(12, true);
                var integersCount = dv.getUint32(16, true);
                var floatsCount = dv.getUint32(20, true);
                var colorsCount = dv.getUint32(24, true);
                //var operatorsCount = dv.getUint32(28, true);
                var bools = <any>Array.from(Array(booleansCount).keys()).map(() => { randomInt(0, 2) == 1 ? true : false })
                var integers = <any>Array.from(Array(integersCount).keys()).map(() => { randomInt(0, 100) })
                var floats = <any>Array.from(Array(floatsCount).keys()).map(() => { randomInt(0, 100) })
                var colors = <any>Array.from(Array(colorsCount).keys()).map(() => { randomInt(0, 2000000000) })
                let b = new flatbuffers.Builder(1024);
                var r = functionblock.ResponseDebugData.createResponseDebugData(b, hash,
                    functionblock.ResponseDebugData.createBoolsVector(b, bools),
                    functionblock.ResponseDebugData.createIntegersVector(b, integers),
                    functionblock.ResponseDebugData.createFloatsVector(b, floats),
                    functionblock.ResponseDebugData.createColorsVector(b, colors)
                );
                b.finish(functionblock.ResponseWrapper.createResponseWrapper(b, functionblock.Responses.ResponseDebugData, r));
                sender.send(functionblock.Namespace.Value, b);

            }
                break;
        }
    }
}


