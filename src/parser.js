const path				= require('path');
const log				= require('@whi/stdlog')(path.basename( __filename ), {
    level: process.env.LOG_LEVEL || 'silly',
});


const {
    ParserError,
}					= require('./error.js');;


const MSG_LEN_SIZE			= 4;
const WIRE_TYPE_SIZE			= 4;
const MSG_ID_SIZE			= 8;
const HEADER_SIZE			= MSG_LEN_SIZE + WIRE_TYPE_SIZE + MSG_ID_SIZE;

class Parser {
    constructor ( msg_processor_callback ) {
	this.msg_count			= 0;
	this.partial_header		= null;
	this.partial_package		= null;
    }

    // Reliable stream parsing with support for pass-through forwarding
    //
    // - If: Header exists
    //   - If: Header is pass-through, forward bytes until message length reached
    //   - Else: consume body for Header
    // - Else if: buffer size > header size, parse Header
    //   - If: Wire Type or Request is for shim, continue
    //   - Else: mark header as pass-through and begin forwarding bytes
    // - Else: wait for next buffer
    //
    consume ( buf ) {
	if ( ! (buf instanceof Uint8Array) )
	    throw new ParserError(`Cannot consume type '${typeof buf}'`);
	console.log("Incoming", buf.length, buf );

	// Finish off any previous package that had missing bytes.
	if ( this.partial_package !== null ) {
	    let missing_bytes_length	= this.partial_package.header.length - this.partial_package.payload.length;

	    console.log("Waiting for", missing_bytes_length, "got", buf.length );
	    if ( buf.length >= missing_bytes_length ) {
		let header		= this.partial_package.header;
		let payload		= Buffer.concat([ this.partial_package.payload, buf.slice( 0, missing_bytes_length ) ]);

		this.next({ header, payload });

		this.partial_package	= null;
		buf			= buf.slice( missing_bytes_length );
	    } else {
		this.partial_package.payload = Buffer.concat([ this.partial_package.payload, buf ]);
		return;
	    }
	}


	let header_bytes;

	console.log("Continued", buf );
	if ( this.partial_header !== null ) {
	    if ( (this.partial_header.length + buf.length) >= HEADER_SIZE ) {
		let missing_header_bytes = HEADER_SIZE - this.partial_header.length;
		header_bytes		= Buffer.concat([ this.partial_header, buf.slice( 0, missing_header_bytes ) ]);
		buf			= buf.slice( missing_header_bytes );
		this.partial_header	= null;
		console.log("Fulfil partial", header_bytes, missing_header_bytes, buf );
	    } else {
		this.partial_header	= Buffer.concat([ this.partial_header, buf ]);
		return;
	    }
	} else if ( buf.length >= HEADER_SIZE ) {
	    header_bytes		= buf.slice( 0, HEADER_SIZE );
	    buf				= buf.slice( HEADER_SIZE );
	} else {
	    this.partial_header		= buf;
	    return;
	}

	console.log("Header", header_bytes );
	let Header = {
	    "length":		header_bytes.readUInt32LE() - HEADER_SIZE,
	    "wire_type":	header_bytes.readUInt32LE(4),
	    "id":		header_bytes.readBigUInt64LE(8),
	};

	if ( buf.length >= Header.length ) {
	    this.next({
		"header":	Header,
		"payload":	buf.slice( 0, Header.length ),
	    });

	    buf				= buf.slice( Header.length );
	}
	else {
	    this.partial_package	= {
		"header":	Header,
		"payload":	buf,
	    };
	}

	return buf.length;
    }

    stop () {
	this.stopped			= true;
    }

    next ( v ) {
	setTimeout( () => this.f(v), 0 );
    }

    [Symbol.asyncIterator]() {
	this.stopped			= false;
	const $this			= this;
	return {
	    next() {
		$this.msg_count++;

		if ( $this.stopped )
		    return Promise.resolve({ done: true });

		return new Promise((f,r) => {
		    let toid		= setTimeout( f, 100, { value: null } );

		    $this.f		= (v) => {
			clearTimeout( toid );
			$this.f		= null;
			f({ "value": v });
		    };
		});
	    },
	}
    }
}


module.exports = {
    Parser,
};
