/*
**
**  Spike for node-js lair-shim
**
*/

var net = require('net'),
    fs = require('fs'),
    connections = {},
    server, client, mode
;

// prevent duplicate exit messages
var SHUTDOWN = false;

// socket files
const LAIR_SOCKETFILE = '/tmp/lair/socket';
const SHIM_SOCKETFILE = '/tmp/lair/shim-socket';


// the server should just pass all incoming requests to lair
// except those needed
function createServer(socket){
  console.log('Creating shim server.');
  var server = net.createServer(function(stream) {
    console.log('Connection acknowledged.');

    // Store all connections so we can terminate them if the server closes.
    // An object is better than an array for these.
    var self = Date.now();
    connections[self] = (stream);
    stream.on('end', function() {
      console.log('Client disconnected.');
      delete connections[self];
    });

    // Messages are buffers. use toString
    stream.on('data', function(data) {

      const view = new Uint32Array(data.buffer);
      console.log(`got messageID ${view[1].toString(16)} from client, forwarding to lair`);
      client.write(data);

    });
  })
      .listen(socket)
      .on('connection', function(socket){
        console.log('Shim Client connected.');
        console.log('Creating sub-client connection to lair.');
        // create a connection to lair and pass in the socket so
        // our lair client can write back to the shim's client
        doLairClient(socket);
      })
  ;
  return server;
}

// check for failed cleanup
console.log('Checking for leftover socket.');
fs.stat(SHIM_SOCKETFILE, function (err, stats) {
  if (err) {
    // start server
    console.log('No leftover socket found.');
    server = createServer(SHIM_SOCKETFILE); return;
  }
  // remove file then start server
  console.log('Removing leftover socket.')
  fs.unlink(SHIM_SOCKETFILE, function(err){
    if(err){
      // This should never happen.
      console.error(err); process.exit(0);
    }
    server = createServer(SHIM_SOCKETFILE); return;
  });
});

// close all connections when the user does CTRL-C
function server_cleanup(){
  if(!SHUTDOWN){ SHUTDOWN = true;
                 console.log('\n',"Terminating.",'\n');
                 if(Object.keys(connections).length){
                   let clients = Object.keys(connections);
                   while(clients.length){
                     let client = clients.pop();
                     connections[client].write('__disconnect');
                     connections[client].end();
                   }
                 }
                 server.close();
                 process.exit(0);
               }
}
process.on('SIGINT', server_cleanup);



function doLairClient(socket) {
  // Connect to lair.
  console.log("Connecting to lair.");
  client = net.createConnection(LAIR_SOCKETFILE)
    .on('connect', ()=>{
      console.log("Connected to lair");
    })
  // Messages are buffers. use toString
    .on('data', function(data) {

      const view = new Uint32Array(data.buffer);
      console.log(`got messageID ${view[1].toString(16)} from lair passing back through shim`);
      socket.write(data);

    })
    .on('error', function(data) {
      console.error(data); process.exit(1);
    })
  ;

  function client_cleanup(){
    if(!SHUTDOWN){ SHUTDOWN = true;
                   console.log('\n',"Terminating.",'\n');
                   client.end();
                   process.exit(0);
                 }
  }
  process.on('SIGINT', client_cleanup);
}
