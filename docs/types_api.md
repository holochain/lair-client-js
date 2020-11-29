[back to API.md](API.md)

# Types API Reference

## `new LairType( length )`
Extends `Uint8Array` with the following additions

- `this.view` - a `Buffer` view into the same `ArrayBuffer`

### `LairType.fromSource( source, strict )`
Create a new `LairType` from a byte array source.

- `source` - an instance of `Uint8Array`
- `strict` - value that may be passed through to `LairType.from` depending on type implementation.

### `LairType.from( value, strict )`
Create a new `LairType` from a value.

- `value` - a value expected by the defined `LairType`.
  - `from` and `fromSource` behave the same on the `LairType` base class.
- `strict` - a boolean that indicates whether the `value` length must equal the expected size.  If
  `false`, the `value` is allowed to be larger than the expected size.
  - ***NOTE:*** *This is likely only relevant when `value` type is a byte array*

### `<LairType>.toType( lair_type )`
Cast an instance of `LairType` into the given `lair_type` class.

```javascript
let type = LairType.from( Buffer.from("0900000000000000506173737730726421", "hex") );
let str = type.toType( LairString );
str.value() // "Passw0rd!"
```

### `<LairType>.toHex( prefix )`
Returns the hex encoding of this `LairType`.

- `prefix` - a boolean to indecate whether it should add the hex prefix (`0x`)

### `<LairType>.value()`
Get the value that this `LairType` represents.

```javascript
let type = LairString.from("Passw0rd!");
type.value() // "Passw0rd!"
```


## Type Implementations

### `LairString[..]`
Extends `LairType`

### `LairSized[..]`
Extends `LairType`

### `LairInteger[4]`
Extends `LairType`

### `LairPublicKey[32]`
Extends `LairType`

### `LairSignature[64]`
Extends `LairType`
### `LairKeystoreIndex[4]`
Extends `LairInteger`

### `LairEntryType[4]`
Extends `LairInteger`

### `LairDigest[32]`
Extends `LairType`

### `LairCert[..]`
Extends `LairSized`

### `LairCertSNI[..]`
Extends `LairSized`

### `LairCertAlgorithm[4]`
Extends `LairInteger`

### `LairCertPrivateKey[..]`
Extends `LairSized`
