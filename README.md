[![](https://img.shields.io/npm/v/@holochain/lair-client/latest?style=flat-square)](http://npmjs.com/package/@holochain/lair-client)
[![](https://img.shields.io/github/workflow/status/holochain/lair-client-js/Node.js%20CI/main?style=flat-square&label=main)](https://github.com/holochain/lair-client-js)

# Lair Client for Node.js
Javascript implementation of client for Lair Keystore.


[![](https://img.shields.io/github/issues-raw/holochain/lair-client-js?style=flat-square)](https://github.com/holochain/lair-client-js/issues)
[![](https://img.shields.io/github/issues-closed-raw/holochain/lair-client-js?style=flat-square)](https://github.com/holochain/lair-client-js/issues?q=is%3Aissue+is%3Aclosed)
[![](https://img.shields.io/github/issues-pr-raw/holochain/lair-client-js?style=flat-square)](https://github.com/holochain/lair-client-js/pulls)

## Overview
This module provides APIs for

- connecting to Lair
- receiving and responding to messages
- sending requests and awaiting response
- constructing messages using wire type structs

### Basic Usage

```javascript
const { structs, ...lair } = require("@holochain/lair-client");

(async () {
    const client = lair.connect( <path to a Lair unix domain socket> );

    client.on('UnlockPassphrase', request => {
	req.reply( "Passw0rd!" );
    });

    let resp = await client.request( new structs.TLS.CreateCert( 512 ) );

    resp[0];     // LairType  -> LairKeystoreIndex<Uint8Array>
    resp.get(0); // number    -> <LairType>.value()

    resp[1];     // LairType  -> LairCertSNI<Uint8Array>
    resp.get(1); // Buffer    -> <LairType>.value()

    resp[2];     // LairType  -> LairDigest<Uint8Array>
    resp.get(2); // Buffer    -> <LairType>.value()
})();
```

### API Reference

See [docs/API.md](docs/API.md)

### Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)
