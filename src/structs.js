const path = require('path')
const log = require('@whi/stdlog')(path.basename(__filename), {
  level:
    (!__dirname.includes('/node_modules/') && process.env.LOG_LEVEL) || 'fatal'
})

const { LairClientError, HEADER_SIZE } = require('./constants.js')
const {
  LairType,
  LairString,
  LairSized,
  LairPublicKey,
  LairSignature,
  LairKeystoreIndex,
  LairEntryType,
  LairDigest,
  LairCert,
  LairCertSNI,
  LairCertAlgorithm,
  LairCertPrivateKey,
  ConversionError
} = require('./types.js')

class LairStruct {
  [Symbol.toStringTag] = LairStruct.name

  static from (source, has_header_prefix = false) {
    source = Buffer.from(source)
    let struct = new this()

    if (has_header_prefix === true) {
      log.info('Skipping header (%s) bytes in source: %s', () => [
        HEADER_SIZE,
        source.slice(0, HEADER_SIZE).toString('hex')
      ])
      source = source.slice(HEADER_SIZE)
    }

    for (let i = 0; i < this.PAYLOAD.length; i++) {
      let type = this.PAYLOAD[i]
      log.silly("Extracting type '%s' from source (%s): %s", () => [
        type.name,
        source.length,
        source.toString('hex')
      ])
      let value = type.fromSource(source, false)
      source = source.slice(value.length)

      struct.push(value)
    }

    if (source.length > 0)
      log.warn(
        'source (%s) for struct %s still has some bytes leftover; this may be unexpected.',
        source.length,
        this.name
      )

    return struct
  }

  constructor (...args) {
    this.max_length = this.constructor.PAYLOAD.length

    if (this.max_length < args.length)
      throw new ConversionError(
        `Received more arguments (${args.length}) than template allows for ${this.name}`
      )

    this._values = new Array(this.max_length)
    this.constructor.PAYLOAD.map((type, i) => {
      Object.defineProperty(this, i, {
        get () {
          return this._values[i]
        },
        set (value) {
          if (this._values[i] !== undefined)
            this.byteLength -= this._values[i].length

          if (!(value instanceof LairType)) value = type.from(value)

          log.silly(
            "Setting '%s' (%s bytes) to satisfy PAYLOAD item %s (%s)",
            () => [i, value.length, type.name, type.SIZE]
          )
          this._values[i] = value
          this.byteLength += value.length
        }
      })
    })

    this.byteLength = HEADER_SIZE
    args.map(value => this.push(value))
  }

  push (value) {
    let i = this._values.filter(Boolean).length

    if (i === this.max_length)
      throw new Error(
        `Cannot push another item onto ${this.constructor.name} because it already contains the expected number of payoad items.`
      )

    log.silly("Pushing '%s' (%s) to satisfy PAYLOAD item %s", () => [
      value.constructor.name,
      typeof value,
      i
    ])
    this[i] = value

    return i + 1
  }

  toMessage (msg_id) {
    if (msg_id === undefined)
      throw new TypeError(
        `Message ID must be provided for Lair message building`
      )

    let buf = new LairType(this.byteLength)
    buf.message_id = msg_id

    buf.view.writeUInt32LE(this.byteLength)
    buf.view.writeUInt32LE(this.constructor.WIRE_TYPE, 4)
    buf.view.writeBigUInt64LE(BigInt(msg_id), 8)

    log.debug('%s request message header bytes: %s', () => [
      this.constructor.name,
      buf.view.slice(0, HEADER_SIZE).toString('hex')
    ])
    let position = HEADER_SIZE
    for (let value of this._values) {
      log.silly("%s request setting '%s' at position (%s): %s", () => [
        this.constructor.name,
        value.constructor.name,
        position,
        value.view.toString('hex')
      ])
      buf.set(value, position)
      position += value.length
    }

    log.info('%s request complete message: %s', () => [
      this.constructor.name,
      buf.toHex()
    ])
    return buf
  }

  get (index) {
    if (!(index < this.max_length))
      throw new RangeError(
        `The index must be between 0..${this.max_length - 1}; not ${index}`
      )

    let type = this._values[index]
    if (type instanceof LairType) return type.value()
    else return null
  }

  set (index, value) {
    if (!(index < this.max_length))
      throw new RangeError(
        `The index must be between 0..${this.max_length - 1}; not ${index}`
      )

    this[index] = value
  }
}

class LairRequest extends LairStruct {
  static IS_REQUEST = true
  static IS_RESPONSE = false
  isRequest () {
    return this.constructor.IS_REQUEST
  }
  isResponse () {
    return this.constructor.IS_RESPONSE
  }
}
class LairResponse extends LairStruct {
  static IS_REQUEST = false
  static IS_RESPONSE = true
  isRequest () {
    return this.constructor.IS_REQUEST
  }
  isResponse () {
    return this.constructor.IS_RESPONSE
  }
}

class ErrorResponse extends LairResponse {
  static WIRE_TYPE = 0xFFFFFFFF
  static PAYLOAD = [LairString]
}

