import { ApiCommands, DccDirections, iData } from "./dcc";
import { iDccRaw, wsClient } from "./ws";

export class Api {

    private static format(raw: string) : iData {
        return {type: ApiCommands.dccexraw, data: {raw: raw} as iDccRaw} as iData
    }
    static setLoco(address: number, speed: number, direction: DccDirections) {
        wsClient.send(Api.format(`<t ${address} ${speed} ${direction}>`))
    }

    static getLocoInfo(address: number) {
        wsClient.send(Api.format(`<t ${address}>`))
    }

    static setLocoFunction(address: number, fn: number, on: boolean) {
        wsClient.send(Api.format(`<F ${address} ${fn} ${on ? 1 : 0}>`))
    }
    
    static emergencyStop() {
        wsClient.send(Api.format(`<!>`))
    }
    
    static getSupportedLocos() {
        wsClient.send(Api.format(`<c>`))
    }
}