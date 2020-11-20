const path				= require('path');
const log				= require('@whi/stdlog')(path.basename( __filename ), {
    level: process.env.LOG_LEVEL || 'fatal',
});

const stream				= require('stream');
const expect				= require('chai').expect;
const { MessageParser }			= require('../../src/parser.js');

const delay				= (ms) => new Promise(f => setTimeout(f, ms));
const compress				= str => str.replace(/ /g, "");

const full_msg				= "00010000100000ff0100000000000000ae6dd17372ce0fba967ffe26ccf02cd8d7ce670028adc3c90346d4a1b2f22d7fc7e9d5ad8f4420d9e32bb3f55e89e9467f7d225427d9abca6832dc581f947faae00ea2cacb27ba07d10ecb231c16672c0246af177da578ae57dafbed8a6f268d7f50e0247182f2a753509c3e998efde7d1139d47a38b51fb24451e3060a148d404de0b29e436299cb85876875b588ee2c59fe659b5857bb427f0f8d87a6fcee87ccd97b10472d1a5d402be705c73b936746e52dedec1ae06c980413503befd9e126f00edc4df30725d693a842d1be87450a8bac987c7c9181363b6672c50302db4bf5b26ca2924005f8417c21ee50eb5";

const half1_msg				= "00010000100000ff0100000000000000ae6dd17372ce0fba967ffe26ccf02cd8d7ce670028adc3c90346d4a1b2f22d7fc7e9d5ad8f4420d9e32bb3f55e89e9467f7d225427d9abca6832";
const half2_msg				= "dc581f947faae00ea2cacb27ba07d10ecb231c16672c0246af177da578ae57dafbed8a6f268d7f50e0247182f2a753509c3e998efde7d1139d47a38b51fb24451e3060a148d404de0b29e436299cb85876875b588ee2c59fe659b5857bb427f0f8d87a6fcee87ccd97b10472d1a5d402be705c73b936746e52dedec1ae06c980413503befd9e126f00edc4df30725d693a842d1be87450a8bac987c7c9181363b6672c50302db4bf5b26ca2924005f8417c21ee50eb5";

const half1_head			= "00010000100000ff";
const half2_head			= "0100000000000000ae6dd17372ce0fba967ffe26ccf02cd8d7ce670028adc3c90346d4a1b2f22d7fc7e9d5ad8f4420d9e32bb3f55e89e9467f7d225427d9abca6832dc581f94";
const rest_of_payload			= "7faae00ea2cacb27ba07d10ecb231c16672c0246af177da578ae57dafbed8a6f268d7f50e0247182f2a753509c3e998efde7d1139d47a38b51fb24451e3060a148d404de0b29e436299cb85876875b588ee2c59fe659b5857bb427f0f8d87a6fcee87ccd97b10472d1a5d402be705c73b936746e52dedec1ae06c980413503befd9e126f00edc4df30725d693a842d1be87450a8bac987c7c9181363b6672c50302db4bf5b26ca2924005f8417c21ee50eb5";



function pipe_input_to_parser ( chunks, parser, interval = 10 ) {
    const iid			= setInterval(() => {
	log.info("Chunks remaining for parser: %s", chunks.length );
	parser.write(  Buffer.from(chunks.shift(), "hex") );

	if ( chunks.length === 0 )
	    clearInterval( iid );
    }, interval );
}

function parser_tests () {
    it("should parse chunk with a complete message", async () => {
	const parser			= new MessageParser();

	parser.write( Buffer.from( full_msg, "hex" ) );

	for await ( let header of parser ) {
	    expect( header.wire_type		).to.equal( 4278190096 );
	    expect( await header.payload()	).to.have.length( 240 );

	    parser.stop();
	}
    });

    it("should parse chunks with a partial messages", async () => {
	let chunks			= [ half1_msg, half2_msg ];
	const parser			= new MessageParser();
	pipe_input_to_parser( chunks, parser );

	for await ( let header of parser ) {
	    if ( header === null ) {
		parser.write( chunks.shift() );
		continue;
	    }

	    expect( header.wire_type		).to.equal( 4278190096 );
	    expect( await header.payload()	).to.have.length( 240 );

	    parser.stop();
	}
    });

    it("should parse chunks with a partial header message", async () => {
	let chunks			= [ half1_head, half2_head, rest_of_payload ];
	const parser			= new MessageParser();
	pipe_input_to_parser( chunks, parser );

	for await ( let header of parser ) {
	    if ( header === null ) {
		expect( chunks.length		).to.be.gt( 0 );
		parser.write( chunks.shift() );
		continue;
	    }

	    expect( header.wire_type		).to.equal( 4278190096 );
	    expect( await header.payload()	).to.have.length( 240 );

	    parser.stop();
	}
    });

    it("should parse 2 packages from several mixed chunks", async () => {
	const chunks				= [
	    "00010000100000ff0100000000000000ae6dd17372ce0fba967ffe26ccf02cd8d7ce670028adc3c90346d4a1b2f22d7fc7e9d5ad8f4420d9e32bb3f55e89e9467f7d2254",
	    "27d9abca6832dc581f947faae00ea2cacb27ba07d10ecb231c16672c0246af177da578ae57dafbed8a6f268d7f50e0247182f2a753509c3e998efde7d1139d47a38b51fb",
	    "24451e3060a148d404de0b29e436299cb85876875b588ee2c59fe659b5857bb427f0f8d87a6fcee87ccd97b10472d1a5d402be705c73b936746e52dedec1ae06c9804135",
	    "03befd9e126f00edc4df30725d693a842d1be87450a8bac987c7c9181363b6672c50302db4bf5b26ca2924005f8417c21ee50eb520000000100000ff0100000000000000",
	    "ae6dd17372ce0fbaae6dd17372ce0fba",
	];

	const parser			= new MessageParser();
	pipe_input_to_parser( chunks, parser );

	let count			= 0;
	for await ( let header of parser ) {
	    if ( header === null ) {
		continue;
	    }

	    count++;

	    if ( count === 1 ) {
		expect( header.wire_type		).to.equal( 4278190096 );
		expect( await header.payload()		).to.have.length( 240 );
		continue;
	    }

	    expect( await header.payload()		).to.have.length( 16 );

	    parser.stop();
	}
    });

    it("should parse 2 packages from a single chunk", async () => {
	const chunks				= [
	    "20000000100000ff0100000000000000ae6dd17372ce0fbaae6dd17372ce0fba20000000100000ff0100000000000000ae6dd17372ce0fbaae6dd17372ce0fba",
	];

	const parser			= new MessageParser();

	parser.write( Buffer.from( chunks.shift(), "hex" ) );

	let count			= 0;
	for await ( let header of parser ) {
	    if ( header === null )
		throw new Error(`should not get here`);

	    count++;

	    if ( count === 1 ) {
		expect( header.wire_type	).to.equal( 4278190096 );
		expect( await header.payload()	).to.have.length( 16 );
		continue;
	    }

	    expect( await header.payload()	).to.have.length( 16 );

	    parser.stop();
	}
    });
}

describe("Package", () => {

    describe("parser", parser_tests );

});
