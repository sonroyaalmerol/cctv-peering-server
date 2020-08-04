const WebSocket = require('ws');
const http = require("http")
const express = require("express")
const app = express()
const port = process.env.PORT || 5000
app.use(express.static(__dirname + "/"))

var server = http.createServer(app)
server.listen(port)

console.log("http server listening on %d", port)

const wss = new WebSocket.Server({ server: server });
const uuid = require('node-uuid');

var cctv = null;
var clients = {};

wss.on('connection', function connection(ws) {
  ws.id = uuid.v4();
  ws.on('message', function incoming(message) {

    message = JSON.parse(message);
    if (message.cctv && message.init) {
      // CCTV first websocket connection
      console.log('CCTV connected!');
      cctv = ws;

      cctv.on('close', function () {
        console.log(`CCTV disconnected!`)
        cctv = null;
      });

    } else if (message.cctv && !message.init) {

      console.log(`CCTV sent handshake request to ${message.clientId}!`);
      clients[message.clientId].send(JSON.stringify({ handshake: true, data: message.data }));

    } else if (!message.cctv && message.init) {

      // Clients first websocket connection
      console.log(`Client ${ws.id} connected!`);
      clients[ws.id] = ws;

      if (cctv === null) {
        console.log(`Client ${ws.id} sent: ${JSON.stringify({ online: false })}`);
        ws.send(JSON.stringify({ online: false }));
      } else {
        console.log(`Client ${ws.id} sent: ${JSON.stringify({ handshake: true, clientId: ws.id, data: message.data })}`);
        cctv.send(JSON.stringify({ handshake: true, clientId: ws.id, data: message.data }));

        clients[ws.id].on('close', function () {
          console.log(`Client ${ws.id} connection closed!`);
          cctv.send(JSON.stringify({ handshake: false, clientId: ws.id }));
          clients[ws.id] = null;
        })
      }

    } else if (!message.cctv && !message.init) {

      // Clients second (handshake request)
      console.log(`Client ${ws.id} sent: ${JSON.stringify({ handshake: true, data: message.data })}`)
      cctv.send(JSON.stringify({ handshake: true, data: message.data }));

    }
  });
});