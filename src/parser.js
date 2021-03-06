const path = require('path')
const log = require('@whi/stdlog')(path.basename(__filename), {
  level:
    (!__dirname.includes('/node_modules/') && process.env.LOG_LEVEL) || 'fatal'
})

const net = require('net')
const stream = require('stream')
const { LairClientError, HEADER_SIZE } = require('./constants.js')
const { ...structs } = require('./structs.js')

const delay = ms => new Promise(f => setTimeout(f, ms))

const STATE_GET_HEADER = 0
const STATE_GET_PAYLOAD = 1

class ParserError extends LairClientError {
  [Symbol.toStringTag] = ParserError.name
}

class MessageParser extends stream.Duplex {
  constructor () {
    super()

    this.msg_count = 0

    this.state = STATE_GET_HEADER

    this.need_more_buffer = true
    this._bufferedBytes = 0
    this._buffers = []
    this._payloadLength = 0
    this.current_msg = null
    this.next_payload = null
  }

  _write (buf, encoding, cb) {
    if (!(buf instanceof Uint8Array))
      throw new ParserError(`Cannot consume type '${typeof buf}'`)

    log.silly('Incoming chunk (%s): %s', buf.length, buf.toString('hex'))
    this._bufferedBytes += buf.length
    this._buffers.push(buf)
    this.need_more_buffer = false

    this._processBuffers().catch(console.error)

    return cb() || true
  }

  async _processBuffers () {
    await delay(0)

    do {
      log.silly(
        'State maching loop: %s (%s bytes avaiable)',
        this.state,
        this._bufferedBytes
      )
      switch (this.state) {
        case STATE_GET_HEADER:
          this._parseHeader()
          break
        case STATE_GET_PAYLOAD:
          this._parsePayload()
          break
        default:
          this.need_more_buffer = true
          break
      }
      log.silly(
        'End of loop state: %s (more? %s)',
        this.state,
        this.need_more_buffer
      )
    } while (this.need_more_buffer === false)
  }

  _consume (n) {
    this._bufferedBytes -= n

    if (n === this._buffers[0].length) return this._buffers.shift()

    if (n < this._buffers[0].length) {
      const buf = this._buffers[0]
      this._buffers[0] = buf.slice(n)
      return buf.slice(0, n)
    }

    const dst = Buffer.allocUnsafe(n)

    do {
      const buf = this._buffers[0]
      const offset = dst.length - n

      if (n >= buf.length) {
        dst.set(this._buffers.shift(), offset)
      } else {
        dst.set(new Uint8Array(buf.buffer, buf.byteOffset, n), offset)
        this._buffers[0] = buf.slice(n)
      }

      n -= buf.length
    } while (n > 0)

    return dst
  }

  _parseHeader () {
    if (this._bufferedBytes < HEADER_SIZE) {
      this.need_more_buffer = true
      return
    }
    log.info(
      'Parsing (%s) header from %s available bytes',
      HEADER_SIZE,
      this._bufferedBytes
    )

    let header_bytes = this._consume(HEADER_SIZE)

    let payload_promise = new Promise((f, r) => {
      this.next_payload = payload => {
        this.next_payload = null
        f(payload)
      }
    })

    const wt_id = header_bytes.readUInt32LE(4)
    const wt_cls = structs[wt_id]
    this.current_msg = {
      bytes: header_bytes,
      length: header_bytes.readUInt32LE() - HEADER_SIZE,
      wire_type: wt_cls.name,
      wire_type_id: wt_id,
      wire_type_class: wt_cls,
      id: header_bytes.readBigUInt64LE(8),
      payload: () => payload_promise,
      forward: async dest => {
        if (!(dest instanceof stream.Writable))
          throw new TypeError(
            `Destination must be an instance of stream.Writable: not ${dest.constructor.name}`
          )

        dest.write(header_bytes)
        dest.write(await payload_promise)
      }
    }

    this.emit('header', this.current_msg)

    this.state = STATE_GET_PAYLOAD
    log.silly('Change state to: %s', this.state)
  }

  _parsePayload () {
    if (this._bufferedBytes < this.current_msg.length) {
      this.need_more_buffer = true
      return
    }
    log.info(
      'Parsing (%s) payload from %s available bytes',
      this.current_msg.length,
      this._bufferedBytes
    )

    let payload_bytes = this._consume(this.current_msg.length)

    this.emit('payload', payload_bytes)
    this.next_payload(payload_bytes)

    this.state = STATE_GET_HEADER
    this.current_msg = null
  }

  stop () {
    this.stopped = true
  }

  [Symbol.asyncIterator] () {
    this.stopped = false
    const $this = this

    let parsed_headers = []
    let nextHeader = null
    this.on('header', header => {
      log.info('Parsed a new header: %s<%s> #%s -> %s byte payload', () => [
        header.wire_type,
        header.wire_type_id,
        header.id,
        header.length
      ])
      if (nextHeader === null) parsed_headers.push(header)
      else nextHeader(header)
    })

    return {
      next () {
        $this.msg_count++

        if ($this.stopped) return Promise.resolve({ done: true })

        return new Promise((f, r) => {
          if (parsed_headers.length) return f({ value: parsed_headers.shift() })

          let toid = setTimeout(f, 100, { value: null })

          nextHeader = v => {
            clearTimeout(toid)
            nextHeader = null
            f({ value: v })
          }
        })
      }
    }
  }
}

module.exports = {
  MessageParser
}
