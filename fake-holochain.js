/*
**
**  Fake holochain client that connects to the shim
*/

var net = require('net'),
    fs = require('fs'),
    connections = {},
    server, client, mode
;

// prevent duplicate exit messages
var SHUTDOWN = false;

// socket files
const SHIM_SOCKETFILE = '/tmp/lair/shim-socket';

    console.log("Connecting to shim.");
client = net.createConnection(SHIM_SOCKETFILE)
        .on('connect', ()=>{
            console.log("Connected to shim");
        })
        // Messages are buffers. use toString
    .on('data', function(data) {

      const view = new Uint32Array(data.buffer);
      console.log(`got messageID ${view[1].toString(16)} from shim`);


    })
  .on('error', function(data) {
    console.error(data); process.exit(1);
  })
;

    // Handle input from stdin.
    var inputbuffer = "";
    process.stdin.on("data", function (data) {
        inputbuffer += data;
        if (inputbuffer.indexOf("\n") !== -1) {
            var line = inputbuffer.substring(0, inputbuffer.indexOf("\n"));
            inputbuffer = inputbuffer.substring(inputbuffer.indexOf("\n") + 1);
            // Let the client escape
            if(line === 'exit'){ return client_cleanup(); }
            if(line === 'quit'){ return client_cleanup(); }
            client.write(line);
        }
    });

    function client_cleanup(){
        if(!SHUTDOWN){ SHUTDOWN = true;
            console.log('\n',"Terminating.",'\n');
            client.end();
            process.exit(0);
        }
    }
    process.on('SIGINT', client_cleanup);
