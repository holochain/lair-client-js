import * as lairClient from '../src/index.js'

describe('LairClient Test Suite', () => {
  it('sanity', async () => {
    await lairClient.lairClientReady
  })
})
