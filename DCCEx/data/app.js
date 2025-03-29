"use strict";(()=>{var g=class{sendRaw(r){this.send({type:"dccexraw",data:{raw:r}})}constructor(){}connect(){let r=document.location.protocol==="https:"?"wss:":"ws:",t=document.location.host,o="ws://192.168.1.143/ws";console.log(`Connecting to ${o}`),this.socket=new WebSocket(o),this.socket.onopen=()=>{console.log("WebSocket connection established."),this.onOpen&&this.onOpen()},this.socket.onmessage=e=>{try{let n=e.data.toString().replace(`
`,""),c=JSON.parse(n);this.onMessage(c)}catch{console.error("Invalid message format received:",e.data)}},this.socket.onclose=()=>{this.onError&&this.onError(),console.warn("WebSocket connection closed. Reconnecting..."),setTimeout(()=>this.connect(),1e3)},this.socket.onerror=e=>{this.onError&&this.onError(),console.error("WebSocket error:",e)}}send(r){this.socket.readyState===WebSocket.OPEN?this.socket.send(JSON.stringify(r)):console.warn("Cannot send message. WebSocket is not open.")}onMessage(r){console.log("Processing message:",r)}},i=new g;var s=class d{static format(r){return{type:"dccexraw",data:{raw:r}}}static setLoco(r,t,o){i.send(d.format(`<t ${r} ${t} ${o}>`))}static getLocoInfo(r){i.send(d.format(`<t ${r}>`))}static setLocoFunction(r,t,o){i.send(d.format(`<F ${r} ${t} ${o?1:0}>`))}static emergencyStop(){i.send(d.format("<!>"))}};var b=class extends HTMLElement{constructor(){super();this.locomotives=[];this.buttons={};this._data="";this.powerInfo={current:0,emergencyStop:!1,info:0,programmingModeActive:!1,shortCircuit:!1,trackVoltageOn:!1};let t=this.attachShadow({mode:"open"});t.innerHTML=`
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
                .loco-item {
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

                <div id="locoInfo">
                    10
                </div>
        


                <div class="control-group">
                    <button class="btn btn-warning flex-fill py-3">\u{1F500}</button>
                    <button class="btn btn-success flex-fill py-3">\u{1F50C}</button>
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
        `,this.locoImage=t.getElementById("locoImage"),this.locoName=t.getElementById("locoName"),this.locoInfoElement=t.getElementById("locoInfo"),this.locoModeInfoElement=t.getElementById("locoModeInfo"),this.locoImage.addEventListener("click",()=>this.openLocoModal()),t.getElementById("closeModal")?.addEventListener("click",()=>this.closeModal()),this.btnPower=t.getElementById("btnPower"),this.btnPower.onclick=e=>{this.openPowerModal()},this.btnEmergency=t.getElementById("btnEmergency"),this.btnEmergency.onclick=e=>{s.emergencyStop()},this.btnReverse=t.getElementById("btnReverse"),this.btnReverse.onclick=e=>{this.currentLoco&&s.setLoco(this.currentLoco.address,this.currentLoco.speed,0)},this.btnStop=t.getElementById("btnStop"),this.btnStop.onclick=e=>{this.currentLoco&&s.setLoco(this.currentLoco.address,0,this.currentLoco.direction)},this.btnForward=t.getElementById("btnForward"),this.btnForward.onclick=e=>{this.currentLoco&&s.setLoco(this.currentLoco.address,this.currentLoco.speed,1)},this.btnSpeed5=t.getElementById("btnSpeed5"),this.btnSpeed5.onclick=e=>{this.currentLoco&&s.setLoco(this.currentLoco.address,this.getSpeedPercentage(5),this.currentLoco.direction)},this.btnSpeed10=t.getElementById("btnSpeed10"),this.btnSpeed10.onclick=e=>{this.currentLoco&&s.setLoco(this.currentLoco.address,this.getSpeedPercentage(10),this.currentLoco.direction)},this.btnSpeed20=t.getElementById("btnSpeed20"),this.btnSpeed20.onclick=e=>{this.currentLoco&&s.setLoco(this.currentLoco.address,this.getSpeedPercentage(20),this.currentLoco.direction)},this.btnSpeed40=t.getElementById("btnSpeed40"),this.btnSpeed40.onclick=e=>{this.currentLoco&&s.setLoco(this.currentLoco.address,this.getSpeedPercentage(40),this.currentLoco.direction)},this.btnSpeed80=t.getElementById("btnSpeed80"),this.btnSpeed80.onclick=e=>{this.currentLoco&&s.setLoco(this.currentLoco.address,this.getSpeedPercentage(80),this.currentLoco.direction)},this.btnSpeed100=t.getElementById("btnSpeed100"),this.btnSpeed100.onclick=e=>{this.currentLoco&&s.setLoco(this.currentLoco.address,this.getSpeedPercentage(100),this.currentLoco.direction)},this.fnButtons=t.getElementById("fnButtons"),this.modal=t.getElementById("modal"),this.modal.onclick=e=>{this.closeModal()};for(var o=0;o<=28;o++){let e=document.createElement("button");this.buttons[o]=e,e.fn=o,e.function=void 0,e.onpointerdown=n=>{if(this.currentLoco)if(e.function)e.function.momentary?s.setLocoFunction(this.currentLoco.address,e.fn,!0):s.setLocoFunction(this.currentLoco.address,e.fn,!e.function.isOn);else{let c=(this.currentLoco.functionMap>>e.fn&1)>0;s.setLocoFunction(this.currentLoco.address,e.fn,!c)}},e.onpointerup=n=>{e.function&&e.function.momentary&&this.currentLoco&&s.setLocoFunction(this.currentLoco.address,e.fn,!1)},e.innerHTML=`F${o}`,this.fnButtons.appendChild(e)}}init(){this.fetchLocomotives()}connectedCallback(){}async fetchLocomotives(){try{let o=await(await fetch("locos.json")).json();if(this.locomotives=o.sort((e,n)=>e.address-n.address),this.locomotives.length>0){this.locomotives.forEach(n=>{n.speed=0,n.direction=1,s.getLocoInfo(n.address)});let e=parseInt(window.localStorage.getItem("controlPanelSelectedLocoIndex"))||0;e<this.locomotives.length?this.currentLoco=this.locomotives[e]:this.currentLoco=this.locomotives[0]}}catch(t){console.error("Error fetching locomotives:",t)}}openPowerModal(){let t=this.shadowRoot.getElementById("modalContent");t.innerHTML="";let o=document.createElement("div");o.className="d-grid gap-2",t.appendChild(o);let e=document.createElement("button");e.innerHTML="MAIN ON",e.className="btn btn-success",o.appendChild(e),e.onclick=c=>{i.sendRaw("<1 MAIN>")};let n=document.createElement("button");n.innerHTML="MAIN OFF",n.className="btn btn-secondary",o.appendChild(n),n.onclick=c=>{i.sendRaw("<0>")},this.modal.style.display="flex"}openLocoModal(){let t=this.shadowRoot.getElementById("modalContent");t.innerHTML="",this.locomotives.forEach(o=>{let e=document.createElement("div");e.classList.add("loco-item"),e.innerHTML=`
                <div style="justify-content: center; align-items: center">
                    <img src="${o.imageUrl}" alt="${o.name}">
                </div>
                <div>#${o.address} ${o.name}</div>
            `,o.id===this.currentLoco?.id&&e.classList.add("selected"),e.addEventListener("click",()=>{let n=this.locomotives.findIndex(c=>c.address==o.address);window.localStorage.setItem("controlPanelSelectedLocoIndex",n.toString()),this.currentLoco=o,this.closeModal()}),t.appendChild(e)}),this.modal.style.display="flex"}closeModal(){this.modal.style.display="none"}renderLocoFunctions(){this.locoImage.src=this.currentLoco.imageUrl,this.locoName.innerText=`#${this.currentLoco.address} ${this.currentLoco.name}`;for(var t=0;t<=28;t++)this.buttons[t].className="",this.buttons[t].function=void 0,this.buttons[t].innerHTML=`F${t}`;this.currentLoco?.functions?.forEach(o=>{this.buttons[o.id].className="fnbutton",this.buttons[o.id].innerHTML=`F${o.id}<br>${o.name}`,this.buttons[o.id].function=o}),this.updateUI()}get currentLoco(){return this._currentLoco}set currentLoco(t){this._currentLoco=t,this.renderLocoFunctions()}getSpeedPercentage(t,o=127){return Math.round(o*(t/100))}getClosestSpeedThreshold(t,o=127){if(t==0)return 0;let e=[5,10,20,40,80,100],n=t/o*100;return e.reduce((c,a)=>Math.abs(n-a)<Math.abs(n-c)?a:c)}calculateRealSpeed(t){let e=t*87*3600/1e5;return Math.round(e*10)/10}calculateRealTrainSpeed(t,o=120){if(t<0||t>127)throw new Error("A DCC sebess\xE9gnek 0 \xE9s 127 k\xF6z\xF6tt kell lennie.");let e=t/127*o;return Math.round(e*10)/10}updateUI(){if(this.currentLoco){let e=this.getClosestSpeedThreshold(this.currentLoco.speed);this.btnReverse.style.backgroundColor=this.currentLoco.direction==0?"lime":"gray",this.btnStop.style.backgroundColor=this.currentLoco.speed==0?"orange":"gray",this.btnForward.style.backgroundColor=this.currentLoco.direction==1?"lime":"gray",this.btnSpeed5.style.backgroundColor=e==5?"lime":"gray",this.btnSpeed10.style.backgroundColor=e==10?"lime":"gray",this.btnSpeed20.style.backgroundColor=e==20?"lime":"gray",this.btnSpeed40.style.backgroundColor=e==40?"lime":"gray",this.btnSpeed80.style.backgroundColor=e==80?"lime":"gray",this.btnSpeed100.style.backgroundColor=e==100?"lime":"gray",this.locoInfoElement.innerHTML=this.currentLoco.speed.toString();for(var t=0;t<=28;t++){var o=(this.currentLoco.functionMap>>t&1)==1;let n=this.currentLoco.functions.find(c=>c.id==t);n&&(n.isOn=o),o?this.buttons[t].classList.add("on"):this.buttons[t].classList.remove("on")}}else this.locoInfoElement.innerHTML="Unknown Loco"}processMessage(t){if(t.type=="rawInfo"){console.log(t.data);let n=t.data.raw;for(var o=0;o<n.length;o++){var e=n[o];if(e==">")this.parse(this._data),this._data="";else if(e=="<"||e==`
`||e=="\r"){this._data="";continue}else this._data+=e}}}parse(t){if(t!="# 50"&&!t.startsWith("p1")){if(!t.startsWith("p0")){if(!t.startsWith("Q ")){if(!t.startsWith("q "))if(t.startsWith("l")){var o=t.split(" "),e=parseInt(o[1]),n=parseInt(o[3]),c=parseInt(o[4]),a=1;{var l=0;n>=2&&n<=127?(l=n-1,a=0):n>=130&&n<=255?(l=n-129,a=1):n==0?(l=0,a=0):n==128&&(l=0,a=1),this.powerInfo.emergencyStop=!1,this.power=this.powerInfo;let u=this.locomotives.find(f=>f.address==e);u&&(u.speed=l,u.direction=a,u.functionMap=c,this.currentLoco&&this.currentLoco.address==u.address&&this.updateUI())}}else t.startsWith("H")||t.startsWith("jT")||t.startsWith("Y")||t=="X"&&console.log("(<X>) UnsuccessfulOperation !")}}}}get power(){return this._power}set power(t){t.emergencyStop?this.btnEmergency.classList.add("on"):this.btnEmergency.classList.remove("on"),this._power=t}};customElements.define("loco-panel",b);console.log(b);console.log(s);var h=class{constructor(){this.config={startup:{power:"<1 MAIN>",init:"<s><T 1 1>"}};this.cp=document.createElement("loco-panel"),document.body.appendChild(this.cp),i.onOpen=()=>{i.sendRaw(this.config.startup.power),i.sendRaw(this.config.startup.init),this.cp.init()},i.onMessage=r=>{if(r.type=="rawInfo"&&r.data.raw=="<!E>"){this.cp.powerInfo.emergencyStop=!0,this.cp.power=this.cp.powerInfo,this.cp.updateUI();return}this.cp.processMessage(r)},fetch("config.json").then(r=>{if(!r.ok)throw new Error(`HTTP error ${r.status}`);return r.json()}).then(r=>{this.config=r}).catch(r=>console.error("Hiba a config.json beolvas\xE1sakor:",r)).finally(()=>{i.connect()})}sendRaw(r){let t={type:"dccexraw",data:{raw:r}};i.socket.send(JSON.stringify(t))}},_=new h;})();
