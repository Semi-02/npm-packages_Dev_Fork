import "../style/app.css"
import { TemplateResult, html, render } from "lit-html";
import { Ref, createRef, ref } from "lit-html/directives/ref.js";
import * as flatbuffers from "flatbuffers";
import { Chatbot } from "./chatbot";
import { DialogController, OkDialog } from "./dialog_controller";
import { runCarRace } from "./screen_controller/racinggame_controller";
import { DefaultScreenController, ScreenController } from "./screen_controller/screen_controller";
import { Html} from "./utils/common";
import { IsNotNullOrEmpty, MyFavouriteDateTimeFormat, Severity, severity2class, severity2symbol} from "@klaus-liebler/commons";
import { IAppManagement, IScreenControllerHost, IWebsocketMessageListener } from "./utils/interfaces";
import RouterMenu, { IRouteHandler, Route } from "./utils/routermenu";
import {ArrayBufferToHexString} from "@klaus-liebler/commons"
import * as cfg from "@generated/runtimeconfig_ts"


class Router2ContentAdapter implements IRouteHandler {
  constructor(public readonly child: ScreenController, public readonly app: AppController) { }
  handleRoute(params: RegExpMatchArray): void {

    console.log("Router2ContentAdapter->handleRoute")
    this.app.SetMain(this.child, params)
  }
}

class BufferedMessage {
  constructor(public data: Uint8Array, public namespace: number, public maxLockingTimeMs: number) { }
}

export class AppController implements IAppManagement, IScreenControllerHost {
  private routes: Array<Route> = []
  
  private namespace2listener = new Map<number, Array<IWebsocketMessageListener>>();
  private lockingNamespace:number|null=null;
  private socket: WebSocket | null = null;
  private messageBuffer = new Array<BufferedMessage>();
  private modalSpinner: Ref<HTMLDivElement> = createRef();
  private modalSpinnerTimeoutHandle: number = -1;


  private menu = new RouterMenu("/", this.routes);
  private mainContent: ScreenController = new DefaultScreenController(this);
  private mainRef: Ref<HTMLInputElement> = createRef();
  
  private dialog: Ref<HTMLDivElement> = createRef();
  private snackbarTimeout: number = -1;

  private chatbot: Chatbot;


  public ShowDialog(d: DialogController) {
    //this.dialog.value!.innerText="";
    render(d.Template(), this.dialog.value!)
    d.Show();
  }

  public RegisterWebsocketMessageNamespace(listener: IWebsocketMessageListener, ...namespaces: number[]): (() => void){
    namespaces.forEach((n) => {
      let arr = this.namespace2listener.get(n)
      if (!arr) {
        arr = []
        this.namespace2listener.set(n, arr)
      }
      arr.push(listener)
    })
    return () => {this.Unregister(listener)}
  }


  public Unregister(listener: IWebsocketMessageListener): void{
    console.info('unregister')
    this.namespace2listener.forEach((v) => {
      v.filter((l) => {
        l != listener
      })
    })
  }
  public SendFinishedBuilder(namespace:number, b:flatbuffers.Builder, maxLockingTimeMs: number=0):void{
    var arr= b.asUint8Array()
    
    
    var m=new BufferedMessage(arr, namespace, maxLockingTimeMs)
    if (!this.socket || this.socket.readyState != this.socket.OPEN) {
      console.info('sendWebsocketMessage --> not OPEN --> buffering')
      this.messageBuffer.push(m);
      return;
    }
    this.sendMessage(m);
  }

  private sendMessage(m:BufferedMessage){
    console.debug(`Send message of Namespace ${m.namespace} with net length ${m.data.byteLength} to server`)
    const bufferLength = 4 + m.data.byteLength;
    const arrayBuffer = new ArrayBuffer(bufferLength);
    const dataView = new DataView(arrayBuffer);
    dataView.setUint32(0, m.namespace, true);
    const newData = new Uint8Array(arrayBuffer);
    newData.set(m.data, 4);
    
    if(m.maxLockingTimeMs==0){
      this.lockingNamespace=null;
    }else{
      this.lockingNamespace=m.namespace;
      this.setModal(true)
      this.modalSpinnerTimeoutHandle = <number>(<unknown>setTimeout(() => this.modalSpinnerTimeout(), m.maxLockingTimeMs)) //casting to make TypeScript happy
    }

    console.debug(`sendWebsocketMessage for namespace ${m.namespace} --> OPEN --> send to server`)
    try {
      this.socket!.send(newData)
    } catch (error: any) {
      this.setModal(false)
      if (this.modalSpinnerTimeoutHandle) {
        clearTimeout(this.modalSpinnerTimeoutHandle)
      }
      this.ShowDialog(new OkDialog(Severity.ERROR, `Error while sending a request to server:${error}`))
    }
  }

  private onWebsocketData(arrayBuffer: ArrayBuffer) {
    const dataView = new DataView(arrayBuffer);
    const namespace = dataView.getUint32(0, true);
    console.debug(`A message of namespace ${namespace} with length ${arrayBuffer.byteLength} has arrived: ${ArrayBufferToHexString(arrayBuffer)} .`)
    if (this.lockingNamespace==namespace) {
      clearTimeout(this.modalSpinnerTimeoutHandle)
      this.lockingNamespace = null
      this.setModal(false)
    }
    let bb = new flatbuffers.ByteBuffer(new Uint8Array(arrayBuffer, 4))
    //let messageWrapper = ResponseWrapper.getRootAsResponseWrapper(bb)
    const listeners = this.namespace2listener.get(namespace);
    if(!listeners ||listeners.length==0){
      console.warn(`No Listeners registered for messages with namespace ${namespace}`)
      return;
    }
    listeners.forEach((v) => {
      v.OnMessage(namespace, bb)
    })
  }


