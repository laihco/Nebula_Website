---
title: Services overview
nav_title: Overview
description: What the game's services are, how you use them from LumaScript, which ones need a permission, and the rules every service keeps.
order: 1
level: essential
---

Services are what the game offers your mod beyond its own functions: the controls the player binds, the clock,
files, saves, the network, sound, the screen and facts about the machine. This page explains how you reach a
service, the rules every service follows, and what happens to what your mod holds when it is switched off. Each
service then has its own page.

## Using a service

You bring a service into a source file with `use svc.<name>`, then call its functions by the service's name:

```lumascript source/main.lum
use svc.time
use svc.input

option boost: input.Action          // a "key" option in luma.json: an action the player binds

on frame {
    if input.read(boost).pressed == 1 {
        log "boost pressed on frame {time.now().frame}"
    }
}
```

A few things happen for you here:

- The compiler checks every name against the services the game describes, so a misspelt function is a build error,
  not a crash.
- Every service function takes the calling mod as its first argument in C; in LumaScript the compiler passes it,
  so you never write it.
- `time` and `input` need no permission, so nothing else is needed. A service that does need one must be declared
  in `luma.json` (see [Permissions](#permissions)).

A service with a dotted name, such as `system.links`, is used and called by its whole name. This one needs a
permission, and opening a page is a request that answers later, so it is `wait`ed in a task:

```lumascript
use svc.system.links

task open_help() {
    wait system.links.open("https://example.org/help")
}
```

## The services

| Service                        | What it is for                                                               | Permission                  |
| ------------------------------ | ---------------------------------------------------------------------------- | --------------------------- |
| [`input`](services/input.md)   | Your mod's own actions, which the player binds in Controls                   | none                        |
| [`time`](services/time.md)     | Frames and world steps, the real clocks, slow motion and pause, timers       | none                        |
| [`draw`](services/draw.md)     | Drawing over and into the game's picture                                     | none                        |
| [`ui`](services/ui.md)         | Opening and changing the game's layouts and your own screens                 | none                        |
| [`system`](services/system.md) | Facts about the machine and the game, the game window's display              | none                        |
| `system.clipboard`             | Reading and writing the clipboard                                            | `system.clipboard`          |
| `system.links`                 | Opening a web page in the player's browser                                   | `system.links`              |
| [`assets`](services/assets.md) | Reading the game's files and your mod's own content                          | none                        |
| [`audio`](services/audio.md)   | Playing sound and reading the game's own mix                                 | none                        |
| `audio.microphone`             | Hearing the player's microphone                                              | `audio.microphone`          |
| [`capture`](services/audio.md) | Seeing the player's camera                                                   | `capture.camera`            |
| [`fs`](services/files.md)      | Your mod's own folders                                                       | none                        |
| `fs.exchange`                  | The Exchange folder, which the player and other mods can open                | `fs.exchange`               |
| [`save`](services/save.md)     | Your mod's own save values                                                   | none                        |
| `save.game`                    | Reading the game's save files and offering one to replace                    | `save.game`                 |
| [`mods`](services/mods.md)     | Other mods: the list, ids, asking to install one                             | none                        |
| [`net`](services/net.md)       | `net.local` (your network and this device) and `net.internet` (the internet) | `net.local`, `net.internet` |

A service that needs a permission always has the permission's name, so `use svc.system.links` is exactly the
permission `system.links`. A service that needs two kinds of permission is two services (`net.local` and
`net.internet`).

## Permissions

Most services need no permission: your mod's own folders and save values, the game's clock and controls, facts
about the system, other mods, playing sound, drawing and the game's layouts. Reading the game's own picture or its
own sound mix needs none either, because it shows nothing outside the game.

The permissions are a closed list. Each has a short name and a line the player reads before allowing it:

| Permission         | Short name       | What the player reads                                                             |
| ------------------ | ---------------- | --------------------------------------------------------------------------------- |
| `native`           | Native libraries | Runs libraries of its own with full access to this device.                        |
| `fs.exchange`      | Exchange folder  | Reads and writes files in the Exchange folder, which you and other mods can open. |
| `net.local`        | Local network    | Connects to devices on your network and to programs on this device.               |
| `net.internet`     | Internet         | Connects to the internet: {hosts}.                                                |
| `input.inject`     | Controls         | Presses buttons and moves the controls as if it were you.                         |
| `input.devices`    | Other devices    | Uses Bluetooth, USB and MIDI devices connected to this device.                    |
| `audio.microphone` | Microphone       | Hears your microphone.                                                            |
| `capture.camera`   | Camera           | Sees your camera.                                                                 |
| `system.clipboard` | Clipboard        | Reads what you copy, text and pictures, and can replace it.                       |
| `system.links`     | Web pages        | Opens web pages in your browser.                                                  |
| `save.game`        | Game saves       | Reads your save files and may offer one to replace; you confirm each replacement. |

`native` is not a service: it lets a mod load extra libraries of its own. `input.inject` and `input.devices` are
reserved for parts of `input` that are not built yet (see [input](services/input.md)).

You declare each permission your code uses in `luma.json`, with one line saying why:

```json
"permissions": [
  { "name": "system.links", "why": "Opens the mod's guide when you choose Help." }
]
```

`net.internet` also takes `hosts`, at most 32 entries: a name (`api.example.org`), every name under a domain
(`*.example.org`, which does not include the domain itself), an IPv4 address, or `*` alone for any address. A host
grants every port. Addresses the player types while playing (a co-op partner's) need `*`.

How each case is checked:

| Case                                                       | What happens                                                                                                                                         |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Your code uses a permissioned service you did not declare  | Error **L506** when you check or build, and again when the mod is imported: `{mod} uses {service} without asking for the "{permission}" permission.` |
| You declared a permission and no code uses it              | Note **L218**. It stays a note, because C code may ask for a service by name while running.                                                          |
| The player declines a permission your mod needs            | The mod is off before it starts, and the mod log says which permission (`Consent.OffDeclined`). None of its code runs.                               |
| The player declines a permission you only use `optional`ly | The mod starts; that service is `none`.                                                                                                              |

`use optional svc.<name>` marks a service your mod can live without. It is then `none` where it is not available,
instead of stopping the mod from loading:

```lumascript
use optional svc.capture
```

See [Permissions](start/permissions.md) for how players are asked, and [Permissions and consent in depth](reference/consent.md)
for every detail of the consent screen.

## Calling rules

Every service keeps the same rules, so once you know them you know how every service behaves.

- **The game thread.** Service functions run on the game thread unless a function's own page says "any thread".
  Your scripts run there, so this matters only to C code that starts threads of its own.
- **Nothing blocks.** A call returns within the frame. Anything that waits on the outside world (a file, a
  connection, the clipboard) is a request: it answers later, at the start of a frame.
- **Your mistakes are reported; the world's answers are returned.** A wrong argument, a call from the wrong thread,
  a handle that is closed or not yours, or a limit reached is your mod's mistake: the call does nothing and the mod
  log says so, naming the service and function. A file that is not there or a refused connection is an answer your
  mod is expected to handle, and is never written to the log by itself.
- **Handles are yours only.** A handle (a timer, a request, a screen) works only in the mod that got it. A handle is
  never 0 and is never given out twice in one session, so a closed handle stays recognisably closed.
- **Text** is UTF-8. A service copies what you give it and never keeps your text or buffers after the call.
- **Memory** a service keeps for your mod (buffers, queues) is counted against your mod, shown on the Mods page and
  freed when the mod ends.

### What a call gives you in LumaScript

The compiler turns each service function into an ordinary LumaScript function:

| The function...                    | In LumaScript                                                               |
| ---------------------------------- | --------------------------------------------------------------------------- |
| cannot fail except by your mistake | returns its result, or nothing. A mistake was already reported.             |
| can be answered "no" by the world  | returns `T?` (`none` for any answer), or `bool` when there is no result.    |
| is a request that answers later    | can be `wait`ed in a task: the result is `none` for any answer.             |
| is a request with several events   | takes a closure that runs for each event, and returns the request's handle. |

A struct the service fills, such as `time.Now`, is `<service>.<Name>` in LumaScript. Its enums are
`<service>.<Enum>.<Case>`, such as `time.Clock.Frames` or `system.Platform.Windows`. A whole-number constant of the
service is `<service>.<NAME>`, such as `time.TIMERS_MOST`.

When you need to know which answer you got, an event's `status` is `svc.Answer?`: `none` for success, otherwise one
of `Denied`, `Absent`, `NotFound`, `Exists`, `Io`, `Timeout`, `Closed`, `Memory`, `Busy`, `Format`, `TooLarge` or
`Unreachable`. The same `svc.Answer` is used by every service.

A table's `cancel` is `<service>.cancel(h)`. After it returns, nothing more arrives for that request. If a task
that is waiting on a request ends (your mod stops, or a state machine leaves the state), the request is cancelled
for you.

## Events and frames

Answers from the outside world arrive as events, on the game thread, at the start of a frame:

1. Every mod's events are delivered, mods in the Mods list's order (top first), each mod's in the order they
   arrived.
2. Then every mod's `on frame` handler and tasks run, in the same order.

So a task that `wait`s on a request sees the answer in the same frame it arrived, after every mod's events have
been delivered: a script never sees a half-delivered frame.

A mod is given at most 256 deliveries a frame. Any more wait, in order, for the next frames.

An event's data is valid only during the call that delivers it. Copy what you want to keep.

A service with events that are not answers to one request (data arriving on a connection, say) gives them to
`on <service>.<event>(e) { }` handlers, which the compiler turns into tasks when they `wait`. An event that belongs to one request goes to the closure you gave that request, never to an `on` handler: writing
`on time.timer` is error S0107.

A fault inside your event code is caught by [the guard](reference/guard.md) like any other fault in your mod. The
mod log names the service and the event kind that was running.

## A mod's life

Services follow your mod from start to end:

- **Begin.** Before your mod's `on start` runs, every service knows it, so you can call any service from `on start`.
- **Switched off, reloaded or removed.** After your `on stop` runs, the mod is taken out. From then on every
  service call does nothing, and each service closes everything the mod held: open handles, timers, requests,
  screens, a hold on the world clock. Events still queued for it are dropped. No event is ever delivered to a mod
  after its `on stop`.
- **End.** Whatever a service kept for the mod is freed before the mod's memory and code go.

Your `on stop` can still close its own handles through a service: the mod is live until `on stop` returns.

## Versions

Each service has a version, `<major>.<minor>`. A newer minor only adds: new functions at the end, new fields at the
end of structs, new enum values and event kinds. A minor never changes what an earlier minor's functions do.

- Your mod asks for the version it was built against. A game with that minor or a newer one gives it the service.
- A game with an older minor, or only another major, refuses the mod with **L505** naming the service and the
  version, unless you wrote `use optional`.
- Every service a game defines exists on every platform. What a platform or a device lacks is answered by the
  service's functions as absent (`svc.Answer.Absent`), never by a missing service. A mod never fails to load just
  because of the platform it runs on.

## No cost when no mod uses it

A service does nothing until a mod calls it. It opens no file, socket, device or thread before then, and closes
them when the last mod using them is gone. With nothing waiting, the start of a frame costs the game one check.
Players with no mods, or with mods that do not use a service, pay nothing for it.

## The registry

The game holds one list of every service it defines: its name, version and permission. That list is written into
the game's description of itself, which LumaLink carries for each game version. This is how `lumalink check`
checks your `use svc.<name>` lines, your versions and your permissions without the game running.

Service names are one or more lower-case parts joined by `.` (`time`, `fs.exchange`, `net.internet`), each part a
letter followed by letters and digits, at most 31 bytes in all. In LumaScript a dotted path such as
`system.clipboard.get_text` is read as the longest service name that leaves one part, so no service has a function
with the name of another service under it.

## Messages in the mod log

Your mod's mistakes with any service are reported with these rows (each service adds rows of its own on its page):

| Code | Row                  | What the player and you read                                                          |
| ---- | -------------------- | ------------------------------------------------------------------------------------- |
| 100  | `Service.Thread`     | `{mod} called {where} off the game thread; it did nothing.`                           |
| 101  | `Service.Argument`   | `{mod}: {where} was given a wrong {argument}; it did nothing.`                        |
| 102  | `Service.Handle`     | `{mod}: {where} was given a handle that is closed or not its own.`                    |
| 103  | `Service.StructSize` | `{mod}: {where} was given a {struct} of {found} bytes; it needs at least {expected}.` |
| 104  | `Service.Limit`      | `{mod}: {where} reached its limit of {count}; it did nothing.`                        |

`{where}` is `<service>.<function>`, such as `time.step`. Each mistake is written to the log once; repeats are
counted. See [The mod log in depth](reference/mod-log.md) and [Debugging](start/debugging.md).

## From C

A mod written partly in C reaches the same services through their C headers, `luma_<name>.h` (`luma_time.h`,
`luma_system.h`...), each of which includes `luma_services.h`. LumaScript is built from these same headers, so the
two always agree.

**Finding a service.** An import row `LUMA_SERVICE(slot, "time", "1.0")` binds the service's table when the mod
loads; `LUMA_OPTIONAL` on the row leaves the slot null instead of refusing the mod. After start,
`core->service(mod, "time", 1, 0)` finds one by name; it returns null for a permission the player did not grant,
and reports `Hook.ServiceNotGranted`.

**Every table starts with** `LumaServiceTable { uint32_t size; uint16_t major; uint16_t minor; }`. `size` is the
table's size in the game that runs, so a mod built against an earlier minor reads only what it knows.

**Statuses.** Every function returns a status: 0 or more is success, less than 0 an error.

| Status               | Value | Meaning                                                                      | Reported |
| -------------------- | ----- | ---------------------------------------------------------------------------- | -------- |
| `LUMA_OK`            | 0     | Done                                                                         |          |
| `LUMA_PENDING`       | 1     | Accepted: the answer comes as an event                                       |          |
| `LUMA_E_ARGUMENT`    | -1    | An argument the function does not take                                       | yes      |
| `LUMA_E_THREAD`      | -2    | Called off the game thread where the function does not allow it              | yes      |
| `LUMA_E_HANDLE`      | -3    | A handle that is closed, not this mod's, or never was                        | yes      |
| `LUMA_E_LIMIT`       | -4    | A limit the service states was reached                                       | yes      |
| `LUMA_E_DENIED`      | -5    | Outside what the player granted (a host the manifest does not name)          |          |
| `LUMA_E_ABSENT`      | -6    | This platform or this device has no such thing                               |          |
| `LUMA_E_NOT_FOUND`   | -7    | No such file, host, device or name                                           |          |
| `LUMA_E_EXISTS`      | -8    | It exists already                                                            |          |
| `LUMA_E_IO`          | -9    | The system failed to read, write, open or send                               |          |
| `LUMA_E_TIMEOUT`     | -10   | No answer in the time given                                                  |          |
| `LUMA_E_CLOSED`      | -11   | The other side closed, or the thing was closed meanwhile                     |          |
| `LUMA_E_CANCELLED`   | -12   | The mod cancelled it, or the mod is being taken out                          |          |
| `LUMA_E_MEMORY`      | -13   | No memory for it                                                             |          |
| `LUMA_E_BUSY`        | -14   | Not now: a queue is full or the device is in use; try again on a later frame |          |
| `LUMA_E_FORMAT`      | -15   | The data is not of the form the function reads                               |          |
| `LUMA_E_TOO_LARGE`   | -16   | More than the function allows at once                                        |          |
| `LUMA_E_UNREACHABLE` | -17   | The network cannot reach the other side                                      |          |

A null or unknown mod pointer gives `LUMA_E_ARGUMENT` (logged once per function, repeats counted); a mod that is
being taken out gets `LUMA_E_CANCELLED` and nothing is done.

**The size rule.** Every struct you pass to a service or that a service fills starts with `uint32_t size`, which you
set to `sizeof` as your mod was built. A service reads or writes only that much, and fields past your `size` take
the defaults the service states. A `size` smaller than the struct of the service's first minor is `LUMA_E_ARGUMENT`,
reported as `Service.StructSize`.

**Events.** A function that answers later takes `LumaEventFn fn, void* user`, returns `LUMA_PENDING` with a request
id or handle, and later calls `fn(user, &event)` at a frame's start:

```c
typedef struct LumaEvent {
    uint32_t size;     /* sizeof(LumaEvent) in the game that runs */
    uint32_t kind;     /* the service's own event kinds */
    int32_t status;    /* LUMA_OK or a LUMA_E_* */
    uint32_t flags;    /* the kind's */
    LumaHandle handle; /* what it is about: the handle or the request id the call gave */
    const void* data;  /* the kind's bytes, or null */
    uint64_t data_size;
    uint64_t value;    /* a number the kind defines */
} LumaEvent;

typedef void (*LumaEventFn)(void* user, const LumaEvent* event);
```

Everything an event points at is valid only during the call. `LUMA_EVENTS_PER_FRAME` (256) is the most deliveries
one mod is given in a frame. Every function that returns `LUMA_PENDING` with a request id has a `cancel(mod, id)`;
once it returns, `fn` is never called for that id. A handle's `close` gives the same promise for every event about
that handle.

**Colours** are `LumaColor`, a `uint32_t` holding 0xRRGGBBAA. A handle is a `LumaHandle` (`uint64_t`).

## See also

- [Permissions](start/permissions.md)
- [Debugging](start/debugging.md)
- [Lifecycle, options and frames](lumascript/events.md)
- [Tasks, states and `wait`](lumascript/tasks.md)
- [Errors at build time and while the game runs](lumascript/errors.md)
- [Permissions and consent in depth](reference/consent.md)
- [luma.json](reference/luma-json.md)
- [Error codes](reference/error-codes.md)
