const path				= require('path');
const log				= require('@whi/stdlog')(path.basename( __filename ), {
    level: process.env.LOG_LEVEL || 'fatal',
});

const why				= require('why-is-node-running');
const net				= require('net');
const fs				= require('fs');


const MSG_LEN_SIZE			= 4;
const WIRE_TYPE_SIZE			= 4;
const MSG_ID_SIZE			= 8;
const HEADER_SIZE			= MSG_LEN_SIZE + WIRE_TYPE_SIZE + MSG_ID_SIZE;


function msg_string ( str ) {
    log.debug("Creating string from '%s'", str );
    let buf			= Buffer.alloc( 8 + str.length );
    buf.writeBigUInt64LE( BigInt(str.length) );
    buf.write( str,					8 );
    return buf;
}


async function connect ( address ) {
    log.normal("Connecting to lair.");
    const client			= net.createConnection( address );
    client.on('error', function(data) {
	console.error(data);
	process.exit(1);
    });
    client.on('connect', () => {
	log.info("Connected to lair");
    });

    function parse_message ( buf ) {
	return {
	    "length":		buf.readUInt32LE(),
	    "wire_type":	buf.readUInt32LE(4),
	    "id":		buf.readBigUInt64LE(8),
	    "payload":		buf.slice(16),
	};
    }

    function create_message ( msg_id, wire_type, payload ) {
	let msg_len		= HEADER_SIZE + payload.length;
	log.debug("Message length should be %s", msg_len );

	let message			= Buffer.alloc( msg_len );
	message.writeUInt32LE( msg_len );
	message.writeUInt32LE( wire_type,		4 );
	message.writeBigUInt64LE( BigInt(msg_id),	8 );
	message.fill( payload,				16 );

	return message;
    }

    function create_passphrase_response ( req ) {
	let passphrase			= "";
	let payload			= msg_string( passphrase );
	let message			= create_message( req.id, 4278190097, payload );
	return message;
    }

    function create_new_key_request () {
	let message			= create_message( 1, 528, [] );
	return message;
    }

    client.on('data', function( buf ) {
	let req				= parse_message( buf );
	log.silly("Received request (%s): %s", buf.length, buf.toString("hex") );

	log.info("Received (#%s) WT %s with payload length %s",
		 req.id, req.wire_type, req.payload.length );

	let message;
	switch ( req.wire_type ) {
	case 4278190096:
	    message			= create_passphrase_response( req );

	    setTimeout(() => {
		let new_key		= create_new_key_request();

		log.silly("Sending new key request (%s): %s", new_key.length, new_key.toString("hex") );
		client.write( new_key );
	    }, 100 );
	    break;
	case 529:
	    log.normal("Got expected response: #%s", req.id );

	    log.debug("Finished responding to message (#%s)", req.id );
	    return client.destroy();
	    break;
	default:
	    log.error("Unhandled wire type: %s", req.wire_type );
	    return;
	}

	log.silly("Sending response (%s): %s", message.length, message.toString("hex") );
	client.write( message );
    });

    return client;
}


module.exports = {
    connect,
};
