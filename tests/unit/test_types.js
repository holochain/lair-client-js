const path				= require('path');
const log				= require('@whi/stdlog')(path.basename( __filename ), {
    level: process.env.LOG_LEVEL || 'fatal',
});

const expect				= require('chai').expect;
const { LairType,
	LairString,
	LairSized,
	LairStruct,
	UnlockPassphraseRequest,
	UnlockPassphraseResponse,
	SignByPublicKeyRequest,
	SignByPublicKeyResponse,
	ConversionError }		= require('../../src/types.js');

const compress				= str => str.replace(/ /g, "");

function types_tests () {
    it("should encode/decode type 'string'", async () => {
	const value			= "こんにちは世界";
	let bytes			= LairString.from( value );

	expect( bytes			).to.be.a("LairType");
	expect( bytes instanceof LairType ).to.be.true;
	expect( bytes instanceof LairString ).to.be.true;
	expect( bytes.toHex()		).to.equal( compress("15 00 00 00 00 00 00 00 e3 81 93 e3 82 93 e3 81 ab e3 81 a1 e3 81 af e4 b8 96 e7 95 8c") );

	expect(() => {
	    LairString.from( 10 );
	}).to.throw("not 'number'", TypeError);


	let string			= bytes.value();

	expect( string			).to.equal( value );

	expect(() => {
	    bytes[0]			= 100;
	    bytes.toType( LairString );
	}).to.throw("Not enough bytes: LairString", ConversionError);

	expect(() => {
	    bytes[0]			= 1;
	    bytes.toType( LairString );
	}).to.throw("Too many bytes: LairString", ConversionError);
    });

    it("should encode/decode type 'sized'", async () => {
	const value			= Buffer.from("Hello World!");
	let bytes			= LairSized.from( value );

	expect( bytes			).to.be.a("LairType");
	expect( bytes instanceof LairType ).to.be.true;
	expect( bytes instanceof LairSized ).to.be.true;
	expect( bytes instanceof LairString ).to.be.false;
	expect( bytes.toHex()		).to.equal( compress("0c 00 00 00 00 00 00 00 48 65 6c 6c 6f 20 57 6f 72 6c 64 21") );

	expect(() => {
	    LairSized.from("invalid");
	}).to.throw("not 'string'", TypeError);


	let sized			= bytes.value();

	expect( sized			).to.deep.equal( value );

	expect(() => {
	    bytes[0]			= 100;
	    bytes.toType( LairSized );
	}).to.throw("Not enough bytes: LairSized", ConversionError);

	expect(() => {
	    bytes[0]			= 1;
	    bytes.toType( LairSized );
	}).to.throw("Too many bytes: LairSized", ConversionError);
    });

    it("should encode/decode wire type 'Unlock Passphrase Response (4278190097)'", async () => {
	let passphrase			= "Passw0rd!";
	let wiretype			= new UnlockPassphraseResponse( passphrase );
	expect( wiretype		).to.be.a("LairStruct");
	expect( wiretype.isResponse()	).to.be.true;
	expect( wiretype instanceof UnlockPassphraseResponse ).to.be.true;
	expect( wiretype.byteLength	).to.equal( 33 );

	let bytes			= wiretype.toMessage( 1 );
	expect( bytes.toHex()		).to.equal( compress("21 00 00 00 11 00 00 ff 01 00 00 00 00 00 00 00 09 00 00 00 00 00 00 00 50 61 73 73 77 30 72 64 21") );


	let struct			= UnlockPassphraseResponse.from( bytes, true );;

	expect( struct.byteLength	).to.equal( 33 );
	expect( struct[0]		).to.be.a("LairType");
	expect( struct.value(0)		).to.equal( passphrase );

	expect(() => {
	    UnlockPassphraseResponse.from( bytes.slice( 16, 20 ) );
	}).to.throw("does not have enough bytes to get LairString size", ConversionError);

	expect(() => {
	    UnlockPassphraseResponse.from( bytes.slice( 16, 26 ) );
	}).to.throw("Not enough bytes: LairString", ConversionError);
    });

    it("should encode/decode wire type 'Sign by Public Key Request (576)'", async () => {
	let pub_key			= Buffer.from( "P/rh2HWYa2u6wD6yd+7lBfw2yjAilo9m+0EsS0d9xRw=", "base64" );
	let message			= Buffer.from( compress("05 54 89 8a 56 b4 ff 4e 83 be 46 5c d6 4d 0f c9 12 79 04 a0 5a aa e7 b6 45 cb fc c1 91 3b 1c d3 87 75 2b 48 24 11 4b c1"), "hex" );
	let wiretype			= new SignByPublicKeyRequest( pub_key, message );
	expect( wiretype		).to.be.a("LairStruct");
	expect( wiretype.isRequest()	).to.be.true;
	expect( wiretype instanceof SignByPublicKeyRequest ).to.be.true;
	expect( wiretype.byteLength	).to.equal( 96 );

	let bytes			= wiretype.toMessage( 1 );
	expect( bytes.toHex()		).to.equal( "600000004002000001000000000000003ffae1d875986b6bbac03eb277eee505fc36ca3022968f66fb412c4b477dc51c28000000000000000554898a56b4ff4e83be465cd64d0fc9127904a05aaae7b645cbfcc1913b1cd387752b4824114bc1" );


	let struct			= SignByPublicKeyRequest.from( bytes, true );;

	expect( struct.byteLength		).to.equal( 96 );
	expect( struct[0].toHex()		).to.equal( pub_key.toString("hex") );
	expect( struct[1].toHex()		).to.equal( "2800000000000000" + message.toString("hex") );
	expect( struct.value(0).toString("hex")	).to.equal( pub_key.toString("hex") );
	expect( struct.value(1).toString("hex")	).to.equal( message.toString("hex") );

	expect(() => {
	    struct.push( new LairType(0) );
	}).to.throw("Cannot push another item onto SignByPublicKeyRequest", Error);
    });
}

describe("Package", () => {

    describe("types", types_tests );

});
