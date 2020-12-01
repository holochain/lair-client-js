[back to README.md](../README.md)

# API Reference

## `connect( address )`
Creates a new instance of `LairClient` and returns the instance when the client has connected.

## `new LairClient( address )`

- `address` - a connection address passed to [`net.createConnection( address )`](https://nodejs.org/docs/latest-v14.x/api/net.html#net_net_createconnection)

### `<LairClient>.ready()`
Returns a promise that is fulfilled by the socket's "connect" event.

### `<LairClient>.send( bytes )`
Write the given `bytes` to the current connection.

- `bytes` - a value accepted by [`socket.write( bytes )`](https://nodejs.org/docs/latest-v14.x/api/net.html#net_socket_write_data_encoding_callback)

### `<LairClient>.request( wiretype, timeout )`
Send a request (wire-type) and return a promise that is fulfilled by the corrosponding response.

- `wiretype` - a `struct` from [Wire Type Implementations](structs_api.md#wire-type-implementations)
- `timeout` - (*optional*) number of milliseconds until `TimeoutError` will be thrown.  Defaults to no timeout.

### `<LairClient>.destroy()`
Close the connection and stop the message parser.


## `new IncomingRequest( header, struct, client )`
A read-only object for inspecting requests and sending a reply.

#### Read-only values

- `id` - the message ID from Lair protocol header
- `length` - the total message length from Lair protocol header
- `wireType` - the constructor name for `this.wireTypeStruct`
  - eg. `"UnlockPassphraseRequest"`
- `wireTypeId` - the wire type ID from Lair protocol header
  - eg. `4278190096`
- `wireTypeStruct` - the (Request) struct for `this.wireTypeId`
  - eg. `UnlockPassphraseRequest`

### `<IncomingRequest>.reply( ...values )`
Send a reply constructed from the given `values` for the (Response) struct that corrosponds to this
(Request) struct.

## Errors

### `new LairClientError( message )`
Extends `Error`

### `TimeoutError`
Extends `LairClientError`

### `ParserError`
Extends `LairClientError`

### `ConversionError`
Extends `LairClientError`

## Internal Modules

### Message Parser
The Message Parser is responsible for interpretting a readble stream into Lair protocol messages.

See [parser_api.md](parser_api.md)

### Structs
Structs are responsible for constructing Lair protocol messages.

See [structs_api.md](structs_api.md)

### Types
Types are used in the payload definition for structs.

See [types_api.md](types_api.md)
