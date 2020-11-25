const path				= require('path');
const log				= require('@whi/stdlog')(path.basename( __filename ), {
    level: process.env.LOG_LEVEL || 'fatal',
});

const why				= require('why-is-node-running');
const net				= require('net');
const fs				= require('fs');
const stream				= require('stream');
const EventEmitter			= require('events');

const { ConversionError,
	// LairType,
	// LairString,
	// LairSized,
	// LairPublicKey,
	// LairSignature,
	// LairKeystoreIndex,
	// LairEntryType,
	// LairDigest,
	// LairCert,
	// LairCertSNI,
	// LairCertAlgorithm,
	// LairCertPrivateKey,
	...types }			= require('./types.js');
const { LairRequest, ...structs }	= require('./structs.js');
const { MessageParser }			= require('./parser.js');



class LairClient extends EventEmitter {

    constructor ( address, options ) {
	super( options );

	const conn			= net.createConnection( address );
	conn.on('error', function(data) {
	    console.error(data);
	    process.exit(1);
	});
	conn.on('connect', () => {
	    log.info("Connected to lair");
	});

	this.conn			= conn;
	this.parser			= new MessageParser();

	conn.pipe( this.parser );

	this._sent_requests		= {};
	this.startReceiver();
    }

    async startReceiver () {
	for await ( let req of this.parser ) {
	    if ( req === null )
		continue;

	    try {
		log.normal("Received message: %s => %s", req, req.wire_type_class.IS_RESPONSE );

		if ( req.wire_type_class.IS_RESPONSE === true ) {
		    this.response( req );
		    continue;
		}

		// If there are listeners, parse message and emit, otherwise discard message.
		let bytes			= await req.payload();
	    } catch ( err ) {
		console.error( err );
		this.emit("error", err);
	    }
	}
    }

    send ( msg ) {
	return this.conn.write( msg );
    }

    TLS					= Object.keys( structs.TLS ).reduce(function (obj, name) {
	let { Request, _ }		= structs.TLS[name];
	obj[name]			= Request;
	return obj;
    }, {});

    request ( wiretype ) {
	let buf				= wiretype.toMessage();
	let mid				= buf.message_id;
	return new Promise((f,r) => {
	    this._sent_requests[ mid ]	= [f,r];
	    this.send( buf );
	});
    }

    response ( req ) {
	let mid				= req.id;
	let promise			= this._sent_requests[ mid ];
	if ( promise === undefined )
	    return log.warn("No one is waiting for response: %s", mid );

	log.info("Getting payload and delivering response to promise: %s", mid );
	req.payload().then(payload => {
	    let [f,r]			= promise;
	    try {
		let resp		= structs[req.wire_type_id].from( payload );
		f( resp );
	    } catch ( err ) {
		console.error( err );
		r(err);
	    }
	}).catch(console.error);
    }

    destroy () {
	this.conn.destroy();
	this.parser.stop();
    }
}


async function connect ( address ) {
    log.normal("Connecting to lair.");
    const client			= new LairClient( address );

    return client;
}


module.exports = {
    connect,
};
