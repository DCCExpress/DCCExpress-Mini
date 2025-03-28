import { ApiCommands } from "./dcc";

export interface iData {
    type: string,
    data: object
}

export interface iDccRaw {
    raw: string
}

export class WebSocketClient {

    socket!: WebSocket;
    onOpen?: () => void;
    onError?: () => void;

    sendRaw(raw: string) {
        this.send({ type: ApiCommands.dccexraw, data: {raw: raw} as iDccRaw } as iData)
    }

    constructor() {
        // Induláskor azonnali csatlakozás
        //this.connect();
    }

    public connect(): void {
        const protocol = document.location.protocol === "https:" ? "wss:" : "ws:";
        const host = document.location.host;
        //const url = `${protocol}//${host}/ws`; 
        
        // Node red listening /ws
        const url = `ws://192.168.1.143/ws`;

        console.log(`Connecting to ${url}`);

        this.socket = new WebSocket(url);

        this.socket.onopen = () => {
            console.log("WebSocket connection established.");
            if (this.onOpen) {
                //setTimeout(() => this.onOpen!(), 100);                
                this.onOpen()
            }
        };

        this.socket.onmessage = (event) => {
            try {
                const m = event.data!.toString().replace("\n", ""); 
                const message: iData = JSON.parse(m);
                this.onMessage(message);
            } catch (error) {
                console.error("Invalid message format received:", event.data);
            }
        };

        this.socket.onclose = () => {
            if (this.onError) {
                this.onError()
            }
            console.warn("WebSocket connection closed. Reconnecting...");
            setTimeout(() => this.connect(), 1000); 
        };

        this.socket.onerror = (error) => {
            if (this.onError) {
                this.onError()
            }
            console.error("WebSocket error:", error);
        };
    }

    send(data: iData): void {
        if (this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(data));
        } else {
            console.warn("Cannot send message. WebSocket is not open.");
        }
    }

    onMessage(message: iData): void {
        console.log("Processing message:", message);
    }
}


export const wsClient = new WebSocketClient();