// Unlock Passphrase
class UnlockPassphraseRequest extends LairRequest {
  static WIRE_TYPE = 4278190096
  static PAYLOAD = []
}
class UnlockPassphraseResponse extends LairResponse {
  static WIRE_TYPE = 4278190097
  static PAYLOAD = [LairString]
}

// Get Last Entry
class GetLastEntryRequest extends LairRequest {
  static WIRE_TYPE = 16
  static PAYLOAD = []
}
class GetLastEntryResponse extends LairResponse {
  static WIRE_TYPE = 17
  static PAYLOAD = [LairKeystoreIndex]
}

// Get Entry Type
class GetEntryTypeRequest extends LairRequest {
  static WIRE_TYPE = 32
  static PAYLOAD = [LairKeystoreIndex]
}
class GetEntryTypeResponse extends LairResponse {
  static WIRE_TYPE = 33
  static PAYLOAD = [LairEntryType]
}

// Get Server Info
class GetServerInfoRequest extends LairRequest {
  static WIRE_TYPE = 48
  static PAYLOAD = []
}
class GetServerInfoResponse extends LairResponse {
  static WIRE_TYPE = 49
  static PAYLOAD = [LairString, LairString]
}

// TLS - Create Self-Signed Certificate from Entropy
class TLSCreateCertRequest extends LairRequest {
  static WIRE_TYPE = 272
  static PAYLOAD = [LairCertAlgorithm]
}
class TLSCreateCertResponse extends LairResponse {
  static WIRE_TYPE = 273
  static PAYLOAD = [LairKeystoreIndex, LairCertSNI, LairDigest]
}

// TLS - Get Certificate SNI by Index
class TLSGetCertSNIByIndexRequest extends LairRequest {
  static WIRE_TYPE = 288
  static PAYLOAD = [LairKeystoreIndex]
}
class TLSGetCertSNIByIndexResponse extends LairResponse {
  static WIRE_TYPE = 289
  static PAYLOAD = [LairCertSNI, LairDigest]
}

// TLS - Get Certificate by Index
class TLSGetCertByIndexRequest extends LairRequest {
  static WIRE_TYPE = 304
  static PAYLOAD = [LairKeystoreIndex]
}
class TLSGetCertByIndexResponse extends LairResponse {
  static WIRE_TYPE = 305
  static PAYLOAD = [LairCert]
}

// TLS - Get Certificates by Digest
class TLSGetCertByDigestRequest extends LairRequest {
  static WIRE_TYPE = 320
  static PAYLOAD = [LairDigest]
}
class TLSGetCertByDigestResponse extends LairResponse {
  static WIRE_TYPE = 321
  static PAYLOAD = [LairCert]
}

// TLS - Get Certificate by SNI
class TLSGetCertBySNIRequest extends LairRequest {
  static WIRE_TYPE = 336
  static PAYLOAD = [LairCertSNI]
}
class TLSGetCertBySNIResponse extends LairResponse {
  static WIRE_TYPE = 337
  static PAYLOAD = [LairCert]
}

// TLS - Get Private Key by Index
class TLSGetCertPrivateKeyByIndexRequest extends LairRequest {
  static WIRE_TYPE = 352
  static PAYLOAD = [LairKeystoreIndex]
}
class TLSGetCertPrivateKeyByIndexResponse extends LairResponse {
  static WIRE_TYPE = 353
  static PAYLOAD = [LairCertPrivateKey]
}

// TLS - Get Private Key by Digest
class TLSGetCertPrivateKeyByDigestRequest extends LairRequest {
  static WIRE_TYPE = 368
  static PAYLOAD = [LairDigest]
}
class TLSGetCertPrivateKeyByDigestResponse extends LairResponse {
  static WIRE_TYPE = 369
  static PAYLOAD = [LairCertPrivateKey]
}

// TLS - Get Private Key by SNI
class TLSGetCertPrivateKeyBySNIRequest extends LairRequest {
  static WIRE_TYPE = 384
  static PAYLOAD = [LairCertSNI]
}
class TLSGetCertPrivateKeyBySNIResponse extends LairResponse {
  static WIRE_TYPE = 385
  static PAYLOAD = [LairCertPrivateKey]
}

// Ed25519 - Create a New Key from Entropy
class Ed25519CreateKeyRequest extends LairRequest {
  static WIRE_TYPE = 528
  static PAYLOAD = []
}
class Ed25519CreateKeyResponse extends LairResponse {
  static WIRE_TYPE = 529
  static PAYLOAD = [LairKeystoreIndex, LairPublicKey]
}

// Ed25519 - Get Public Key by Index
class Ed25519GetKeyByIndexRequest extends LairRequest {
  static WIRE_TYPE = 544
  static PAYLOAD = [LairKeystoreIndex]
}
class Ed25519GetKeyByIndexResponse extends LairResponse {
  static WIRE_TYPE = 545
  static PAYLOAD = [LairPublicKey]
}

