import yaml from 'yaml'

/**
 * Parser for lair server config yaml file.
 */
export class LairServerConfig {
  // the connectionUrl referenced by this config
  #connectionUrl

  /**
   * You should not use this constructor directly.
   * Use:
   *  - `LairServerConfig::fromYamlString( .. )`
   *
   * @param {object} - parsed object from yaml string
   */
  constructor (data) {
    this.#connectionUrl = new URL(data.connectionUrl)
    console.log('### connectionUrl SCHEME: ', this.#connectionUrl.protocol)
    console.log('### connectionUrl PATH: ', this.#connectionUrl.pathname)
    console.log('### connectionUrl K: ', this.#connectionUrl.searchParams.get('k'))
  }

  /**
   * Construct / parse a lair server config yaml string.
   */
  static fromYamlString (str) {
    return new LairServerConfig(yaml.parse(str))
  }
}