  public ShowSnackbar(severity: Severity, text: string, timeout = 3000) {
    if (this.snackbarTimeout >= 0) {
      clearInterval(this.snackbarTimeout);
    }
    var snackbar = document.getElementById("snackbar")!;
    snackbar.innerText = "";
    Html(snackbar, "span", [], [severity2class(severity)], severity2symbol(severity));
    Html(snackbar, "span", [], [], text);
    snackbar.style.visibility = "visible";
    snackbar.style.animation = "fadein 0.5s, fadeout 0.5s 2.5s";
    this.snackbarTimeout = <any>setTimeout(() => {
      snackbar.style.visibility = "hidden";
      snackbar.style.animation = "";
      this.snackbarTimeout = -1;
    }, timeout);
  }


  public SetMain(child: ScreenController, params: RegExpMatchArray) {
    this.mainContent.OnPausePublic();
    this.mainContent = child
    //this.mainRef.value!.innerText=""
    render(this.mainContent.Template(), this.mainRef.value!)
    this.mainContent.OnStartPublic();
    child.SetParameter(params)
  }

  public AddScreenController(url: string, urlPattern: RegExp, caption: TemplateResult<1>, controllerObject: ScreenController){ 
    var w = new Route(url, urlPattern, caption, new Router2ContentAdapter(controllerObject, this))
    this.routes.push(w)
    controllerObject.OnCreate();
    return controllerObject
  }

  private setModal(state: boolean) {
    this.modalSpinner.value!.style.display = state ? "flex" : "none";
  }

  private modalSpinnerTimeout() {
    this.setModal(false);
    this.ShowDialog(new OkDialog(Severity.ERROR, "Server did not respond"));
  }

  public log(text: string) {
    console.log(text)
  }

  private easteregg() {
    if(this.activateEastereggs){
      document.body.innerText = "";
      document.body.innerHTML = "<canvas id='c'>"
      var el = <HTMLCanvasElement>document.getElementById("c")!
      runCarRace(el);
    }
  }

  constructor(
    private readonly appTitle:string, 
    private readonly websocketUrl:string, 
    private readonly google_api_key_for_chatbot_or_null_to_deactivate:string|null=null, 
    private readonly activateEastereggs=false, 
    private readonly additionalFooter:string=""){}

  
  public Startup() {
    this.chatbot = new Chatbot(this.google_api_key_for_chatbot_or_null_to_deactivate);
    const bg=`<svg viewBox="0 0 1440 360" xmlns="http://www.w3.org/2000/svg"><path fill="#9EAFFD" opacity="0.3" d="M0 432 V216 Q432 43.2 864 216 V432z" /><path fill="#9EAFFD" opacity="0.7" d="M0 432 V172.8 Q432 244.8 792 172.8 T1440 158.4 V432z" /></svg>`
    const svgDataUrl = `data:image/svg+xml;base64,${btoa(bg)}`;
    const Template = html`
            <header style="background-image: url('${svgDataUrl}');">
              <span @click=${() => this.easteregg()}> ${this.appTitle} </span>
            </header>
            <nav>${this.menu.Template()}<a href="javascript:void(0);" @click=${() => this.menu.ToggleHamburgerMenu()}><i>≡</i></a></nav>
            <main ${ref(this.mainRef)}></main>
            <footer>Klaus Liebler, &copy;${new Date(1000*Number(cfg.CREATION_DT)).toLocaleString("de-DE", MyFavouriteDateTimeFormat)} :: GitHash ${cfg.GIT_SHORT_HASH} :: AppName ${cfg.APP_NAME} :: AppVersion ${cfg.APP_VERSION} ${this.additionalFooter}</footer>
            <div ${ref(this.modalSpinner)} class="modal"><span class="loader"></span></div>
            <div id="snackbar">Some text some message..</div>
            <div ${ref(this.dialog)}></div>
            ${IsNotNullOrEmpty(this.google_api_key_for_chatbot_or_null_to_deactivate)?this.chatbot.Template():""}`
    render(Template, document.body);
    console.log(`Connecting to ${this.websocketUrl}`)
    this.setModal(true);
    this.socket = new WebSocket(this.websocketUrl)
    this.socket.binaryType = 'arraybuffer'
    this.socket.onopen = (_event) => {
      console.log(`Websocket is connected.`)
      this.setModal(false);
      if (this.messageBuffer.length>0) {
        console.log(`There are ${this.messageBuffer.length} messages in buffer.`)
        for(const m of this.messageBuffer){
          this.sendMessage(m);

        }
      }
      this.messageBuffer=new Array<BufferedMessage>()
    }
    this.socket.onerror = (event: Event) => {
      console.error(`Websocket error ${JSON.stringify(event)}`)
      this.ShowSnackbar(Severity.ERROR, "Websocket Error")
      this.setModal(true);
    }
    this.socket.onmessage = (event: MessageEvent<any>) => {
      this.onWebsocketData(event.data)
    }
    this.socket.onclose = (event) => {
      if (event.code == 1000) {
        console.info('The Websocket connection has been closed normally. But why????')
        return
      }
      console.error(`Websocket has been closed: ${JSON.stringify(event)}`)
      this.ShowSnackbar(Severity.ERROR, `Websocket has been closed`)
      this.setModal(true);
    }
    this.menu.check();
    //this.chatbot.Setup();

  }

  
    
    
  
}


