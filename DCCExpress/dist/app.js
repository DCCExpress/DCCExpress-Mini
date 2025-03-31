"use strict";
(() => {
  // src/ws.ts
  var WebSocketClient = class {
    sendRaw(raw) {
      this.send({ type: "dccexraw" /* dccexraw */, data: { raw } });
    }
    constructor() {
    }
    connect() {
      const protocol = document.location.protocol === "https:" ? "wss:" : "ws:";
      let host = document.location.host;
      if (document.location.hostname == "127.0.0.1") {
        host = "192.168.1.143";
      }
      const url = `${protocol}//${host}/ws`;
      console.log(`Connecting to ${url}`);
      this.socket = new WebSocket(url);
      this.socket.onopen = () => {
        console.log("WebSocket connection established.");
        if (this.onOpen) {
          this.onOpen();
        }
      };
      this.socket.onmessage = (event) => {
        try {
          const m = event.data.toString().replace(/[\n\r\t]/g, "");
          const message = JSON.parse(m);
          this.onMessage(message);
        } catch (error) {
          console.error("Invalid message format received:", event.data);
        }
      };
      this.socket.onclose = () => {
        if (this.onClosed) {
          this.onClosed();
        }
        console.warn("WebSocket connection closed. Reconnecting...");
        setTimeout(() => this.connect(), 1e3);
      };
      this.socket.onerror = (error) => {
        if (this.onError) {
          this.onError();
        }
        console.error("WebSocket error:", error);
      };
      if (this.task) {
        clearInterval(this.task);
      }
      this.task = setInterval(() => {
        Api.getSupportedLocos();
      }, 1e3);
    }
    send(data) {
      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify(data));
      } else {
        console.warn("Cannot send message. WebSocket is not open.");
      }
    }
    onMessage(message) {
      console.log("Processing message:", message);
    }
  };
  var wsClient = new WebSocketClient();

  // src/api.ts
  var Api = class _Api {
    static format(raw) {
      return { type: "dccexraw" /* dccexraw */, data: { raw } };
    }
    static setLoco(address, speed, direction) {
      wsClient.send(_Api.format(`<t ${address} ${speed} ${direction}>`));
    }
    static getLocoInfo(address) {
      wsClient.send(_Api.format(`<t ${address}>`));
    }
    static setLocoFunction(address, fn, on) {
      wsClient.send(_Api.format(`<F ${address} ${fn} ${on ? 1 : 0}>`));
    }
    static emergencyStop() {
      wsClient.send(_Api.format(`<!>`));
    }
    static getSupportedLocos() {
      wsClient.send(_Api.format(`<c>`));
    }
    static setTurnout(to) {
      if (to.isAccessory) {
        wsClient.send(_Api.format(`<a ${to.address} ${to.isClosed ? 0 : 1}>`));
      } else {
        wsClient.send(_Api.format(`<T ${to.address} ${to.isClosed ? 0 : 1}>`));
      }
    }
    static getAllTurnout() {
      wsClient.send(_Api.format("<T>"));
    }
  };

  // src/locoPanel.ts
  var LocoPanel = class extends HTMLElement {
    constructor() {
      super();
      this.locomotives = [];
      this.buttons = {};
      this._data = "";
      this.turnouts = [];
      this._powerInfo = { current: 0, emergencyStop: false, info: 0, programmingModeActive: false, shortCircuit: false, trackVoltageOn: false };
      const shadow = this.attachShadow({ mode: "open" });
      shadow.innerHTML = `
            <style>
                @import url("bootstrap.min.css");
                
                #container {
                    color: black;
                    padding: 10px;
                    margin: 0;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    background: #f4f4f4;
                    border-radius: 10px;
                    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
                }

                #infoLeft, #infoRight{
                    background: red;
                    width: 80px;
                    width: 20%;
                    text-align: center;                 
                    display: none;   
                }
                #locoImageDiv {
                    width: 90%;
                    text-align: center;
                    
                }
                /* Mozdonyk\xE9p st\xEDlus */
                #locoImage {
                    height: 64px;
                    max-width: 400px;
                    cursor:pointer;
                    
                }


                /* Gombcsoport az ir\xE1nygombokhoz (20% - 60% - 20%) */
                .control-group {
                    display: grid;
                    grid-template-columns: 1fr 1fr 1fr 1fr;
                    width: 100%;
                    gap: 4px;
                    margin-bottom: 0px;
                }
                .direction-group {
                    display: grid;
                    grid-template-columns: 1fr 2fr 1fr;
                    width: 100%;
                    gap: 6px;
                    margin-bottom: 4px;
                }
        
                /* Sebess\xE9g gombok (5 oszlop, azaz 20%-os eloszt\xE1s) */
                .speed-group {
                    display: grid;
                    grid-template-columns: repeat(6, 1fr);
                    width: 100%;
                    gap: 4px;
                    margin-bottom: 4px;
                }
        
                /* Gombok \xE1ltal\xE1nos st\xEDlusa */
                #container button {
                    background: rgb(100, 100, 100);
                    border: none;
                    border-radius: 4px;
                    padding: 0px;
                    color: white;
                    font-size: 16px;
                    font-weight: bold;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
                    width: 100%;
                    height: 48px;
                    
                }
                
                #fnButtons {
                    display: grid;
                    grid-template-columns: repeat(5, 1fr);
                    grid-template-rows: repeat(6, 1fr); /* 12 egyenl\u0151 sor */
                    width: 100%;
                    gap: 4px;
                    
                }

                #container #fnButtons button {
                    padding: 0;
                    font-size: 12px;
                }
                #container #fnButtons button.fnbutton {
                    background-color: dodgerblue;
                }

                /* Hover effekt */
                button:hover {
                    background: rgb(125, 125, 125);
                    transform: scale(1.00);
                }
        
                /* Akt\xEDv \xE1llapot */
                button:active {
                    background:  rgb(25, 25, 25);
                    transform: scale(0.99);
                }
        
                /* Funkci\xF3 gombok */
                #container #fnButtons button.on {
                    background-color: rgb(77, 77, 255);
                    color: white;
                    border-color: blue;
                }
                    
                #container #fnButtons button.on:hover,
                #container #fnButtons button.on:active {
                    background-color: blue;
                    transform: none;
                }

                /* Modal h\xE1tt\xE9r  */
                #modal {
                    display: none;
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.6);
                    justify-content: center;
                    align-items: center;
                    color: black;
                }
                #modal h3 {
                    padding: 0;
                    margin: 5px;
                }
                /* Modal tartalom */
                .modal-content {
                    width: 80%;
                    background: white;
                    padding: 10px;
                    border-radius: 10px;
                    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
                    text-align: center;
                }

                /* Mozdony lista */
                .loco-item, .turnout-item{
                    display: flex;
                    flex-direction: column;
                    overflow: auto;
                    align-items: center;
                    padding: 10px;
                    cursor: pointer;
                    border-bottom: 1px solid #ddd;
                    transition: background 0.3s;
                }

                /* Kijel\xF6lt mozdony */
                .selected {
                    background: red !important;
                    color: white;
                    font-weight: bold;
                }

                .loco-item:hover {
                    background: #f0f0f0;
                }

                .loco-item img {
                    height: auto;
                    margin-right: 10px;
                    border-radius: 5px;
                }

                /* Modal bez\xE1r\xF3 gomb */
                #closeModal {
                    margin-top: 10px;
                    padding: 10px 20px;
                    background: red;
                    border: none;
                    color: white;
                    cursor: pointer;
                }

                #modalContent {
                    height: 70%;
                    overflow: auto;
                    border-radius: 5px;
                    border: 1px solid #ddd;
                }

                #locoInfo {
                    min-width: 100px;
                    color: #222;
                    background-color: gainsboro;
                    margin-bottom: 4px;
                    padding: 4px;
                    border-radius: 5px;
                    border: 1px solid black;
                    font-weight: bold;
                    justify-content: center;
                    text-align: center;
                    font-size: 2em;
                }

                #container #btnEmergency {
                    width: 100%;
                    background: rgb(104, 30, 30);
                    margin-bottom: 4px;
                }
                #container #btnEmergency:hover {
                    width: 100%;
                    background: rgb(138, 38, 38);
                    margin-bottom: 4px;
                }
                #container #btnEmergency:active {
                    width: 100%;
                    background: rgb(255, 0, 0);
                    margin-bottom: 4px;
                }
                #container #btnEmergency.on {
                    width: 100%;
                    background: rgb(255, 0, 0);
                    margin-bottom: 4px;
                    animation: blink 0.5s infinite alternate;
                }

                @keyframes blink {
                    from {
                        background-color: red;
                        fill: yellow;
                    }
                    to {
                        background-color: rgb(138, 38, 38);
                        fill: #000;
                    }
                }                   

                #container #locoModeInfo {
                    width: 100%;
                    background-color: gray;
                    color: white;
                    padding: 4px 0;
                    border-radius:5px;
                    margin: 4px 0;
                    text-align: center;"
                }

                .icon {
                    width: 24px;
                    height: 24px;
                    padding: 8px;
                    margin: 0;
                }
            </style>
        
            <div id="container" class="scrollable" >
                <div style="justify-content: center; width:100%; height: 100px; display: flex; border-bottom: 20px;">
                    <div id="infoLeft">INFO L</div>
                    <div id="locoImageDiv">
                        <img id="locoImage" src="" style="max-height: 60px">
                        <div id="locoName">#11 CS\xD6RG\u0150</div>
                    </div>
                    <div id="infoRight">INFO R</div>
                </div>

                <div id="locoInfo" style="display: flex">
                    <div id="locoInfoSpeed">10</div>
                    <div id="locoInfoPower" style="color: #555555; font-size: 0.6em;display: flex; flex-direction: column; justify-content: flex-end; ">10</div>
                </div>

                <div class="control-group">
                    <button id="btnRoutes" class="btn btn-warning flex-fill py-3">\u{1F500}</button>
                    <button id="btnTurnouts" class="btn btn-success flex-fill py-3">\u{1F50C}</button>
                    <button id="btnPower" class="btn btn-primary flex-fill py-3">\u26A1</button>
                    <button id="btnEmergency" class="btn btn-danger flex-fill py-3">\u{1F6D1}</button>
                </div>

                <!--

                <div id="locoModeInfo2">
                    <button class="btn d-flex justify-content-center align-items-center" style="width: 200px;">
                        <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M5,8A4,4 0 0,1 9,12A4,4 0 0,1 5,16A4,4 0 0,1 1,12A4,4 0 0,1 5,8M12,1A4,4 0 0,1 16,5A4,4 0 0,1 12,9A4,4 0 0,1 8,5A4,4 0 0,1 12,1M12,15A4,4 0 0,1 16,19A4,4 0 0,1 12,23A4,4 0 0,1 8,19A4,4 0 0,1 12,15M19,8A4,4 0 0,1 23,12A4,4 0 0,1 19,16A4,4 0 0,1 15,12A4,4 0 0,1 19,8Z" /></svg>
                    </button>
                </div>
                

                <div style="width: 100%">
                    <button id="btnEmergency">EMERGENCY STOP</button>
                </div>
                -->
                

                <!-- K\xDCL\xD6N SOR: Ir\xE1ny\xEDt\xE1s (20% - 60% - 20%) -->
                <div class="direction-group">
                    <button id="btnReverse">&lt;&lt;</button>
                    <button id="btnStop">STOP</button>
                    <button id="btnForward">&gt;&gt;</button>
                </div>
        
                <!-- K\xDCL\xD6N SOR: Sebess\xE9g gombok (5 oszlop) -->
                <div class="speed-group">
                    <button id="btnSpeed5">5</button>
                    <button id="btnSpeed10">10</button>
                    <button id="btnSpeed20">20</button>
                    <button id="btnSpeed40">40</button>
                    <button id="btnSpeed80">80</button>
                    <button id="btnSpeed100">100</button>
                </div>
        
                <div id="fnButtons"></div>
        
            </div>

             <!-- Modal -->
            <div id="modal">
                <div class="modal-content">
                    <div id="modalContent"></div>
                    <button id="closeModal" style="border-radius: 8px">CLOSE</button>
                </div>
            </div>
        `;
      this.locoImage = shadow.getElementById("locoImage");
      this.locoName = shadow.getElementById("locoName");
      this.locoInfoSpeedElement = shadow.getElementById("locoInfoSpeed");
      this.locoInfoPowerElement = shadow.getElementById("locoInfoPower");
      this.locoModeInfoElement = shadow.getElementById("locoModeInfo");
      this.locoImage.addEventListener("click", () => this.openLocoModal());
      shadow.getElementById("closeModal")?.addEventListener("click", () => this.closeModal());
      this.btnPower = shadow.getElementById("btnPower");
      this.btnPower.onclick = (e) => {
        this.openPowerModal();
      };
      this.btnEmergency = shadow.getElementById("btnEmergency");
      this.btnEmergency.onclick = (e) => {
        Api.emergencyStop();
      };
      this.btnReverse = shadow.getElementById("btnReverse");
      this.btnReverse.onclick = (e) => {
        if (this.currentLoco) {
          Api.setLoco(this.currentLoco.address, this.currentLoco.speed, 0 /* reverse */);
        }
      };
      this.btnStop = shadow.getElementById("btnStop");
      this.btnStop.onclick = (e) => {
        if (this.currentLoco) {
          Api.setLoco(this.currentLoco.address, 0, this.currentLoco.direction);
        }
      };
      this.btnForward = shadow.getElementById("btnForward");
      this.btnForward.onclick = (e) => {
        if (this.currentLoco) {
          Api.setLoco(this.currentLoco.address, this.currentLoco.speed, 1 /* forward */);
        }
      };
      this.btnSpeed5 = shadow.getElementById("btnSpeed5");
      this.btnSpeed5.onclick = (e) => {
        if (this.currentLoco) {
          Api.setLoco(this.currentLoco.address, this.getSpeedPercentage(5), this.currentLoco.direction);
        }
      };
      this.btnSpeed10 = shadow.getElementById("btnSpeed10");
      this.btnSpeed10.onclick = (e) => {
        if (this.currentLoco) {
          Api.setLoco(this.currentLoco.address, this.getSpeedPercentage(10), this.currentLoco.direction);
        }
      };
      this.btnSpeed20 = shadow.getElementById("btnSpeed20");
      this.btnSpeed20.onclick = (e) => {
        if (this.currentLoco) {
          Api.setLoco(this.currentLoco.address, this.getSpeedPercentage(20), this.currentLoco.direction);
        }
      };
      this.btnSpeed40 = shadow.getElementById("btnSpeed40");
      this.btnSpeed40.onclick = (e) => {
        if (this.currentLoco) {
          Api.setLoco(this.currentLoco.address, this.getSpeedPercentage(40), this.currentLoco.direction);
        }
      };
      this.btnSpeed80 = shadow.getElementById("btnSpeed80");
      this.btnSpeed80.onclick = (e) => {
        if (this.currentLoco) {
          Api.setLoco(this.currentLoco.address, this.getSpeedPercentage(80), this.currentLoco.direction);
        }
      };
      this.btnSpeed100 = shadow.getElementById("btnSpeed100");
      this.btnSpeed100.onclick = (e) => {
        if (this.currentLoco) {
          Api.setLoco(this.currentLoco.address, this.getSpeedPercentage(100), this.currentLoco.direction);
        }
      };
      this.fnButtons = shadow.getElementById("fnButtons");
      this.modal = shadow.getElementById("modal");
      this.modal.onclick = (e) => {
        if (e.target == this.modal) {
          this.closeModal();
        }
      };
      const btnTurnouts = shadow.getElementById("btnTurnouts");
      btnTurnouts.onclick = (e) => {
        this.openTurnoutsModal();
      };
      for (var i = 0; i <= 28; i++) {
        const btn = document.createElement("button");
        this.buttons[i] = btn;
        btn.fn = i;
        btn.function = void 0;
        btn.onpointerdown = (e) => {
          if (this.currentLoco) {
            if (btn.function) {
              if (btn.function.momentary) {
                Api.setLocoFunction(this.currentLoco.address, btn.fn, true);
              } else {
                Api.setLocoFunction(this.currentLoco.address, btn.fn, !btn.function.isOn);
              }
            } else {
              const on = (this.currentLoco.functionMap >> btn.fn & 1) > 0;
              Api.setLocoFunction(this.currentLoco.address, btn.fn, !on);
            }
          }
        };
        btn.onpointerup = (e) => {
          if (btn.function && btn.function.momentary && this.currentLoco) {
            Api.setLocoFunction(this.currentLoco.address, btn.fn, false);
          }
        };
        btn.innerHTML = `F${i}`;
        this.fnButtons.appendChild(btn);
      }
    }
    getSvgTurnoutClosed(id, isLeft) {
      return `
 <svg width="48" height="48" viewBox="0 0 12 12" id="turnout${id}" xmlns="http://www.w3.org/2000/svg">
   <g ${isLeft ? 'transform="scale(-1 1)  translate(-12 0)"' : ""} >
     <path
        id="rect2"
        style="fill:#4d4d4d;stroke:#000000;stroke-width:0.264583"
        d="m 8.4106304,0.1322915 h 2.1727026 l -4.6263137,6.0942533 0,4.3567892 H 4.121172 l 0,-4.8354783 z"
        />
     <rect
        style="fill:#f2f2f2;stroke:#000000;stroke-width:0.264583;stroke-dasharray:none"
        id="rect1"
        width="1.8358474"
        height="10.451042"
        x="4.121172"
        y="0.1322915" />
   </g>
 </svg>
 `;
    }
    getSvgTurnoutThrown(id, isLeft) {
      return `
 <svg width="48" height="48" viewBox="0 0 12 12" id="turnout${id}" xmlns="http://www.w3.org/2000/svg">
   <g ${isLeft ? 'transform="scale(-1 1)  translate(-12 0)"' : ""} >
     <rect
        style="fill:#4d4d4d;stroke:#000000;stroke-width:0.264583;stroke-dasharray:none"
        id="rect1"
        width="1.8358474"
        height="10.451042"
        x="4.121172"
        y="0.1322915" />
     <path
        id="rect2"
        style="fill:#f2f2f2;stroke:#000000;stroke-width:0.264583"
        d="m 8.4106304,0.1322915 h 2.1727026 l -4.6263137,6.0942533 0,4.3567892 H 4.121172 l 0,-4.8354783 z"
        />

   </g>
 </svg>
 `;
    }
    init() {
      this.fetchLocomotives();
      this.fetchTurnouts();
    }
    connectedCallback() {
    }
    async fetchLocomotives() {
      try {
        const response = await fetch(`locos.json`);
        const locos = await response.json();
        this.locomotives = locos.sort((a, b) => a.address - b.address);
        if (this.locomotives.length > 0) {
          this.locomotives.forEach((l) => {
            l.speed = 0;
            l.direction = 1 /* forward */;
            Api.getLocoInfo(l.address);
          });
          const i = parseInt(window.localStorage.getItem("controlPanelSelectedLocoIndex")) || 0;
          if (i < this.locomotives.length) {
            this.currentLoco = this.locomotives[i];
          } else {
            this.currentLoco = this.locomotives[0];
          }
        }
      } catch (error) {
        console.error("Error fetching locomotives:", error);
      }
    }
    async fetchTurnouts() {
      try {
        const response = await fetch(`turnouts.json`);
        const turnouts = await response.json();
        this.turnouts = turnouts.sort((a, b) => a.address - b.address);
        Api.getAllTurnout();
      } catch (error) {
        console.error("Error fetching turnouts:", error);
      }
    }
    openPowerModal() {
      const modalContent = this.shadowRoot.getElementById("modalContent");
      modalContent.innerHTML = "";
      const div = document.createElement("div");
      div.className = "d-grid gap-2";
      modalContent.appendChild(div);
      const mainOn = document.createElement("button");
      mainOn.innerHTML = "MAIN ON";
      mainOn.className = "btn btn-success";
      div.appendChild(mainOn);
      mainOn.onclick = (e) => {
        wsClient.sendRaw("<1 MAIN>");
      };
      const mainOff = document.createElement("button");
      mainOff.innerHTML = "MAIN OFF";
      mainOff.className = "btn btn-secondary";
      div.appendChild(mainOff);
      mainOff.onclick = (e) => {
        wsClient.sendRaw("<0>");
      };
      this.modal.style.display = "flex";
    }
    openLocoModal() {
      const modalContent = this.shadowRoot.getElementById("modalContent");
      modalContent.innerHTML = "";
      this.locomotives.forEach((loco) => {
        const locoItem = document.createElement("div");
        locoItem.classList.add("loco-item");
        locoItem.innerHTML = `
                <div style="justify-content: center; align-items: center">
                    <img src="${loco.imageUrl}" alt="${loco.name}">
                </div>
                <div>#${loco.address} ${loco.name}</div>
            `;
        if (loco.id === this.currentLoco?.id) {
          locoItem.classList.add("selected");
        }
        locoItem.addEventListener("click", () => {
          const i = this.locomotives.findIndex((l) => {
            return l.address == loco.address;
          });
          window.localStorage.setItem("controlPanelSelectedLocoIndex", i.toString());
          this.currentLoco = loco;
          this.closeModal();
        });
        modalContent.appendChild(locoItem);
      });
      this.modal.style.display = "flex";
    }
    openTurnoutsModal() {
      const modalContent = this.shadowRoot.getElementById("modalContent");
      modalContent.innerHTML = "";
      this.turnouts.forEach((turnout) => {
        const tItem = document.createElement("div");
        tItem.classList.add("loco-item");
        const svg = turnout.isClosed ? this.getSvgTurnoutClosed(turnout.address, turnout.isLeft) : this.getSvgTurnoutThrown(turnout.address, turnout.isLeft);
        tItem.innerHTML = `
                <div id="svg-turnout-${turnout.address.toString()}"  style="height: 60px; width: 60px; display: flex; justify-content: center; align-items: center; background-color: gray">
                    ${svg}
                </div>
                <div>#${turnout.address} ${turnout.name}</div>
            `;
        tItem.addEventListener("click", () => {
          const to = this.turnouts.find((t) => {
            return turnout.address == t.address;
          });
          if (to) {
            to.isClosed = !to.isClosed;
            Api.setTurnout(to);
            const svgContainer = this.shadowRoot.getElementById(`svg-turnout-${to.address}`);
            if (svgContainer) {
              svgContainer.innerHTML = to.isClosed != to.isInverted ? this.getSvgTurnoutClosed(to.address, to.isLeft) : this.getSvgTurnoutThrown(to.address, to.isLeft);
            }
          }
        });
        modalContent.appendChild(tItem);
      });
      this.modal.style.display = "flex";
    }
    closeModal() {
      this.modal.style.display = "none";
    }
    renderLocoFunctions() {
      this.locoImage.src = this.currentLoco.imageUrl;
      this.locoName.innerText = `#${this.currentLoco.address} ${this.currentLoco.name}`;
      for (var i = 0; i <= 28; i++) {
        this.buttons[i].className = "";
        this.buttons[i].function = void 0;
        this.buttons[i].innerHTML = `F${i}`;
      }
      this.currentLoco?.functions?.forEach((f) => {
        this.buttons[f.id].className = "fnbutton";
        this.buttons[f.id].innerHTML = `F${f.id}<br>${f.name}`;
        this.buttons[f.id].function = f;
      });
      this.updateUI();
    }
    get currentLoco() {
      return this._currentLoco;
    }
    set currentLoco(v) {
      this._currentLoco = v;
      this.renderLocoFunctions();
    }
    getSpeedPercentage(perc, maxSpeed = 126) {
      return Math.round(maxSpeed * (perc / 100));
    }
    getClosestSpeedThreshold(speed, maxSpeed = 126) {
      if (speed == 0) {
        return 0;
      }
      const percentageThresholds = [5, 10, 20, 40, 80, 100];
      const speedPercentage = speed / maxSpeed * 100;
      return percentageThresholds.reduce(
        (closest, current) => Math.abs(speedPercentage - current) < Math.abs(speedPercentage - closest) ? current : closest
      );
    }
    calculateRealSpeed(modelSpeed) {
      const scaleFactor = 87;
      const realSpeed = modelSpeed * scaleFactor * 3600 / 1e5;
      return Math.round(realSpeed * 10) / 10;
    }
    calculateRealTrainSpeed(dccSpeed, realMaxSpeed = 120) {
      if (dccSpeed < 0 || dccSpeed > 127) {
        throw new Error("A DCC sebess\xE9gnek 0 \xE9s 127 k\xF6z\xF6tt kell lennie.");
      }
      const realSpeed = dccSpeed / 127 * realMaxSpeed;
      return Math.round(realSpeed * 10) / 10;
    }
    updateUI() {
      if (this.currentLoco) {
        const speed = this.getClosestSpeedThreshold(this.currentLoco.speed);
        this.btnReverse.style.backgroundColor = this.currentLoco.direction == 0 /* reverse */ ? "lime" : "gray";
        this.btnStop.style.backgroundColor = this.currentLoco.speed == 0 ? "orange" : "gray";
        this.btnForward.style.backgroundColor = this.currentLoco.direction == 1 /* forward */ ? "lime" : "gray";
        this.btnSpeed5.style.backgroundColor = speed == 5 ? "lime" : "gray";
        this.btnSpeed10.style.backgroundColor = speed == 10 ? "lime" : "gray";
        this.btnSpeed20.style.backgroundColor = speed == 20 ? "lime" : "gray";
        this.btnSpeed40.style.backgroundColor = speed == 40 ? "lime" : "gray";
        this.btnSpeed80.style.backgroundColor = speed == 80 ? "lime" : "gray";
        this.btnSpeed100.style.backgroundColor = speed == 100 ? "lime" : "gray";
        this.locoInfoSpeedElement.innerHTML = this.currentLoco.speed.toString();
        for (var i = 0; i <= 28; i++) {
          var on = (this.currentLoco.functionMap >> i & 1) == 1;
          const fn = this.currentLoco.functions.find((f) => f.id == i);
          if (fn) {
            fn.isOn = on;
          }
          if (on) {
            this.buttons[i].classList.add("on");
          } else {
            this.buttons[i].classList.remove("on");
          }
        }
      } else {
        this.locoInfoSpeedElement.innerHTML = "Unknown Loco";
      }
    }
    processMessage(msg) {
      if (msg.type == "rawInfo" /* rawInfo */) {
        const raw = msg.data.raw;
        for (var i = 0; i < raw.length; i++) {
          var c = raw[i];
          if (c == ">") {
            this.parse(this._data);
            this._data = "";
          } else if (c == "<" || c == "\n" || c == "\r") {
            this._data = "";
            continue;
          } else {
            this._data += c;
          }
        }
      }
      if (msg.type == "ack" /* ack */) {
        switch (msg.data) {
          case "<!>":
            this.powerInfo.emergencyStop = true;
            this.powerInfo = this.powerInfo;
            break;
        }
      }
    }
    parse(data) {
      if (data == "# 50") {
        return;
      }
      if (data.startsWith("c CurrentMAIN")) {
        const params = data.split(" ");
        this.powerInfo.current = parseInt(params[2]);
        this.locoInfoPowerElement.innerHTML = this.powerInfo.current.toString();
      } else if (data.startsWith("p1")) {
        console.log(data);
        const params = data.split(" ");
        this.powerInfo.info = 1;
        if (params[1] == "MAIN" || params[1] == "A") {
          {
            this.powerInfo.trackVoltageOn = true;
          }
        } else if (params[1] == "PROG" || params[1] == "B") {
          this.powerInfo.programmingModeActive = true;
        }
        this.powerInfo = this.powerInfo;
      } else if (data.startsWith("p0")) {
        console.log(data);
        const params = data.split(" ");
        this.powerInfo.info = 0;
        if (params.length == 2) {
          if (params[1] == "MAIN" || params[1] == "A") {
            this.powerInfo.trackVoltageOn = false;
          } else if (params[1] == "PROG" || params[1] == "B") {
            this.powerInfo.programmingModeActive = false;
          }
          this.powerInfo = this.powerInfo;
        } else {
          this.powerInfo.trackVoltageOn = false;
          this.powerInfo.programmingModeActive = false;
        }
      } else if (data.startsWith("Q ")) {
      } else if (data.startsWith("q ")) {
      } else if (data.startsWith("l")) {
        console.log(data);
        var items = data.split(" ");
        var address = parseInt(items[1]);
        var speedByte = parseInt(items[3]);
        var funcMap = parseInt(items[4]);
        var direction = 1 /* forward */;
        {
          var newSpeed = 0;
          if (speedByte >= 2 && speedByte <= 127) {
            newSpeed = speedByte - 1;
            direction = 0 /* reverse */;
          } else if (speedByte >= 130 && speedByte <= 255) {
            newSpeed = speedByte - 129;
            direction = 1 /* forward */;
          } else if (speedByte == 0) {
            newSpeed = 0;
            direction = 0 /* reverse */;
          } else if (speedByte == 128) {
            newSpeed = 0;
            direction = 1 /* forward */;
          } else {
          }
          this.powerInfo.emergencyStop = speedByte == 129;
          this.powerInfo = this.powerInfo;
          const loco = this.locomotives.find((l) => l.address == address);
          if (loco) {
            loco.speed = newSpeed;
            loco.direction = direction;
            loco.functionMap = funcMap;
            if (this.currentLoco && this.currentLoco.address == loco.address) {
              this.updateUI();
            }
          }
        }
      } else if (data.startsWith("H")) {
        console.log(data);
        var items = data.split(" ");
        var address = parseInt(items[1]);
        var c = parseInt(items[2]) == 0;
        const turnout = this.turnouts.find((t) => t.address == address);
        if (turnout) {
          turnout.isClosed = c != turnout.isInverted;
        }
      } else if (data.startsWith("jT")) {
      } else if (data.startsWith("Y")) {
      } else if (data == "X") {
        console.log("(<X>) UnsuccessfulOperation !");
      } else {
      }
    }
    get powerInfo() {
      return this._powerInfo;
    }
    set powerInfo(pi) {
      this._powerInfo = pi;
      if (pi.trackVoltageOn) {
        this.btnPower.style.backgroundColor = "green";
      } else {
        this.btnPower.style.backgroundColor = "#555555";
      }
      if (pi.emergencyStop) {
        this.btnEmergency.style.backgroundColor = "red";
      } else {
        this.btnEmergency.style.backgroundColor = "#555555";
      }
    }
    // private _powerInfo : iPowerInfo | undefined;
    // public get powerInfo() : iPowerInfo | undefined {
    //     return this._powerInfo;
    // }
    // public set powerInfo(v : iPowerInfo) {
    //     this._powerInfo = v;
    // }
  };
  customElements.define("loco-panel", LocoPanel);

  // src/app.ts
  console.log(LocoPanel);
  console.log(Api);
  var App = class {
    constructor() {
      this.config = {
        startup: {
          power: "<1 MAIN>",
          init: "<s>\n<T 1 DCC 1>"
        }
      };
      this.cp = document.createElement("loco-panel");
      document.body.appendChild(this.cp);
      wsClient.onOpen = () => {
        wsClient.sendRaw(this.config.startup.power);
        wsClient.sendRaw(this.config.startup.init);
      };
      wsClient.onClosed = () => {
      };
      wsClient.onMessage = (msg) => {
        this.cp.processMessage(msg);
      };
      fetch("config.json").then((res) => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
      }).then((json) => {
        this.config = json;
      }).catch((err) => console.error("Hiba a config.json beolvas\xE1sakor:", err)).finally(() => {
        wsClient.connect();
      });
      this.cp.init();
    }
    sendRaw(raw) {
      const json = {
        type: "dccexraw",
        data: { raw }
      };
      wsClient.socket.send(JSON.stringify(json));
    }
  };
  var app = new App();
})();
