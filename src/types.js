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

function assert_byte_size ( bytes, expected_length, constructor ) {
    if ( bytes.length > expected_length )
	throw new ConversionError(`Too many bytes: ${constructor.name} expected ${expected_length} bytes but there are ${bytes.length} bytes available`);
    else if ( bytes.length < expected_length )
	throw new ConversionError(`Not enough bytes: ${constructor.name} expected ${expected_length} bytes but there are only ${bytes.length} bytes available`);
}
function slice_origin ( src, start, end ) {
    return new Uint8Array(src.buffer, src.byteOffset + start, end);
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

	let bytes			= slice_origin( src, 0, this.SIZE );
	assert_byte_size( bytes, this.SIZE, this );

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
	return type.fromSource( this.view );
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

	assert_byte_size( src, size, this );
	if ( src.length < size )
	    throw new ConversionError(`Source (${src.length}) does not have enough bytes for ${this.name} (${size})`);

	const u8s			= new LairString( size );
	u8s.set( slice_origin( src, 0, size ) );

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

	assert_byte_size( src, size, this );

	const u8s			= new this( size );
	u8s.set( slice_origin( src, 0, size ) );

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




module.exports = {
    LairType,

    // Uint8Array types
    LairString,
    LairSized,
    LairPublicKey,
    LairSignature,

    // Error types
    ConversionError,
};
