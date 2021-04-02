[back to README.md](README.md)

# Contributing
[![](https://img.shields.io/github/workflow/status/holochain/lair-client-js/Node.js%20CI/develop?style=flat-square&label=develop)](https://github.com/holochain/lair-client-js)

## Overview
Implementation is based on the Lair protocol documented at https://github.com/holochain/lair/blob/master/docs/protocol.md


## Development

See [docs/API.md](docs/API.md) for detailed API References

### Environment

- Developed using Node.js `v12.15.0`
- Integration tests used Lair `v0.0.1-alpha.12`

Nix shell are in `default.nix`
```bash
nix-shell
```

### Building
No build required.  Vanilla JS only.

### Testing

To run all tests with logging
```
make test-debug
```

- `make test-unit-debug` - **Unit tests only**
- `make test-integration-debug` - **Integration tests only**

> **NOTE:** remove `-debug` to run tests without logging


#### Manually running Lair for tests

Tests expect to find Lair `socket` in repo directory `./lair`.
```bash
lair-keystore --lair-dir ./lair
```
