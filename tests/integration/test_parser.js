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

	try {
	    let recv_unlock		= false;
	    client.on('UnlockPassphrase', ([ header, UnlockPassphraseRequest ]) => {
		log.normal("Received unlock passphrase request (%s): %s", UnlockPassphraseRequest.constructor.WIRE_TYPE, header );
		recv_unlock		= true;
	    });
	    let resp			= await client.request( new client.TLS.CreateCert( 512 ) );

	    expect( resp.value(0)	).to.be.a('number');
	    expect( resp.value(1)	).to.be.a('uint8array');
	    expect( resp.value(2)	).to.be.a('uint8array');
	    expect( recv_unlock		).to.be.true;
	} finally {
	    client.destroy();
	}
    });

    it("should send garbage message and not receive a response", async () => {
	const client			= await lair.connect( LAIR_SOCKETFILE );

	let failed			= false;
	try {
	    await client.request({ toMessage: () => Buffer.from("Garbage message") }, 100 );
	} catch ( err ) {
	    expect( err.name		).to.equal('TimeoutError');
	    expect( err.message		).to.have.string('within 0.1s for request');
	    failed			= true;
	} finally {
	    client.destroy();
	}

	expect( failed			).to.be.true;
    });
}

describe("Package", () => {

    describe("parse", parse_tests );

});
