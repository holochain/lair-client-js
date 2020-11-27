const path				= require('path');
const log				= require('@whi/stdlog')(path.basename( __filename ), {
    level: process.env.LOG_LEVEL || 'fatal',
});

const expect				= require('chai').expect;
const {
    LairType,
    LairString,
    LairSized,
    ConversionError,
}					= require('../../src/types.js');
const {
    LairStruct,
    UnlockPassphraseResponse,
    GetServerInfoResponse,
    TLSCreateCertResponse,
    Ed25519SignByPublicKeyRequest,
    Ed25519SignByPublicKeyResponse,
}					= require('../../src/structs.js');

const compress				= str => str.replace(/ /g, "");

function structs_tests () {
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
	expect( struct.get(0)		).to.equal( passphrase );

	expect(() => {
	    UnlockPassphraseResponse.from( bytes.slice( 16, 20 ) );
	}).to.throw("does not have enough bytes to get LairString size", ConversionError);

	expect(() => {
	    UnlockPassphraseResponse.from( bytes.slice( 16, 26 ) );
	}).to.throw("Not enough bytes: LairString", ConversionError);
    });

    it("should encode/decode wire type 'Get Server Info Response (49)'", async () => {
	let name			= "Lair Keystore - Signing Service";
	let version			= "v0.1.0-coolio";
	let wiretype			= new GetServerInfoResponse( name, version );
	expect( wiretype		).to.be.a("LairStruct");
	expect( wiretype.isResponse()	).to.be.true;
	expect( wiretype instanceof GetServerInfoResponse ).to.be.true;
	expect( wiretype.byteLength	).to.equal( 76 );

	let bytes			= wiretype.toMessage( 1 );
	expect( bytes.toHex()		).to.equal( compress("4c000000310000000100000000000000 1f00000000000000 4c616972204b657973746f7265202d205369676e696e672053657276696365 0d00000000000000 76302e312e302d636f6f6c696f") );

	wiretype[0]			= "Change Server Name";
	expect( wiretype.byteLength	).to.equal( 63 );

	wiretype.set(0, "Change Server Name Again");
	expect( wiretype.byteLength	).to.equal( 69 );

	expect(() => {
	    wiretype.set(2, "out of range");
	}).to.throw("index must be between 0..1", RangeError);

	let struct			= GetServerInfoResponse.from( bytes, true );;

	expect( struct.byteLength	).to.equal( 76 );
	expect( struct[0]		).to.be.a("LairType");
	expect( struct.get(0)		).to.equal( name );
	expect( struct.get(1)		).to.equal( version );

	expect(() => {
	    GetServerInfoResponse.from( bytes.slice( 16, 20 ) );
	}).to.throw("does not have enough bytes to get LairString size", ConversionError);

	expect(() => {
	    GetServerInfoResponse.from( bytes.slice( 16, 26 ) );
	}).to.throw("Not enough bytes: LairString", ConversionError);
    });

    it("should encode/decode wire type 'TLS Create Cert Response (273)'", async () => {
	let keystore_index		= 13;
	let cert_sni			= Buffer.from("7ec915391bc1491bd52047621d27b097aa352d546e542b", "hex" );
	let digest			= Buffer.from("ba8904a3233dbd91ccd15eb63e2c93264063b950ac9d3d58d2e0b0b5c28a7105", "hex" );;
	let wiretype			= new TLSCreateCertResponse( keystore_index, cert_sni, digest );
	expect( wiretype		).to.be.a("LairStruct");
	expect( wiretype.isResponse()	).to.be.true;
	expect( wiretype instanceof TLSCreateCertResponse ).to.be.true;
	expect( wiretype.byteLength	).to.equal( 83 );

	let bytes			= wiretype.toMessage( 1 );
	expect( bytes.toHex()		).to.equal( compress("53000000110100000100000000000000 0d000000 1700000000000000 7ec915391bc1491bd52047621d27b097aa352d546e542b ba8904a3233dbd91ccd15eb63e2c93264063b950ac9d3d58d2e0b0b5c28a7105") );


	let struct			= TLSCreateCertResponse.from( bytes, true );

	expect( struct.byteLength		).to.equal( 83 );
	expect( struct[0]			).to.be.a("LairType");
	expect( struct.get(0)			).to.equal( keystore_index );
	expect( struct.get(1).toString("hex")	).to.equal( cert_sni.toString("hex") );
	expect( struct.get(2).toString("hex")	).to.equal( digest.toString("hex") );
    });

    it("should encode/decode wire type 'Sign by Public Key Request (576)'", async () => {
	let pub_key			= Buffer.from( "3ffae1d875986b6bbac03eb277eee505fc36ca3022968f66fb412c4b477dc51c", "hex" );
	let message			= Buffer.from( compress("05 54 89 8a 56 b4 ff 4e 83 be 46 5c d6 4d 0f c9 12 79 04 a0 5a aa e7 b6 45 cb fc c1 91 3b 1c d3 87 75 2b 48 24 11 4b c1"), "hex" );
	let wiretype			= new Ed25519SignByPublicKeyRequest( pub_key, message );
	expect( wiretype		).to.be.a("LairStruct");
	expect( wiretype.isRequest()	).to.be.true;
	expect( wiretype instanceof Ed25519SignByPublicKeyRequest ).to.be.true;
	expect( wiretype.byteLength	).to.equal( 96 );

	let bytes			= wiretype.toMessage( 1 );
	expect( bytes.toHex()		).to.equal( compress("60000000400200000100000000000000 3ffae1d875986b6bbac03eb277eee505fc36ca3022968f66fb412c4b477dc51c 2800000000000000 0554898a56b4ff4e83be465cd64d0fc9127904a05aaae7b645cbfcc1913b1cd387752b4824114bc1") );


	let struct			= Ed25519SignByPublicKeyRequest.from( bytes, true );;

	expect( struct.byteLength		).to.equal( 96 );
	expect( struct[0].toHex()		).to.equal( pub_key.toString("hex") );
	expect( struct[1].toHex()		).to.equal( "2800000000000000" + message.toString("hex") );
	expect( struct.get(0).toString("hex")	).to.equal( pub_key.toString("hex") );
	expect( struct.get(1).toString("hex")	).to.equal( message.toString("hex") );

	expect(() => {
	    struct.push( new LairType(0) );
	}).to.throw("Cannot push another item onto Ed25519SignByPublicKeyRequest", Error);
    });

    it("should encode/decode wire type 'Sign by Public Key Response (577)'", async () => {
	let signature			= Buffer.from("ea067251189fa64a65a33548dc8c4e2989b50d27ec915391bc1491bd52047621d27b097aa352d5470baa9356260cda206d77da5c13d32ab8465f2265bccd7970", "hex" );
	let wiretype			= new Ed25519SignByPublicKeyResponse( signature );
	expect( wiretype		).to.be.a("LairStruct");
	expect( wiretype.isResponse()	).to.be.true;
	expect( wiretype instanceof Ed25519SignByPublicKeyResponse ).to.be.true;
	expect( wiretype.byteLength	).to.equal( 80 );

	let bytes			= wiretype.toMessage( 1 );
	expect( bytes.toHex()		).to.equal( compress("50000000410200000100000000000000 ea067251189fa64a65a33548dc8c4e2989b50d27ec915391bc1491bd52047621d27b097aa352d5470baa9356260cda206d77da5c13d32ab8465f2265bccd7970") );


	let struct			= Ed25519SignByPublicKeyResponse.from( bytes, true );;

	expect( struct.byteLength		).to.equal( 80 );
	expect( struct.get(0).toString("hex")	).to.equal( signature.toString("hex") );
    });
}

describe("Package", () => {

    describe("structs", structs_tests );

});