// Ed25519 - Sign by Index
class Ed25519SignByIndexRequest extends LairRequest {
  static WIRE_TYPE = 560
  static PAYLOAD = [LairKeystoreIndex, LairSized]
}
class Ed25519SignByIndexResponse extends LairResponse {
  static WIRE_TYPE = 561
  static PAYLOAD = [LairSignature]
}

// Ed25519 - Sign by Public Key
class Ed25519SignByPublicKeyRequest extends LairRequest {
  static WIRE_TYPE = 576
  static PAYLOAD = [LairPublicKey, LairSized]
}
class Ed25519SignByPublicKeyResponse extends LairResponse {
  static WIRE_TYPE = 577
  static PAYLOAD = [LairSignature]
}

const ALL_WIRETYPE_CLASSES = {
  ErrorResponse,

  UnlockPassphraseRequest,
  UnlockPassphraseResponse,

  GetLastEntryRequest,
  GetLastEntryResponse,

  GetEntryTypeRequest,
  GetEntryTypeResponse,

  GetServerInfoRequest,
  GetServerInfoResponse,

  TLSCreateCertRequest,
  TLSCreateCertResponse,

  TLSGetCertSNIByIndexRequest,
  TLSGetCertSNIByIndexResponse,

  TLSGetCertByIndexRequest,
  TLSGetCertByIndexResponse,

  TLSGetCertByDigestRequest,
  TLSGetCertByDigestResponse,

  TLSGetCertBySNIRequest,
  TLSGetCertBySNIResponse,

  TLSGetCertPrivateKeyByIndexRequest,
  TLSGetCertPrivateKeyByIndexResponse,

  TLSGetCertPrivateKeyByDigestRequest,
  TLSGetCertPrivateKeyByDigestResponse,

  TLSGetCertPrivateKeyBySNIRequest,
  TLSGetCertPrivateKeyBySNIResponse,

  Ed25519CreateKeyRequest,
  Ed25519CreateKeyResponse,

  Ed25519GetKeyByIndexRequest,
  Ed25519GetKeyByIndexResponse,

  Ed25519SignByIndexRequest,
  Ed25519SignByIndexResponse,

  Ed25519SignByPublicKeyRequest,
  Ed25519SignByPublicKeyResponse
}
const ALL_WIRETYPES = Object.values(ALL_WIRETYPE_CLASSES).reduce(function (
  obj,
  cls
) {
  obj[cls.WIRE_TYPE] = cls
  return obj
},
{})

module.exports = {
  LairStruct,
  LairRequest,
  LairResponse,

  // Wire Types
  ...ALL_WIRETYPE_CLASSES,
  ...ALL_WIRETYPES,

  UnlockPassphrase: {
    Request: UnlockPassphraseRequest,
    Response: UnlockPassphraseResponse
  },
  GetLastEntry: {
    Request: GetLastEntryRequest,
    Response: GetLastEntryResponse
  },
  GetEntryType: {
    Request: GetEntryTypeRequest,
    Response: GetEntryTypeResponse
  },
  GetServerInfo: {
    Request: GetServerInfoRequest,
    Response: GetServerInfoResponse
  },

  TLS: {
    CreateCert: {
      Request: TLSCreateCertRequest,
      Response: TLSCreateCertResponse
    },
    GetCertSNIByIndex: {
      Request: TLSGetCertSNIByIndexRequest,
      Response: TLSGetCertSNIByIndexResponse
    },
    GetCertByIndex: {
      Request: TLSGetCertByIndexRequest,
      Response: TLSGetCertByIndexResponse
    },
    GetCertByDigest: {
      Request: TLSGetCertByDigestRequest,
      Response: TLSGetCertByDigestResponse
    },
    GetCertBySNI: {
      Request: TLSGetCertBySNIRequest,
      Response: TLSGetCertBySNIResponse
    },
    GetCertPrivateKeyByIndex: {
      Request: TLSGetCertPrivateKeyByIndexRequest,
      Response: TLSGetCertPrivateKeyByIndexResponse
    },
    GetCertPrivateKeyByDigest: {
      Request: TLSGetCertPrivateKeyByDigestRequest,
      Response: TLSGetCertPrivateKeyByDigestResponse
    },
    GetCertPrivateKeyBySNI: {
      Request: TLSGetCertPrivateKeyBySNIRequest,
      Response: TLSGetCertPrivateKeyBySNIResponse
    }
  },

  Ed25519: {
    CreateKey: {
      Request: Ed25519CreateKeyRequest,
      Response: Ed25519CreateKeyResponse
    },
    GetKeyByIndex: {
      Request: Ed25519GetKeyByIndexRequest,
      Response: Ed25519GetKeyByIndexResponse
    },
    SignByIndex: {
      Request: Ed25519SignByIndexRequest,
      Response: Ed25519SignByIndexResponse
    },
    SignByPublicKey: {
      Request: Ed25519SignByPublicKeyRequest,
      Response: Ed25519SignByPublicKeyResponse
    }
  },

  // Error types
  ConversionError
}
