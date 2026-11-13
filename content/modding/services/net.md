---
title: Networking
nav_title: net
description: Connect to programs on this device, the local network and named internet hosts, over TCP, UDP, local pipes, TLS and HTTP.
order: 9
level: intermediate
---

The `net` services let your mod talk to the world outside the game: a speedrun timer on the same machine, a friend's
game on the local network, or your own server on the internet. There are two services with the same functions and
different reach, each behind its own permission, so the player always knows how far a mod can talk.

## Example

This mod drives LiveSplit through its server on the same machine (TCP port 16834): it starts the timer when play
begins and splits on every star. It is taken from the [LiveSplit link tutorial](tutorials/livesplit-link.md).

```lumascript source/main.lum
use svc.net.local

option port: int                  // LiveSplit's server port, 16834 by default

var link: net.local.Stream? = none
var running = false

on start { connect() }

fn connect() { link = net.local.tcp_connect("127.0.0.1", port as u16) }

on net.local.closed(s, why) {
    if same(s, link) { link = none; log "LiveSplit link closed: {why}; retrying in 5 s"; start retry() }
}
task retry() { wait 5 seconds; connect() }

fn say(line: text) { link?.send("{line}\r\n".bytes()) }

hook after GameScene::startStagePlayFirst() {
    if not running { say("starttimer"); running = true }
}
hook before GameSceneFunction::requestPowerStarGetDemo() { if running { say("split") } }
```

And in `luma.json`:

```json
{
  "permissions": [
    { "name": "net.local", "why": "Talks to LiveSplit to start and split your timer." }
  ]
}
```

Nothing here waits: `tcp_connect` returns at once, and what happens later (connected, data arrived, closed) comes as
**events** at the start of a frame, on the game thread, in the order it happened.

## Two services: local and internet

| Service        | Reaches                                        | Permission                      | The player reads                                                      |
| -------------- | ---------------------------------------------- | ------------------------------- | --------------------------------------------------------------------- |
| `net.local`    | This machine and the local network, by address | `net.local` (**Local network**) | "Connects to devices on your network and to programs on this device." |
| `net.internet` | Public internet hosts that `luma.json` names   | `net.internet` (**Internet**)   | "Connects to the internet: {hosts}."                                  |

Both have the same functions, events and limits. Use `net.local` for a tool on the same PC (LiveSplit, a level
editor, a ghost viewer) or LAN co-op; use `net.internet` for a server of your own.

### net.local: this machine and your network

`net.local` connects only to addresses written as text in these ranges: `localhost`, `127.0.0.0/8`, `::1`, `10/8`,
`172.16/12`, `192.168/16`, `169.254/16`, `fc00::/7` and `fe80::/10`. It never looks a name up; any name or other
address is a mistake (reported, nothing done).

### net.internet: the hosts you name

`net.internet` reaches only the hosts listed in its permission's `hosts`:

```json
{
  "permissions": [
    {
      "name": "net.internet",
      "hosts": ["board.example.org", "*.cdn.example.org"],
      "why": "Uploads your best times to the leaderboard."
    }
  ]
}
```

| Entry             | Matches                                                                                                                           |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `api.example.org` | That host only.                                                                                                                   |
| `*.example.org`   | Any name under `example.org`, but not `example.org` itself.                                                                       |
| `203.0.113.7`     | That IPv4 address (for a server with no name).                                                                                    |
| `*`               | Any host. The consent screen shows "any address". Needed when the player types an address at run time, such as a co-op partner's. |

There are 1 to 32 entries; names are compared in lower case and a final dot is ignored. No port is given (a host
grants every port) and there are no IPv6 literals (`*` covers them). A host your manifest does not name is refused at
once with `Denied`, and the mod log says which host it was.

Two more rules keep `net.internet` honest:

