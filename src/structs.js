const path				= require('path');
const log				= require('@whi/stdlog')(path.basename( __filename ), {
    level: process.env.LOG_LEVEL || 'silly',
});

const {
    LairClientError,
    HEADER_SIZE,
}					= require('./constants.js');
const {
    LairType,
    LairString,
    LairSized,
    LairPublicKey,
    LairSignature,
    ConversionError,
}					= require('./types.js');


class LairStruct extends Array {
    [Symbol.toStringTag]		= LairStruct.name;

    static from ( source, has_header_prefix = false ) {
	source				= Buffer.from( source );
	let struct			= new this();

	if ( has_header_prefix === true )
	    source			= source.slice( 16 );

	for (let i=0; i < this.PAYLOAD.length; i++) {
	    let type			= this.PAYLOAD[i];
	    let value			= type.fromSource( source );
	    source			= source.slice( value.length );

	    struct.push( value );
	}

	if ( source.length > 0 )
	    log.warn("source (%s) for struct %s still has some bytes leftover; this may be unexpected.", source.length, struct.name );

	return struct;
    }

    constructor ( ...args ) {
	super();

	if ( this.constructor.PAYLOAD.length < args.length )
	    throw new ConversionError(`Received more arguments (${args.length}) than template allows for ${this.name}`);

	this.byteLength			= HEADER_SIZE;
	for (let i=0; i < args.length; i++) {
	    let type			= this.constructor.PAYLOAD[i];
	    let value			= type.from( args[i] );

	    this.push( value );
	}
    }

    push ( value ) {
	if ( !(value instanceof LairType) )
	    throw new TypeError(`Structs can only contain LairType objects, not '${value.constructor.name}'`);

	if ( this.length === this.constructor.PAYLOAD.length )
	    throw new Error(`Cannot push another item onto ${this.constructor.name} because it already contains the expected number of payoad items.`);

	this.byteLength		       += value.length;
	return super.push( ...arguments );
    }

    toMessage ( msg_id ) {
	if (msg_id === undefined) {
	    if ( this instanceof LairResponse )
		throw new TypeError(`Message ID must be provided for Lair responses`);
	    else
		msg_id			= Math.floor(Math.random() * 2**32);
	}

	let buf				= new LairType( this.byteLength );

	buf.view.writeUInt32LE( this.byteLength );
	buf.view.writeUInt32LE( this.constructor.WIRE_TYPE,	4 );
	buf.view.writeBigUInt64LE( BigInt(msg_id),		8 );

	let position			= HEADER_SIZE;
	for (let value of this) {
	    buf.set( value, position );
	    position		       += value.length;
	}

	return buf;
    }

    value ( index ) {
	let type			= this[index];
	if ( type instanceof LairType )
	    return type.value();
	else
	    return null;
    }
}

class LairRequest extends LairStruct {
    isRequest () { return true; }
    isResponse () { return false; }
};
class LairResponse extends LairStruct {
    isRequest () { return false; }
    isResponse () { return true; }
};

class UnlockPassphraseRequest extends LairRequest {
    static WIRE_TYPE			= 4278190096;
    static PAYLOAD			= [];
}
class UnlockPassphraseResponse extends LairResponse {
    static WIRE_TYPE			= 4278190097;
    static PAYLOAD			= [ LairString ];
}

class SignByPublicKeyRequest extends LairRequest {
    static WIRE_TYPE			= 576;
    static PAYLOAD			= [ LairPublicKey, LairSized ];
}
class SignByPublicKeyResponse extends LairResponse {
    static WIRE_TYPE			= 577;
    static PAYLOAD			= [ LairSignature ];
}


module.exports = {
    LairStruct,

    // Wire Types
    UnlockPassphraseRequest,
    UnlockPassphraseResponse,
    SignByPublicKeyRequest,
    SignByPublicKeyResponse,

    // Error types
    ConversionError,
};
