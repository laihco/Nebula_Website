---
title: 'LumaKit: net.kit'
nav_title: net.kit
description: Reliable, ordered messages and rooms of peers over the network service's datagrams, a clock shared between peers, and a small web server for a page such as a phone controller.
order: 20
level: advanced
---

`kit.net.kit` builds the pieces online and local-network mods need on top of the [network service](services/net.md). Datagrams can be lost or arrive out of order; a `Link` made from them delivers your messages reliably and in order, to one peer or to all, and tells you when peers join and leave. A shared clock tells you how far your game's time is from the host's. And a small HTTP and WebSocket server serves a page of your mod's files to a phone or browser on the same network, so the page can act as a controller and send messages back.

## Example

A link over a datagram socket your mod opened with the network service, its messages, and the offset to the host's clock:

```lumascript source/main.lum
use kit.net.kit as net_kit
use svc.net.local

var link: net_kit.Link? = none

fn join(socket: net.Datagrams) {
    link = net_kit.reliable(socket)          // needs: net
    start sync_clock()
}

task sync_clock() {
    guard let l = link else { return }
    let offset = wait net_kit.clock(l)       // the host's time minus ours, in seconds
    log "clock offset {offset} s"
}

fn say_hello() { link?.send_all("hello".bytes()) }

on net_kit.received(l, from, data) { log "peer {from} sent {data.len()} bytes" }
on net_kit.peer(l, id, joined) { log "peer {id} joined: {joined}" }
```

A page served to a phone on the same network:

```lumascript
let page = net_kit.serve_page(8080, [data "pad.html", data "pad.js"])   // needs: net (listen)

on start { log "open {page.url()} on your phone" }
on net_kit.page_message(p, data) { log "the page sent {data.len()} bytes" }
```

## Using it

Add LumaKit to your mod's `needs` in `luma.json`, `use` the module, and declare the network permission the functions you call need:

```json
"needs": [ { "id": "lumakit", "version": "^1" } ]
```

```lumascript
use kit.net.kit as net_kit
```

The last part of the module's name is `kit`, so give it a name of its own with `as`; its events are named `net_kit.received`, `net_kit.peer` and `net_kit.page_message`.

The module makes its network calls through the [network service](services/net.md) on your mod's behalf, so **your mod must declare the network permission**, and the player sees it on your mod, not on LumaKit (see [Permissions](start/permissions.md)). The interface marks `reliable` as `needs: net` and `serve_page` as `needs: net (listen)`. The network service has two permissions: `net.local` (this machine and the local network) and `net.internet` (the hosts you name); listening for connections is `net.local` only.

> [!PLANNED]
> net.kit is built on parts of the network service that are not built yet: datagram helpers for peer-to-peer play across the internet (such as STUN), and WebSocket connections, which `serve_page` uses. See [What works today](lumakit/overview.md#what-works-today) for the general limits.

## Interface

```lumascript
pub struct Link { fn send(self, to: u8, data: bytes); fn send_all(self, data: bytes); fn peers(self) -> list<u8>;
                  fn close(self) }                // events: net_kit.received(link, from, data), net_kit.peer(link, id, joined)
pub fn reliable(over: net.Datagrams) -> Link   // needs: net
pub fn clock(l: Link) -> pending<f64>          // the host's time minus ours, in seconds
pub struct Page { fn url(self) -> text; fn close(self) }   // events: net_kit.page_message(page, data)
pub fn serve_page(port: u16, files: list<data>) -> Page   // needs: net (listen)
```

## Functions

| Name                      | Description                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------------ |
| `reliable(over)`          | Makes a `Link` over the datagram socket `over`: messages arrive whole, once, and in order. |
| `clock(l)`                | Measures the host's time minus yours, in seconds. `wait` on it.                            |
| `serve_page(port, files)` | Serves your mod's `files` over HTTP and WebSocket on `port`, and returns a `Page`.         |

### Link

| Name             | Description                           |
| ---------------- | ------------------------------------- |
| `send(to, data)` | Sends `data` to the peer `to`.        |
| `send_all(data)` | Sends `data` to every peer.           |
| `peers()`        | The ids of the peers now in the room. |
| `close()`        | Closes the link.                      |

### Page

| Name      | Description                                  |
| --------- | -------------------------------------------- |
| `url()`   | The address to open on the phone or browser. |
| `close()` | Stops serving the page.                      |

## Events

| Event                                | When                                                     |
| ------------------------------------ | -------------------------------------------------------- |
| `net_kit.received(link, from, data)` | A message `data` arrived on `link` from the peer `from`. |
| `net_kit.peer(link, id, joined)`     | The peer `id` joined (`joined` true) or left (false).    |
| `net_kit.page_message(page, data)`   | The served page sent a message.                          |

Events arrive at the start of a frame, on the game thread.

## Behaviour and edge cases

- **Lost datagrams.** A link keeps messages in order and complete even when a large share of datagrams is lost (it is tested with one in five dropped).
- **Peers leaving.** A peer that leaves is reported with `net_kit.peer(link, id, false)`.
- **The clock** is meant to agree within one frame on a local network.
- **Your mod switched off.** Its links are closed and its pages stop being served.

## See also

- [Network service](services/net.md)
- [Permissions](start/permissions.md)
- [replay](lumakit/replay.md): poses to send to other players
- [Tutorial: online leaderboard](tutorials/online-leaderboard.md)
