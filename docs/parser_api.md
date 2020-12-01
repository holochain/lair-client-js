[back to API.md](API.md)

# Message Parser API Reference

## `new MessageParser()`
Extends [streams.Duplex](https://nodejs.org/docs/latest-v14.x/api/stream.html#stream_class_stream_duplex).

A finite-state machine for handling Lair protocol messsages.  It has 2 states

- `0` - Get header
- `1` - Get payload

The `header` event is emitted as soon as `0` state (Get header) completes.  The corrosponding
payload is automatically attached to the emitted `request` object so that the `payload` event is not
required for processing full messages.

Basic example
```javascript
let parser = new MessageParser();

<some readable stream>.pipe( parser );

for await ( let req of this.parser ) {
    if ( req === null )
	continue;

    ...handle request
}
```

Or manual writing
```javascript
let parser = new MessageParser();

parser.write( Buffer.from("00010000100000ff0100000000000000", "hex") );

for await ( let req of parser ) {
    req.wire_type_id; // 4278190096
}
```

### `MessageParser[Symbol.asyncIterator]()`
Iterator that yields the `request` object for each `header` event.

```javascript
for await ( let req of parser ) {
    ...handle request
}
```

### `<MessageParser>.stop()`
Stop all iterators next tick.

### `<MessageParser>._write()`
Where incoming chunks are added to the internal buffers for consumption.

### `<MessageParser>._processBuffers()`
Loop for processing avilable buffers until more chunks are needed.

### `<MessageParser>._consume( length )`
A method for getting a given number of bytes from available buffers.

- `length` - the number of bytes to be consumed

### `<MessageParser>._parseHeader()`
Where `header` bytes are parsed into `request` objects and emitted.

### `<MessageParser>._parsePayload()`
Where `payload` bytes are gathered and emitted.
