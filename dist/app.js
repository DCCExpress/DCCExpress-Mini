"use strict";(()=>{var f=class{sendRaw(r){this.send({type:"dccexraw",data:{raw:r}})}constructor(){}connect(){let r=document.location.protocol==="https:"?"wss:":"ws:",t=document.location.host;document.location.hostname=="127.0.0.1"&&(t="192.168.1.143");let o=`${r}//${t}/ws`;console.log(`Connecting to ${o}`),this.socket=new WebSocket(o),this.socket.onopen=()=>{console.log("WebSocket connection established."),this.onOpen&&this.onOpen()},this.socket.onmessage=n=>{try{let e=n.data.toString().replace(/[\n\r\t]/g,""),i=JSON.parse(e);this.onMessage(i)}catch{console.error("Invalid message format received:",n.data)}},this.socket.onclose=()=>{this.onClosed&&this.onClosed(),console.warn("WebSocket connection closed. Reconnecting..."),setTimeout(()=>this.connect(),1e3)},this.socket.onerror=n=>{this.onError&&this.onError(),console.error("WebSocket error:",n)},this.task&&clearInterval(this.task),this.task=setInterval(()=>{s.getSupportedLocos()},1e3)}send(r){this.socket.readyState===WebSocket.OPEN?this.socket.send(JSON.stringify(r)):console.warn("Cannot send message. WebSocket is not open.")}onMessage(r){console.log("Processing message:",r)}},c=new f;var s=class d{static format(r){return{type:"dccexraw",data:{raw:r}}}static setLoco(r,t,o){c.send(d.format(`<t ${r} ${t} ${o}>`))}static getLocoInfo(r){c.send(d.format(`<t ${r}>`))}static setLocoFunction(r,t,o){c.send(d.format(`<F ${r} ${t} ${o?1:0}>`))}static emergencyStop(){c.send(d.format("<!>"))}static getSupportedLocos(){c.send(d.format("<c>"))}static setTurnout(r){r.isAccessry||c.send(d.format(`<T ${r.address} ${r.isClosed?0:1}>`))}static getAllTurnout(){c.send(d.format("<T>"))}};var h=class extends HTMLElement{constructor(){super();this.locomotives=[];this.buttons={};this._data="";this.turnouts=[];this._powerInfo={current:0,emergencyStop:!1,info:0,programmingModeActive:!1,shortCircuit:!1,trackVoltageOn:!1};let t=this.attachShadow({mode:"open"});t.innerHTML=`
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
        `,this.locoImage=t.getElementById("locoImage"),this.locoName=t.getElementById("locoName"),this.locoInfoSpeedElement=t.getElementById("locoInfoSpeed"),this.locoInfoPowerElement=t.getElementById("locoInfoPower"),this.locoModeInfoElement=t.getElementById("locoModeInfo"),this.locoImage.addEventListener("click",()=>this.openLocoModal()),t.getElementById("closeModal")?.addEventListener("click",()=>this.closeModal()),this.btnPower=t.getElementById("btnPower"),this.btnPower.onclick=e=>{this.openPowerModal()},this.btnEmergency=t.getElementById("btnEmergency"),this.btnEmergency.onclick=e=>{s.emergencyStop()},this.btnReverse=t.getElementById("btnReverse"),this.btnReverse.onclick=e=>{this.currentLoco&&s.setLoco(this.currentLoco.address,this.currentLoco.speed,0)},this.btnStop=t.getElementById("btnStop"),this.btnStop.onclick=e=>{this.currentLoco&&s.setLoco(this.currentLoco.address,0,this.currentLoco.direction)},this.btnForward=t.getElementById("btnForward"),this.btnForward.onclick=e=>{this.currentLoco&&s.setLoco(this.currentLoco.address,this.currentLoco.speed,1)},this.btnSpeed5=t.getElementById("btnSpeed5"),this.btnSpeed5.onclick=e=>{this.currentLoco&&s.setLoco(this.currentLoco.address,this.getSpeedPercentage(5),this.currentLoco.direction)},this.btnSpeed10=t.getElementById("btnSpeed10"),this.btnSpeed10.onclick=e=>{this.currentLoco&&s.setLoco(this.currentLoco.address,this.getSpeedPercentage(10),this.currentLoco.direction)},this.btnSpeed20=t.getElementById("btnSpeed20"),this.btnSpeed20.onclick=e=>{this.currentLoco&&s.setLoco(this.currentLoco.address,this.getSpeedPercentage(20),this.currentLoco.direction)},this.btnSpeed40=t.getElementById("btnSpeed40"),this.btnSpeed40.onclick=e=>{this.currentLoco&&s.setLoco(this.currentLoco.address,this.getSpeedPercentage(40),this.currentLoco.direction)},this.btnSpeed80=t.getElementById("btnSpeed80"),this.btnSpeed80.onclick=e=>{this.currentLoco&&s.setLoco(this.currentLoco.address,this.getSpeedPercentage(80),this.currentLoco.direction)},this.btnSpeed100=t.getElementById("btnSpeed100"),this.btnSpeed100.onclick=e=>{this.currentLoco&&s.setLoco(this.currentLoco.address,this.getSpeedPercentage(100),this.currentLoco.direction)},this.fnButtons=t.getElementById("fnButtons"),this.modal=t.getElementById("modal"),this.modal.onclick=e=>{e.target==this.modal&&this.closeModal()};let o=t.getElementById("btnTurnouts");o.onclick=e=>{this.openTurnoutsModal()};for(var n=0;n<=28;n++){let e=document.createElement("button");this.buttons[n]=e,e.fn=n,e.function=void 0,e.onpointerdown=i=>{if(this.currentLoco)if(e.function)e.function.momentary?s.setLocoFunction(this.currentLoco.address,e.fn,!0):s.setLocoFunction(this.currentLoco.address,e.fn,!e.function.isOn);else{let l=(this.currentLoco.functionMap>>e.fn&1)>0;s.setLocoFunction(this.currentLoco.address,e.fn,!l)}},e.onpointerup=i=>{e.function&&e.function.momentary&&this.currentLoco&&s.setLocoFunction(this.currentLoco.address,e.fn,!1)},e.innerHTML=`F${n}`,this.fnButtons.appendChild(e)}}getSvgTurnoutClosed(t,o){return`
 <svg width="48" height="48" viewBox="0 0 12 12" id="turnout${t}" xmlns="http://www.w3.org/2000/svg">
   <g ${o?'transform="scale(-1 1)  translate(-12 0)"':""} >
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
 `}getSvgTurnoutThrown(t,o){return`
 <svg width="48" height="48" viewBox="0 0 12 12" id="turnout${t}" xmlns="http://www.w3.org/2000/svg">
   <g ${o?'transform="scale(-1 1)  translate(-12 0)"':""} >
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
 `}init(){this.fetchLocomotives(),this.fetchTurnouts()}connectedCallback(){}async fetchLocomotives(){try{let o=await(await fetch("locos.json")).json();if(this.locomotives=o.sort((n,e)=>n.address-e.address),this.locomotives.length>0){this.locomotives.forEach(e=>{e.speed=0,e.direction=1,s.getLocoInfo(e.address)});let n=parseInt(window.localStorage.getItem("controlPanelSelectedLocoIndex"))||0;n<this.locomotives.length?this.currentLoco=this.locomotives[n]:this.currentLoco=this.locomotives[0]}}catch(t){console.error("Error fetching locomotives:",t)}}async fetchTurnouts(){try{let o=await(await fetch("turnouts.json")).json();this.turnouts=o.sort((n,e)=>n.address-e.address),s.getAllTurnout()}catch(t){console.error("Error fetching turnouts:",t)}}openPowerModal(){let t=this.shadowRoot.getElementById("modalContent");t.innerHTML="";let o=document.createElement("div");o.className="d-grid gap-2",t.appendChild(o);let n=document.createElement("button");n.innerHTML="MAIN ON",n.className="btn btn-success",o.appendChild(n),n.onclick=i=>{c.sendRaw("<1 MAIN>")};let e=document.createElement("button");e.innerHTML="MAIN OFF",e.className="btn btn-secondary",o.appendChild(e),e.onclick=i=>{c.sendRaw("<0>")},this.modal.style.display="flex"}openLocoModal(){let t=this.shadowRoot.getElementById("modalContent");t.innerHTML="",this.locomotives.forEach(o=>{let n=document.createElement("div");n.classList.add("loco-item"),n.innerHTML=`
                <div style="justify-content: center; align-items: center">
                    <img src="${o.imageUrl}" alt="${o.name}">
                </div>
                <div>#${o.address} ${o.name}</div>
            `,o.id===this.currentLoco?.id&&n.classList.add("selected"),n.addEventListener("click",()=>{let e=this.locomotives.findIndex(i=>i.address==o.address);window.localStorage.setItem("controlPanelSelectedLocoIndex",e.toString()),this.currentLoco=o,this.closeModal()}),t.appendChild(n)}),this.modal.style.display="flex"}openTurnoutsModal(){let t=this.shadowRoot.getElementById("modalContent");t.innerHTML="",this.turnouts.forEach(o=>{let n=document.createElement("div");n.classList.add("loco-item");let e=o.isClosed?this.getSvgTurnoutClosed(o.address,o.isLeft):this.getSvgTurnoutThrown(o.address,o.isLeft);n.innerHTML=`
                <div style="height: 60px; width: 60px; display: flex; justify-content: center; align-items: center; background-color: gray">
                    ${e}
                </div>
                <div>#${o.address} ${o.name}</div>
            `,n.addEventListener("click",()=>{let i=this.turnouts.find(l=>o.address==l.address);i&&(i.isClosed=!i.isClosed,s.setTurnout(i))}),t.appendChild(n)}),this.modal.style.display="flex"}closeModal(){this.modal.style.display="none"}renderLocoFunctions(){this.locoImage.src=this.currentLoco.imageUrl,this.locoName.innerText=`#${this.currentLoco.address} ${this.currentLoco.name}`;for(var t=0;t<=28;t++)this.buttons[t].className="",this.buttons[t].function=void 0,this.buttons[t].innerHTML=`F${t}`;this.currentLoco?.functions?.forEach(o=>{this.buttons[o.id].className="fnbutton",this.buttons[o.id].innerHTML=`F${o.id}<br>${o.name}`,this.buttons[o.id].function=o}),this.updateUI()}get currentLoco(){return this._currentLoco}set currentLoco(t){this._currentLoco=t,this.renderLocoFunctions()}getSpeedPercentage(t,o=126){return Math.round(o*(t/100))}getClosestSpeedThreshold(t,o=126){if(t==0)return 0;let n=[5,10,20,40,80,100],e=t/o*100;return n.reduce((i,l)=>Math.abs(e-l)<Math.abs(e-i)?l:i)}calculateRealSpeed(t){let n=t*87*3600/1e5;return Math.round(n*10)/10}calculateRealTrainSpeed(t,o=120){if(t<0||t>127)throw new Error("A DCC sebess\xE9gnek 0 \xE9s 127 k\xF6z\xF6tt kell lennie.");let n=t/127*o;return Math.round(n*10)/10}updateUI(){if(this.currentLoco){let n=this.getClosestSpeedThreshold(this.currentLoco.speed);this.btnReverse.style.backgroundColor=this.currentLoco.direction==0?"lime":"gray",this.btnStop.style.backgroundColor=this.currentLoco.speed==0?"orange":"gray",this.btnForward.style.backgroundColor=this.currentLoco.direction==1?"lime":"gray",this.btnSpeed5.style.backgroundColor=n==5?"lime":"gray",this.btnSpeed10.style.backgroundColor=n==10?"lime":"gray",this.btnSpeed20.style.backgroundColor=n==20?"lime":"gray",this.btnSpeed40.style.backgroundColor=n==40?"lime":"gray",this.btnSpeed80.style.backgroundColor=n==80?"lime":"gray",this.btnSpeed100.style.backgroundColor=n==100?"lime":"gray",this.locoInfoSpeedElement.innerHTML=this.currentLoco.speed.toString();for(var t=0;t<=28;t++){var o=(this.currentLoco.functionMap>>t&1)==1;let e=this.currentLoco.functions.find(i=>i.id==t);e&&(e.isOn=o),o?this.buttons[t].classList.add("on"):this.buttons[t].classList.remove("on")}}else this.locoInfoSpeedElement.innerHTML="Unknown Loco"}processMessage(t){if(t.type=="rawInfo"){let e=t.data.raw;for(var o=0;o<e.length;o++){var n=e[o];if(n==">")this.parse(this._data),this._data="";else if(n=="<"||n==`
`||n=="\r"){this._data="";continue}else this._data+=n}}if(t.type=="ack")switch(t.data){case"<!>":this.powerInfo.emergencyStop=!0,this.powerInfo=this.powerInfo;break}}parse(t){if(t!="# 50"){if(t.startsWith("c CurrentMAIN")){let a=t.split(" ");this.powerInfo.current=parseInt(a[2]),this.locoInfoPowerElement.innerHTML=this.powerInfo.current.toString()}else if(t.startsWith("p1")){console.log(t);let a=t.split(" ");this.powerInfo.info=1,a[1]=="MAIN"||a[1]=="A"?this.powerInfo.trackVoltageOn=!0:(a[1]=="PROG"||a[1]=="B")&&(this.powerInfo.programmingModeActive=!0),this.powerInfo=this.powerInfo}else if(t.startsWith("p0")){console.log(t);let a=t.split(" ");this.powerInfo.info=0,a.length==2?(a[1]=="MAIN"||a[1]=="A"?this.powerInfo.trackVoltageOn=!1:(a[1]=="PROG"||a[1]=="B")&&(this.powerInfo.programmingModeActive=!1),this.powerInfo=this.powerInfo):(this.powerInfo.trackVoltageOn=!1,this.powerInfo.programmingModeActive=!1)}else if(!t.startsWith("Q ")){if(!t.startsWith("q "))if(t.startsWith("l")){console.log(t);var o=t.split(" "),n=parseInt(o[1]),e=parseInt(o[3]),i=parseInt(o[4]),l=1;{var u=0;e>=2&&e<=127?(u=e-1,l=0):e>=130&&e<=255?(u=e-129,l=1):e==0?(u=0,l=0):e==128&&(u=0,l=1),this.powerInfo.emergencyStop=e==129,this.powerInfo=this.powerInfo;let a=this.locomotives.find(w=>w.address==n);a&&(a.speed=u,a.direction=l,a.functionMap=i,this.currentLoco&&this.currentLoco.address==a.address&&this.updateUI())}}else if(t.startsWith("H")){console.log(t);var o=t.split(" "),n=parseInt(o[1]),m=parseInt(o[2])==0;let g=this.turnouts.find(L=>L.address==n);g&&(g.isClosed=m!=g.isInverted)}else t.startsWith("jT")||t.startsWith("Y")||t=="X"&&console.log("(<X>) UnsuccessfulOperation !")}}}get powerInfo(){return this._powerInfo}set powerInfo(t){this._powerInfo=t,t.trackVoltageOn?this.btnPower.style.backgroundColor="green":this.btnPower.style.backgroundColor="#555555",t.emergencyStop?this.btnEmergency.style.backgroundColor="red":this.btnEmergency.style.backgroundColor="#555555"}};customElements.define("loco-panel",h);console.log(h);console.log(s);var p=class{constructor(){this.config={startup:{power:"<1 MAIN>",init:`<s>
<T 1 DCC 1>`}};this.cp=document.createElement("loco-panel"),document.body.appendChild(this.cp),c.onOpen=()=>{c.sendRaw(this.config.startup.power),c.sendRaw(this.config.startup.init),this.cp.init()},c.onClosed=()=>{},c.onMessage=r=>{this.cp.processMessage(r)},fetch("config.json").then(r=>{if(!r.ok)throw new Error(`HTTP error ${r.status}`);return r.json()}).then(r=>{this.config=r}).catch(r=>console.error("Hiba a config.json beolvas\xE1sakor:",r)).finally(()=>{c.connect()})}sendRaw(r){let t={type:"dccexraw",data:{raw:r}};c.socket.send(JSON.stringify(t))}},_=new p;})();
