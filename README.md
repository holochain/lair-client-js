# lair-shim

nodejs based shim to route signing requests to lair/wormhole proof-of-concept


## Usage

1. Launch lair in a terminal like this:

```
RUST_LOG=debug lair-keystore -d /tmp/lair
```

2. Fire up the the shim:

```
$ node lair-shim.js
```
You should see:

```
Checking for leftover socket.
No leftover socket found.
Creating shim server.
```

3. Fire up the fake holochain:

```
$ node fake-holochain.js
```
You should see:

```
Connecting to shim.
Connected to shim
got messageID ff000010 from shim
```

and on the shim terminal you should see:

```
Connection acknowledged.
Shim Client connected.
Creating sub-client connection to lair.
Connecting to lair.
Connected to lair
got messageID ff000010 from lair passing back through shim
```
