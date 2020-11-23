const path				= require('path');
const log				= require('@whi/stdlog')(path.basename( __filename ), {
    level: process.env.LOG_LEVEL || 'silly',
});


const {
    $TYPE,
    $LAIRCLIENT,
    LairClientError,
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
}


class LairString extends LairType {
    static from ( string ) {
	if ( typeof string !== "string" && !(string instanceof String) )
	    throw new TypeError(`LairString can only be created from type String: not '${typeof string}'`);

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
Object.defineProperty(LairType, "SIZE", { value: Infinity, writable: false });


class LairSized extends LairType {

    static from ( bytes ) {
	if ( !( bytes instanceof Uint8Array ) )
	    throw new TypeError(`LairSized can only be created from a Uint8Array: not '${typeof bytes}'`);

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
Object.defineProperty(LairSized, "SIZE", { value: Infinity, writable: false });



module.exports = {
    LairType,
    LairString,
    LairSized,
    LairClientError,
    ConversionError,
};
