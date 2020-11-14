const path				= require('path');
const log				= require('@whi/stdlog')(path.basename( __filename ), {
    level: process.env.LOG_LEVEL || 'fatal',
});

const expect				= require('chai').expect;
const lair				= require('../../src/index.js');

const LAIR_SOCKETFILE			= './lair/socket';

const delay				= (ms) => new Promise(f => setTimeout(f, ms));

function parse_tests () {
    it("should connect to lair", async () => {
	const client			= await lair.connect( LAIR_SOCKETFILE );

	expect( client.bytesRead	).to.equal( 0 );

	await delay( 400 );

	expect( client.bytesRead	).to.equal( 512 );
    });

    // it("should fail to parse JSON into error package", async () => {
    // 	const invalid_error_msg		= JSON.stringify({
    // 	    "type": "error",
    // 	    "payload": null,
    // 	});
    // 	expect(() => {
    // 	    hhdt.parse( invalid_error_msg );
    // 	}				).to.throw( TypeError, "Value cannot be null or undefined" );
    // });
}

describe("Package", () => {

    describe("parse", parse_tests );

});
