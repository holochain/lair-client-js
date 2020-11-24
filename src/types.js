const path				= require('path');
const log				= require('@whi/stdlog')(path.basename( __filename ), {
    level: process.env.LOG_LEVEL || 'silly',
});


const {
    $TYPE,
    $LAIRCLIENT,
    LairClientError,
    HEADER_SIZE,
}					= require('./constants.js');;

class ConversionError extends LairClientError {
    [Symbol.toStringTag]		= ConversionError.name;
}

function assert_byte_size ( bytes, expected_length ) {
    if ( bytes.length > expected_length )
	throw new ConversionError(`Too many bytes: expected ${expected_length} bytes but received ${bytes.length} bytes`);
    else if ( bytes.length < expected_length )
	throw new ConversionError(`Not enough bytes: expected ${expected_length} bytes but received ${bytes.length} bytes`);
}


const type_converters			= {
    "string": function ( buf ) {
	const len			= buf.readBigInt64LE();
	const str			= buf.slice(8);

	assert_byte_size( str, len );

	return str.toString();
    },
    "sized": function ( buf ) {
	const len			= buf.readBigInt64LE();
	const bytes			= buf.slice(8);

	assert_byte_size( bytes, len );

	return bytes;
    },
}


class LairType extends Uint8Array {
    [$TYPE]				= $LAIRCLIENT;
    [Symbol.toStringTag]		= LairType.name;

    static [Symbol.hasInstance] ( instance ) {
	if ( instance[$TYPE] !== $LAIRCLIENT )
	    return false;

	if ( instance.constructor.name === this.name )
	    return true;
	if ( instance[Symbol.toStringTag] === this.name )
	    return true;

	return false;
    }

    static fromSource ( bytes ) {
	if ( this.SIZE === Infinity )
	    throw new ConversionError(`Cannot use LairType.fromSource for types without a fixed size (${this.SIZE})`);

	return this.from( bytes );
    }

    static from ( src ) {
	if ( this.SIZE === Infinity )
	    throw new ConversionError(`Cannot use LairType.from for types without a fixed size (${this.SIZE})`);

	if ( !( src instanceof Uint8Array ) )
	    throw new TypeError(`${this.name} can only be created from a Uint8Array: not '${typeof src}'`);

	let bytes			= new Uint8Array(src.buffer, src.byteOffset, this.SIZE);
	let u8s				= new this( this.SIZE );
	u8s.set( bytes );

	return u8s;
    }

    constructor ( length ) {
	// TypedArray constructor options:
	//
	//     new TypedArray(); // new in ES2017
	//     new TypedArray(length);			-- we purposefully only support this one
	//     new TypedArray(typedArray);
	//     new TypedArray(object);
	//     new TypedArray(buffer [, byteOffset [, length]]);
	//

	const buf			= Buffer.allocUnsafe( length );
	super( buf.buffer, buf.byteOffset, buf.length );

	this.view			= buf;
    }

    toType ( type ) {
	return type_converters[type]( this.view );
    }

    toHex ( prefix = false ) {
	return (prefix === true ? "0x" : "") + this.view.toString("hex");
    }

    value () {
	// This creates a new ArrayBuffer so that this.view cannot be affected by caller.
	return this.view.slice();
    }
}


class LairString extends LairType {

    static fromSource ( src ) {
	if ( src.length < 8 )
	    throw new ConversionError(`Source (${src.length}) does not have enough bytes to get ${this.name} size (min. 8 bytes)`);

	const str_len			= parseInt( src.readBigUInt64LE() );
	const size			= 8 + str_len;

	if ( src.length < size )
	    throw new ConversionError(`Source (${src.length}) does not have enough bytes for ${this.name} (${size})`);

	const u8s			= new LairString( size );
	u8s.set( new Uint8Array(src.buffer, src.byteOffset, size) );

	return u8s;
    }

    static from ( string ) {
	if ( typeof string !== "string" && !(string instanceof String) )
	    throw new TypeError(`${this.constructor.name} can only be created from type String: not '${typeof string}'`);

	const size			= Buffer.byteLength( string );
	const u8s			= new LairString( 8 + size );

	u8s.view.writeBigUInt64LE( BigInt(size),	0 );
	u8s.view.write( string,				8 );

	return u8s;
    }

    value () {
	// Parsing a Big Int to Int
	// - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/MAX_SAFE_INTEGER
	//
	// Since the total message size is limited to 4 bytes, we should never run into a large
	// number parsing issue.
	let length			= this.view.readBigInt64LE();
	return this.view.toString( undefined, 8, 8 + parseInt(length) );
    }
}
Object.defineProperty( LairType, "SIZE", { value: Infinity, writable: false });


class LairSized extends LairType {

    static fromSource ( src ) {
	if ( src.length < 8 )
	    throw new ConversionError(`Source (${src.length}) does not have enough bytes to get ${this.name} size (min. 8 bytes)`);

	const byte_len			= parseInt( src.readBigUInt64LE() );
	const size			= 8 + byte_len;

	if ( src.length < size )
	    throw new ConversionError(`Source (${src.length}) does not have enough bytes for ${this.name} (${size})`);

	const u8s			= new this( size );
	u8s.set( new Uint8Array(src.buffer, src.byteOffset, size) );

	return u8s;
    }

    static from ( bytes ) {
	if ( !( bytes instanceof Uint8Array ) )
	    throw new TypeError(`${this.constructor.name} can only be created from a Uint8Array: not '${typeof bytes}'`);

	const size			= bytes.length;
	const u8s			= new LairSized( 8 + size );

	u8s.view.writeBigUInt64LE( BigInt(size),	0 );
	u8s.view.fill( bytes,				8 );

	return u8s;
    }

    value () {
	// This creates a new ArrayBuffer so that this.view cannot be affected by caller.
	return this.view.slice( 8 );
    }
}
Object.defineProperty( LairSized, "SIZE", { value: Infinity, writable: false });


class LairPublicKey extends LairType {}
Object.defineProperty( LairPublicKey, "SIZE", { value: 32, writable: false });


class LairSignature extends LairType {}
Object.defineProperty( LairSignature, "SIZE", { value: 64, writable: false });



class LairStruct extends Array {
    [Symbol.toStringTag]		= LairStruct.name;

    static from ( source, has_header_prefix = false ) {
	let struct			= new this();

	if ( has_header_prefix === true )
	    source			= source.slice( 16 );

	for (let i=0; i < this.PAYLOAD.length; i++) {
	    let type			= this.PAYLOAD[i];

	    struct[i]			= type.fromSource( source.view );
	    source			= source.slice( struct[i].length );
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
	for (let i=0; i < this.constructor.PAYLOAD.length; i++) {
	    let type			= this.constructor.PAYLOAD[i];
	    let value			= args[i] === undefined
		? []
		: type.from( args[i] );

	    this.push( value );
	    this.byteLength	       += value.length;
	}
    }

    toBuffer ( msg_id ) {
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
    LairType,
    LairString,
    LairSized,
    LairStruct,
    UnlockPassphraseRequest,
    UnlockPassphraseResponse,
    SignByPublicKeyRequest,
    SignByPublicKeyResponse,
    LairClientError,
    ConversionError,
};
