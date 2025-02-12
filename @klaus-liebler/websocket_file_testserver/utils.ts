import http from "node:http"
import https from "node:https"
import * as fs from "node:fs"
import * as flatbuffers from "flatbuffers"
import * as weso from "ws"
import * as path from "node:path"
import * as forge from "node-forge";
import { PeerCertificate, TLSSocket } from "node:tls"

export interface ISender{
    send(ns:number, builder:flatbuffers.Builder):void;
 }

export abstract class NamespaceAndHandler{
    constructor(public readonly namespace:number){}
    public abstract Handle(buffer: flatbuffers.ByteBuffer, sender: ISender);
}

const WEBSERVER_PORT = 3000;
const AUTHSERVER_PORT = 3001;
var websocket_server:weso.WebSocketServer;
var http_server: http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>;



export function StartServers(sslCertificatesRoot:string, handlers:Array<NamespaceAndHandler>){
    websocket_server = new weso.WebSocketServer({ noServer: true });
    websocket_server.on('connection', (ws: weso.WebSocket) => {
        console.info("Handle connection");
        ws.on('error', console.error);
        ws.on('message', (buffer: Buffer, isBinary: boolean) => {
            var b_req = new flatbuffers.ByteBuffer(new Uint8Array(buffer.buffer, buffer.byteOffset + 4, buffer.length - 4));
            let ns = buffer.readUint32LE(0);
            console.log(`Received buffer length ${buffer.byteLength} for Namespace ${ns}`);
            var cb = new class implements ISender{
                public send(ns:number, builder:flatbuffers.Builder){
                    const data = builder.asUint8Array();
                    const arrayBuffer = new ArrayBuffer(4 + data.byteLength);
                    new DataView(arrayBuffer).setUint32(0, ns, true);
                    const newData = new Uint8Array(arrayBuffer);
                    newData.set(data, 4);
                    ws.send(newData);
                      
                }
            }
            const h =handlers.find(h=>h.namespace==ns);
            if(!h){
                console.error(`No handler registered for namespace ${ns}`);
                return;
            }
            h.Handle(b_req, cb);
        });
    });
    http_server = http.createServer((req, res) => {
        //let server = https.createServer({key: hostPrivateKey, cert: hostCert}, (req, res) => {
        console.log(`Request received for '${req.url}'`);
        //var local_path = new URL(req.url).pathname;
    
        if (req.method == "POST" && req.url!.startsWith("/files")) {
            const req_body_chunks: any[] = [];
            req.on("data", (chunk: any) => req_body_chunks.push(chunk));
            req.on("end", () => {
                var p = path.join("./", req.url!)
                fs.mkdirSync(path.dirname(p.toString()), { recursive: true });
                fs.writeFileSync(p, Buffer.concat(req_body_chunks), {});
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.write('<p>OK</p>');
                res.end();
                //process(res, req.url!, Buffer.concat(req_body_chunks));
            });
        }
        else if (req.method == "GET" && req.url!.startsWith("/files")) {
            if (req.url!.endsWith("/")) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                var ret = { files: new Array<string>(), dirs: new Array<string>() }
                for (const f of fs.readdirSync(path.join("./", req.url!.slice(0, -1)), { withFileTypes: true })) {
                    if (f.isFile()) ret.files.push(f.name);
                    if (f.isDirectory()) ret.dirs.push(f.name);
                }
                res.write(JSON.stringify(ret));
                res.end();
            } else {
                try {
                    var p = path.join("./", req.url!)
                    var b = fs.readFileSync(p);
                    res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
                    res.write(b);
                    res.end();
                }
                catch (error) {
                    res.writeHead(500);
                    res.write("Resource not available");
                    res.end();
                }
            }
        } else {
            console.log(`Request unknwon '${req.url}'`);
            res.writeHead(404);
            res.end("Not found");
        }
    });
    
    http_server.on('upgrade', (req, sock, head) => {
        if (req.url == '/webmanager_ws') {
            console.info("Handle upgrade to websocket");
            websocket_server.handleUpgrade(req, sock, head, ws => websocket_server.emit('connection', ws, req));
        } else {
            sock.destroy();
        }
    });
    
    http_server.on("error", (e) => {
        console.error(e);
    })
    
    http_server.listen(WEBSERVER_PORT, () => {
        console.log(`Webserver with Websockets is running on port ${WEBSERVER_PORT}`);
    });

    let hostCert = fs.readFileSync(path.join(sslCertificatesRoot, "testserver.pem.crt")).toString();
    let hostPrivateKey = fs.readFileSync(path.join(sslCertificatesRoot, "testserver.pem.key")).toString();
    let clientCert = fs.readFileSync(path.join(sslCertificatesRoot, "client.pem.crt")).toString();
    let clientPrivateKey = fs.readFileSync(path.join(sslCertificatesRoot, "client.pem.key")).toString();
    let rootCACert = fs.readFileSync(path.join(sslCertificatesRoot, "rootCA.pem.crt")).toString();
    let authserver = https.createServer({ key: hostPrivateKey, cert: hostCert, requestCert:true, rejectUnauthorized:false, ca:[hostCert] }, (req, res) => {
        console.log(`Request received for '${req.url}'`);
        const peerCert = ((req.socket) as TLSSocket).getPeerCertificate();
        //var local_path = new URL(req.url).pathname;

        if (req.method == "GET" && req.url!.startsWith("/labathome")) {
            const i = peerCert.issuer.CN;
            if(peerCert.issuer.CN!="AAA Klaus Liebler personal Root CA"){
                return res.writeHead(401).end(`Certificate is not signed from right rootCA, but from ${i}`);
            }
            if (!peerCert.subject) {
                return res.writeHead(401).end(`Sorry, but you need to provide a client certificate to continue.`);
            }
            const cn = peerCert.subject.CN;
            if(!(cn.startsWith("mosquitto") ||cn.startsWith("labathome"))){
                return res.writeHead(403).end(`Sorry ${peerCert.subject.CN}, certificates from ${peerCert.issuer.CN} are not welcome here.`);
            }
            
            res.writeHead(200).end(`Welcome ${cn} with certificate from ${peerCert.issuer.CN}. Access granted is ${extractCustomExtension(peerCert)}`);

        } else {
            console.log(`Request unknwon '${req.url}'`);
            res.writeHead(404);
            res.end("Not found");
        }
    });


    authserver.on("error", (e) => {
        console.error(e);
    })

    authserver.listen(AUTHSERVER_PORT, () => {
        console.log(`AuthServer is running on port ${AUTHSERVER_PORT}`);
        
    });
}






function extractCustomExtension(peerCert:PeerCertificate) {
    const cert = forge.pki.certificateFromPem('-----BEGIN CERTIFICATE-----\n' + peerCert.raw.toString('base64') + '\n-----END CERTIFICATE-----');
    const ext = (cert.extensions as Array<any>).find(v=>v.id== '1.3.6.1.4.1.54392.5.2757');
    return ext?.value;
  };


