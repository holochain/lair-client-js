import * as lairClient from '../src/index.js'

const yamlFixture = `---
connectionUrl: "unix:///home/neonphog/projects/lair-client-js/socket?k=sq9A74yjVl8xFQFid2lWnA7bT_ofH2cwX53NULeE6P4"
pidFile: /home/neonphog/projects/lair-client-js/pid_file
storeFile: /home/neonphog/projects/lair-client-js/store_file
runtimeSecretsSalt: W0bcYOyNCyWdvIN2CJnhlA
runtimeSecretsMemLimit: 268435456
runtimeSecretsOpsLimit: 3
runtimeSecretsContextKey:
  - TuHvEXhqhtrqUnsnhOpgZ7ouDMs38Kr1
  - 8AjuCG6B1htqR5-AcIWt9jCZUM-JEeqZIoHKdWO7zTG2rz_TEyUtajtwqROwIOu6Pg
runtimeSecretsSignSeed:
  - LgUakxOARTqB-mmS03yXiLqyKMMn0KwC
  - WjtCXMR-xdlQUovplHd6XtePLruwPxvZTPuuviSOqLK3AsnFFvyVP0UeOYTqQleE4g
`

describe('LairClient Test Suite', () => {
  it('sanity', async () => {
    await lairClient.lairClientReady

    const config = lairClient.LairServerConfig.fromYamlString(yamlFixture)
  })
})