- **Public addresses only.** Every address a name looks up to is dropped if it belongs to this machine or the local
  network (`net.local`'s ranges, plus `0/8`, `100.64/10`, multicast and reserved ranges). If none is left, the
  connection fails with `Denied`: a name pointing into the player's network is not a way around `net.local`'s
  permission.
- **No servers on the internet.** `net.internet` cannot listen, and cannot open a UDP socket anyone may send to.

Changing the `hosts` list in an update asks the player again. See [Permissions](start/permissions.md).

## Operations

Each operation is called on the service, as `net.local.<name>` or `net.internet.<name>`.

| Operation                           | `net.local` | `net.internet` | Description                                                                                                                             |
| ----------------------------------- | ----------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `tcp_connect(host, port)`           | yes         | yes            | Opens a TCP connection. CONNECTED or ERROR follows.                                                                                     |
| `tcp_listen(port, local_network)`   | yes         | `Denied`       | Listens for connections: `local_network` 0 for this machine only (127.0.0.1), 1 for the local network too. Port 0 lets the system pick. |
| `port(listener)`                    | yes         | -              | The port a listener got (useful after port 0).                                                                                          |
| `send(socket, data)`                | yes         | yes            | Queues bytes to send, in order.                                                                                                         |
| `close(socket)`                     | yes         | yes            | Closes a socket or listener. No event follows.                                                                                          |
| `udp_open(port, local_network)`     | yes (1.1)   | `Denied`       | A UDP socket anyone on this machine or network may send to.                                                                             |
| `udp_connect(host, port)`           | yes (1.1)   | yes (1.1)      | A UDP socket tied to one peer.                                                                                                          |
| `send_to(socket, host, port, data)` | yes (1.1)   | `Denied`       | Sends one datagram from a `udp_open` socket.                                                                                            |
| `ipc_connect(name)`                 | yes (1.2)   | `Denied`       | Connects to a named endpoint on this device (a pipe).                                                                                   |
| `ipc_listen(name)`                  | yes (1.2)   | `Denied`       | Listens on your mod's own endpoint.                                                                                                     |
| `tls_connect(host, port)`           | yes (1.3)   | yes (1.3)      | An encrypted TLS connection.                                                                                                            |
| `tls_listen`                        | yes (1.3)   | `Denied`       | A listener whose connections use TLS with your certificate.                                                                             |
| `http`                              | yes (1.3)   | yes (1.3)      | One HTTP/1.1 request.                                                                                                                   |

The number in brackets is the service's minor version that added the function; 1.0 is TCP.

### Events

| Event     | When                                                                                                                                | Value                               |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| CONNECTED | A connection is open (after the TLS handshake for TLS).                                                                             | -                                   |
| ACCEPTED  | A listener accepted a connection; you get the new socket.                                                                           | -                                   |
| DATA      | Bytes arrived on a socket (at most once a frame per socket).                                                                        | -                                   |
| SENT      | Everything queued on the socket has gone out.                                                                                       | The bytes sent since the last SENT. |
| CLOSED    | The other side closed (status OK), or the connection broke (`Io`). The socket is closed after it.                                   | -                                   |
| ERROR     | A connection could not be made: `Unreachable`, `Timeout` (after 10 s), `NotFound`, `Denied` or `Io`. The socket is closed after it. | -                                   |
| DATAGRAM  | UDP datagrams are waiting.                                                                                                          | How many.                           |

## TCP connections

- **Reading.** Take the bytes inside the DATA event. Bytes you do not take stay for the next frame. At most 1 MiB
  waits per socket; past that the game stops reading it (TCP then slows the sender) until you take some.
- **Sending.** `send` copies your bytes and returns. Sending before CONNECTED, or after the other side closed, gives
  `Closed`. At most 4 MiB may be queued over all your mod's sockets; past that, nothing is queued and the mistake is
  reported.
- **Closing.** After `close` you get no more events for that socket. Bytes already queued are still sent for up to
  10 seconds, then the connection ends. Connections a listener accepted that you never heard of close with the
  listener. Closing twice is a mistake.
- **Ports in use.** Listening on a port that is taken gives `Exists`. On Windows no other program can take the port
  beside your mod; elsewhere a restarted game can listen on it again at once.
- Every socket has Nagle's delay off (TCP_NODELAY), since a game's messages are small.

### Looking names up (net.internet)

A name is looked up on a thread of its own, so a slow lookup never holds up the game or another connection. The
lookup counts toward the connection's 10 seconds. If a name has several addresses, each is tried in turn within those
10 seconds; the last failure is the ERROR. No addresses at all is `NotFound`.

## UDP

Added in version 1.1 of both services, for fast messages where a lost one does not matter.

- **`udp_open`** (`net.local` only) binds a port on this machine (`local_network` 0) or the local network too (1),
  IPv4; anyone there may send to it. Send with `send_to`.
- **`udp_connect`** (both services, to the hosts `tcp_connect` may reach) is tied to one peer: CONNECTED (or ERROR)
  comes first, you send with `send`, and you hear only from that peer. On `net.internet` it uses the first public
  address the lookup gives.
- **Whole datagrams.** One `send` or `send_to` is one datagram of 0 to 65,507 bytes (more is `TooLarge`). Inside a
  DATAGRAM event, take the oldest datagram with its sender's address and port; a longer datagram than your buffer
  loses its rest. Datagrams you do not take wait for a later frame, up to 1 MiB and 4,096 per socket; beyond that
  the system drops what overflows.
- **UDP never tells.** A datagram lost, refused or too large for the path still counts as sent; there is no CLOSED
  on UDP. SENT comes when the queue is empty.

## Endpoints on this device

Added in version 1.2 of `net.local`, with no new permission: a pipe reaches what a loopback connection reaches, so
the player is not asked twice. LiveSplit's Windows pipe, for example, is the endpoint `LiveSplit`.

- An endpoint name is 1 to 64 letters, digits, `.`, `_` and `-`. On Windows it is the named pipe `\\.\pipe\<name>`;
  on Linux and Android an abstract socket name; on Apple systems a socket file in the temporary folder.
- `ipc_connect` reaches any endpoint (another program's or another mod's). `ipc_listen` only listens on your mod's
  own, `nebula.<mod id>.<name>`, so a mod can never take a name another program expects.
- The rest is TCP's: the same events, `send`, `close` and limits. A connect's ERROR is `NotFound` (nothing
  listening), `Timeout` (every instance busy for 10 s), `Denied` or `Io`. Listening where something already listens
  is `Exists`. `port` on an endpoint is a mistake.
- On Windows the program at the other end may learn who connected, but can never act as the game.

`net.internet`'s endpoint functions always answer `Denied`.

## TLS and HTTP

Added in version 1.3 of both services.

### TLS connections

`tls_connect` makes a TLS 1.2 or 1.3 connection, checking the server's certificate against its name (or its address).
CONNECTED comes after the handshake; before it, `send` gives `Closed`. A refused certificate is an ERROR with
`Denied`, and the mod log names the host and the reason. After that it is a stream like TCP's; bytes TLS holds count
in your 4 MiB.

The game ships Mozilla's list of trusted roots. If your own server uses its own certificate authority, add its roots
in your permission's `roots`: 1 to 8 PEM files under `certs/` in your mod, each at most 64 KiB:

```json
{
  "name": "net.internet",
  "hosts": ["board.example.org"],
  "roots": ["certs/board-root.pem"],
  "why": "Uploads your best times to the leaderboard."
}
```

The Mods page shows the roots a mod adds. `tls_listen` (`net.local` only) serves TLS with your mod's certificate
chain and key, PEM files in your mod's folder; a missing file is `NotFound`, a file that is not PEM or a key that
does not match is `Format`.

### HTTP requests

`http` makes one HTTP/1.1 request on a connection of its own. Its events are, in order:

| Event   | Value                                                               |
| ------- | ------------------------------------------------------------------- |
| HEADERS | The status code; the header lines can be taken inside it.           |
| DATA    | The body, as it arrives (chunked encoding and gzip already undone). |
| DONE    | The body's length in bytes.                                         |

- The game writes `Host`, `Content-Length`, `Accept-Encoding: gzip`, `Connection: close` and a `User-Agent` of
  `Nebula/<version> <mod id>` (you may give your own User-Agent).
- Redirects (301, 302, 303, 307, 308) are followed up to 5 times; a sixth is an ERROR. 303, and 301 or 302 after a
  POST, become a GET without the body. Each redirect's host is checked again against your permission, and `https`
  never redirects to `http`: a refused redirect is an ERROR with `Denied`. Ask for no redirects to get the 3xx
  answer yourself; ask for the raw body to keep gzip as sent.
- A body over 64 MiB is `TooLarge`. A request has a timeout (30 s by default, at most 600 s).
- `close` cancels a request. A mod may have 8 requests at once, each also counting as one of its 16 sockets.

## Limits

| Limit                                         | Value            |
| --------------------------------------------- | ---------------- |
| Sockets and listeners, both services together | 16 per mod       |
| Bytes queued to send, all sockets together    | 4 MiB per mod    |
| Bytes waiting to be taken                     | 1 MiB per socket |
| Datagrams waiting to be taken                 | 4,096 per socket |
| One datagram                                  | 65,507 bytes     |
| HTTP requests at once                         | 8 per mod        |
| Connecting (including the lookup)             | 10 seconds       |

Going past a limit is a mistake: the call does nothing and the mod log says which limit. Fixed limits keep one mod
from taking the machine's connections or memory, and each is a number you can plan for.

## When your mod stops

Every socket of a stopped mod ends at once, without sending the rest of its bytes, and nothing is called for it
again. Nothing of `net` is kept between sessions. With no mod using `net`, no thread runs and nothing is opened.

A handle belongs to the service that made it: passing a `net.local` socket to `net.internet` (or back) is a mistake.

## Messages in the mod log

| Row                      | Says                                                                                                      |
| ------------------------ | --------------------------------------------------------------------------------------------------------- |
| `Net.HostNotNamed`       | {mod}: {where} was given the host {host}, which luma.json does not name for net.internet; it did nothing. |
| `Net.CertificateRefused` | A server's certificate was refused; names the host and the reason.                                        |
| `Net.RedirectRefused`    | An HTTP redirect was refused; names the address.                                                          |
| `Net.FileRefused`        | A certificate or key file for `tls_listen` could not be used; names the file.                             |

Beside these, mistakes use the general rows (a wrong argument, a closed handle, a limit).

> [!PLANNED]
>
> - **WebSocket** connections.
> - Listening on IPv6 in `net.local` (connecting to local IPv6 addresses already works).
> - Datagram helpers for peer-to-peer play across the internet, such as STUN.
> - Proxies: the system's TCP is used as it is.

## From C

The header is `luma_net.h`, with two tables of the same layout, `"net.local"` and `"net.internet"`.

- Connect, listen and close return at once; everything else is an event at a frame's start, delivered through the
  function you gave when you made the socket. A socket's events come in the order they happened.
- `take` copies a socket's bytes and works **only inside its DATA event's call**; elsewhere it is `LUMA_E_HANDLE`,
  reported. On a UDP socket use `take_datagram(buf, size, from)` inside the DATAGRAM call: it copies up to `size`
  bytes, gives the sender's address as text and its port, and returns the datagram's whole length, or
  `LUMA_E_NOT_FOUND` when none is left. `take` on a UDP socket, and `send` on a `udp_open` one, are `LUMA_E_HANDLE`.
- `LUMA_NET_DATAGRAM_MOST` is 65507. `LUMA_NET_HTTP_RAW` keeps a gzip body as sent; a no-redirect flag returns 3xx
  answers as they are.
- Mistakes (a far host or a name on `net.local`, a bad `local_network`, a null function, a 17th socket, a closed
  handle) return `LUMA_E_ARGUMENT`, `LUMA_E_LIMIT` or `LUMA_E_HANDLE` and are reported; `LUMA_E_EXISTS` for a port
  in use and `LUMA_E_CLOSED` for a send on a closed stream are answers.
- The game uses one I/O thread for every socket (started at the first socket) and never waits on cryptography on the
  game thread. SIGPIPE never fires.

## See also

- [Tutorial: LiveSplit link](tutorials/livesplit-link.md)
- [Tutorial: online leaderboard](tutorials/online-leaderboard.md)
- [LumaKit: net.kit](lumakit/net-kit.md): reliable messages and rooms between players, built on `net`
- [Permissions](start/permissions.md) and [consent in depth](reference/consent.md)
- [Services overview](services/overview.md)
