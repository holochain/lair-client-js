const path				= require('path');
const log				= require('@whi/stdlog')(path.basename( __filename ), {
    level: process.env.LOG_LEVEL || 'fatal',
});

const expect				= require('chai').expect;
const { LairType,
	LairString,
	LairSized,
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
	    bytes.toType("string");
	}).to.throw("Not enough bytes", ConversionError);

	expect(() => {
	    bytes[0]			= 1;
	    bytes.toType("string");
	}).to.throw("Too many bytes", ConversionError);
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
	    bytes.toType("string");
	}).to.throw("Not enough bytes", ConversionError);

	expect(() => {
	    bytes[0]			= 1;
	    bytes.toType("string");
	}).to.throw("Too many bytes", ConversionError);
    });
}

describe("Package", () => {

    describe("types", types_tests );

});
