[back to API.md](API.md)

# Structs API Reference

## `new LairStruct( ...<payload values> )`
This is the base class for defining structs using `class <new struct> extend LairStruct` and it
should not be constructed directly.

Example usage
```javascript
let struct = new UnlockPassphraseResponse("Passw0rd!");
struct.toMessage( 1 ).toHex(); // "21000000110000ff01000000000000000900000000000000506173737730726421"
```

#### Defining Sub-structs
Creating a struct type requires 2 static variables

- `WIRE_TYPE` - a number used as the 32 bit unsigned integer for the Lair protocol wire type.
- `PAYLOAD` - an array of the LairTypes in this struct.

Example extension
```javascript
class UnlockPassphraseResponse extends LairResponse {
    static WIRE_TYPE			= 4278190097;
    static PAYLOAD			= [ LairString ];
}
```

### `LairStruct.from( source, has_header_prefix )`
Create a new struct from the given source.  Returns the new struct.

- `source` - any array value that satisfies `Buffer.from( source )`
- `has_header_prefix` - a boolean value that indicates whether to skip the initial header bytes

```javascript
let source = Buffer.from("21000000110000ff01000000000000000900000000000000506173737730726421", "hex");
let struct = UnlockPassphraseResponse.from( source, true );

struct[0]      // LairString("Passw0rd!")
struct.get(0)  // "Passw0rd!"
```

### `<LairStruct>.push( value )`
Push a new value onto the payload values array.  The `value` must satisfy the struct's payload
`LairType` for the corrosponding index.

```javascript
let struct = new UnlockPassphraseResponse();
struct.push("Passw0rd!");
```

### `<LairStruct>.toMessage( message_id )`
Construct a Lair protocol message based on this struct and the given `message_id`.

- `message_id` - a number used as the 64 bit unsigned integer for the Lair protocol message ID.

### `<LairStruct>.get( index )`
Get the value of the `LairType` at the given index.

```javascript
let struct = new UnlockPassphraseResponse("Passw0rd!");
struct.get(0)  // "Passw0rd!"
// same as
struct[0].value();
```

Will throw `RangeError` if index outside of `this.constructor.PAYLOAD` range.

### `<LairStruct>.set( index, value )`
Set the value for the `LairType` at the given index.  `value` must satisfy the expected `LairType`.

```javascript
let struct = new UnlockPassphraseResponse();
struct.set("Passw0rd!")  // "Passw0rd!"
// same as
struct[0] = "Passw0rd!";
```

Will throw `RangeError` if index outside of `this.constructor.PAYLOAD` range.


## `new LairRequest()`
Extends `LairStruct`

### Static properties

- `LairRequest.IS_REQUEST = true;`
- `LairRequest.IS_RESPONSE = false;`

### `<LairRequest>.isRequest()`
Returns the value of `this.constructor.IS_REQUEST`.

### `<LairRequest>.isResponse()`
Returns the value of `this.constructor.IS_RESPONSE`.

## `new LairResponse()`
Extends `LairStruct`

### Static properties

- `LairRequest.IS_REQUEST = false;`
- `LairRequest.IS_RESPONSE = true;`

### `<LairRequest>.isRequest()`
Returns the value of `this.constructor.IS_REQUEST`.

### `<LairRequest>.isResponse()`
Returns the value of `this.constructor.IS_RESPONSE`.


## Wire Type Implementations

For payload value types, see [types_api.md](types_api.md).

### `UnlockPassphraseRequest[]`
Extends `LairRequest`

### `UnlockPassphraseResponse[ LairString ]`
Extends `LairResponse`

### `GetLastEntryRequest[]`
Extends `LairRequest`

### `GetLastEntryResponse[ LairKeystoreIndex ]`
Extends `LairResponse`

### `GetEntryTypeRequest[ LairKeystoreIndex ]`
Extends `LairRequest`

### `GetEntryTypeResponse[ LairEntryType ]`
Extends `LairResponse`

### `GetServerInfoRequest[]`
Extends `LairRequest`

### `GetServerInfoResponse[ LairString, LairString ]`
Extends `LairResponse`

### `TLSCreateCertRequest[ LairCertAlgorithm ]`
Extends `LairRequest`

### `TLSCreateCertResponse[ LairKeystoreIndex, LairCertSNI, LairDigest ]`
Extends `LairResponse`

### `TLSGetCertSNIByIndexRequest[ LairKeystoreIndex ]`
Extends `LairRequest`

### `TLSGetCertSNIByIndexResponse[ LairCertSNI, LairDigest ]`
Extends `LairResponse`

### `TLSGetCertByIndexRequest[ LairKeystoreIndex ]`
Extends `LairRequest`

### `TLSGetCertByIndexResponse[ LairCert ]`
Extends `LairResponse`

### `TLSGetCertByDigestRequest[ LairDigest ]`
Extends `LairRequest`

### `TLSGetCertByDigestResponse[ LairCert ]`
Extends `LairResponse`

### `TLSGetCertBySNIRequest[ LairCertSNI ]`
Extends `LairRequest`

### `TLSGetCertBySNIResponse[ LairCert ]`
Extends `LairResponse`

### `TLSGetCertPrivateKeyByIndexRequest[ LairKeystoreIndex ]`
Extends `LairRequest`

### `TLSGetCertPrivateKeyByIndexResponse[ LairCertPrivateKey ]`
Extends `LairResponse`

### `TLSGetCertPrivateKeyByDigestRequest[ LairDigest ]`
Extends `LairRequest`

### `TLSGetCertPrivateKeyByDigestResponse[ LairCertPrivateKey ]`
Extends `LairResponse`

### `TLSGetCertPrivateKeyBySNIRequest[ LairCertSNI ]`
Extends `LairRequest`

### `TLSGetCertPrivateKeyBySNIResponse[ LairCertPrivateKey ]`
Extends `LairResponse`

### `Ed25519CreateKeyRequest[]`
Extends `LairRequest`

### `Ed25519CreateKeyResponse[ LairKeystoreIndex, LairPublicKey ]`
Extends `LairResponse`

### `Ed25519GetKeyByIndexRequest[ LairKeystoreIndex ]`
Extends `LairRequest`

### `Ed25519GetKeyByIndexResponse[ LairPublicKey ]`
Extends `LairResponse`

### `Ed25519SignByIndexRequest[ LairKeystoreIndex, LairSized ]`
Extends `LairRequest`

### `Ed25519SignByIndexResponse[ LairSignature ]`
Extends `LairResponse`

### `Ed25519SignByPublicKeyRequest[ LairPublicKey, LairSized ]`
Extends `LairRequest`

### `Ed25519SignByPublicKeyResponse[ LairSignature ]`
Extends `LairResponse`

