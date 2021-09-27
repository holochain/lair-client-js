/** @module @holochain/lair-client
 *
 */

import _sodium from 'libsodium-wrappers'
// import msgpack from 'msgpack-lite'

const _sodiumCfg = {
  sodiumReady: false
}

/**
 * Await this promise once before calling functions in this library.
 *
 * @type {Promise}
 */
export const lairClientReady = _sodium.ready.then(() => {
  _sodiumCfg.sodiumReady = true
})
