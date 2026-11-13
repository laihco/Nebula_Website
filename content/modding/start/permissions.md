---
title: Permissions
nav_title: Permissions
description: Which services need the player's permission, how to declare them in luma.json, and what the player is asked and when.
order: 7
level: essential
---

A mod's code runs natively on the player's device, so players decide what a mod may do. Every mod with code is asked about before its code runs. A few services that reach outside the game (the internet, the clipboard, the microphone...) also need a **permission** that you declare and the player allows. This page covers which services need one, how to declare them, and what the player sees.

## Declaring a permission

Add a `permissions` list to `luma.json`. Each entry names the permission and says in one line `why` your mod needs it:

```json luma.json
{
  "format": "1.0",
  "id": "you.leaderboard",
  "version": "1.0.0",
  "name": "Leaderboard",
  "summary": "Posts your best times to an online leaderboard.",
  "authors": ["you"],
  "game": { "id": "RMG" },
  "permissions": [
    { "name": "net.internet", "hosts": ["api.example.org"], "why": "Uploads your best times." },
    { "name": "system.links", "why": "Opens the leaderboard's page in your browser." }
  ]
}
```

Then use the service in your code as usual. A permissioned service's name _is_ its permission's name:

```lumascript source/main.lum
use svc.net.internet
use svc.system.links
```

If your code uses a service whose permission isn't declared, LumaLink stops at the `use` line (L506). That's why a mod can never be surprised by a missing permission at run time.

## What needs a permission

| Permission         | Service         | What the player reads                                                             |
| ------------------ | --------------- | --------------------------------------------------------------------------------- |
| `native`           | (not a service) | Runs libraries of its own with full access to this device.                        |
| `fs.exchange`      | `fs`            | Reads and writes files in the Exchange folder, which you and other mods can open. |
| `net.local`        | `net`           | Connects to devices on your network and to programs on this device.               |
| `net.internet`     | `net`           | Connects to the internet: {hosts}.                                                |
| `input.inject`     | `input`         | Presses buttons and moves the controls as if it were you.                         |
| `input.devices`    | `input`         | Uses Bluetooth, USB and MIDI devices connected to this device.                    |
| `audio.microphone` | `audio`         | Hears your microphone.                                                            |
| `capture.camera`   | `capture`       | Sees your camera.                                                                 |
| `system.clipboard` | `system`        | Reads and writes the clipboard.                                                   |
| `system.links`     | `system`        | Opens web pages in your browser.                                                  |
| `save.game`        | `save`          | Reads your save files and may offer one to replace; you confirm each replacement. |

This list is closed: any other name is refused (L211). `native` is needed by a mod that brings extra native libraries in `code.libraries`. It's the most serious permission, and the player is told the mod gets full access to the device.

### What needs no permission

Most of what mods do needs no permission at all:

- the mod's own folders (`fs`) and its own save values (`save`);
- the game's clock and state (`time`) and facts about the system (`system`);
- reading the game's controls (`input`);
- playing sound and reading the game's own mix (`audio`);
- drawing, and reading the game's own picture (`draw`);
- the game's layouts (`ui`) and the game's files and the mod's own (`assets`);
- other mods (`mods`).

Hooks, game functions and LumaKit need no permission either, unless a LumaKit function uses a permissioned service for you. Then its interface says so (`// needs: net`) and **your** mod declares it, so the player sees the permission on the mod that actually uses it.

## The rules of a declaration

| Rule                                                                                                                                                           | Code if broken |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| `name` is one of the eleven names above                                                                                                                        | L211           |
| Each name at most once                                                                                                                                         | L211           |
| `why` is one line of 1 to 200 characters                                                                                                                       | L211           |
| `hosts` is given with `net.internet` and only with it                                                                                                          | L211           |
| `hosts` has 1 to 32 entries                                                                                                                                    | L211           |
| Each host is `*` alone, a name (`api.example.org`), a name under a domain (`*.example.org`), or an IPv4 address (`192.168.1.20`). No port and no IPv6 address. | L204           |
| `roots` (only on `net.local` and `net.internet`) lists 1 to 8 PEM files under `certs/`                                                                         | L211           |

A host allows every port. `*.example.org` covers names under `example.org` but not `example.org` itself. If players type an address at run time (a friend's machine for co-op), you need `*`, and the player is told "any address".

An older form, `"net"`, is refused with a message saying to write `net.local` or `net.internet`.

Two **Notes** help you keep the list tidy:

- **L218**: you declared a permission, but no code imports a service that needs it. You don't need it, unless C code asks for the service by name at run time.
- **L219**: a `test.` permission, which only a test run provides.

## How players are asked

The game asks **one question per mod**, covering its code and its permissions together. It's asked:

| Moment                                           | What happens                                                                                                                                                 |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| The mod is installed                             | The import's result screen ends with the question. **Allow** installs the mod on. **Not now** installs it off.                                               |
| The player switches it on on the Mods screen     | The question comes first. **Not now** leaves it off.                                                                                                         |
| An update changes the mod's code or a permission | Its code doesn't start and its content isn't used this session. When the title appears, the menu opens on the question. **Allow** applies at the next start. |

A mod without code is never asked: it can't use a service.

The question shows:

1. the mod's name and version;
2. if it has code: "This mod runs its own code and can do anything on this device. Only allow mods you trust." (and "This version changes the mod's code." after an update that changed it);
3. one row per permission, in the order you declared them, with `native` first. Each row has the permission's short name and text from the table above, then "The mod says:" and your `why` in quotation marks, then **Needed to start** or **It starts without this**;
4. three buttons: **Allow**, **Choose** (only when the mod has an optional permission) and **Not now**.

> [!NOTE]
> The focus starts on **Not now**, so a player pressing A through the screen grants nothing. Your mod must be worth a deliberate "Allow".

With **Choose**, the player can allow or deny each optional permission. Required ones stay allowed. The player can change any answer later on the mod's page on the Mods screen, and the change applies at the next start.

## Required and optional

- A permission is **required** when your code imports its service normally. `native` is always required.
- It's **optional** when your code imports the service as optional. On a device or for a player without it, the service is `none` and your mod carries on without it. See [Services overview](services/overview.md).

What declining does:

| Declined               | Result                                                                                                      |
| ---------------------- | ----------------------------------------------------------------------------------------------------------- |
| The mod's code         | The mod is off: "Off: waiting for your answer". Not asked again at every start. Switching it on asks again. |
| A required permission  | The mod is off: "Off: you did not allow {permission}"                                                       |
| An optional permission | The mod runs, and the service is `none`. The mod's page lists it under "Not allowed".                       |

## When players are asked again

| Change in an update            | Asked again?                                     |
| ------------------------------ | ------------------------------------------------ |
| The code changed (a new build) | Yes, with "This version changes the mod's code." |
| A new permission               | Yes, marked **new**                              |
| A permission's `hosts` changed | Yes, marked **new**                              |
| Only the `why` text changed    | No                                               |
| A permission removed           | No: its row just goes                            |

So add hosts sparingly. Every change to the list is a new question for every player.

## Writing a good why

The `why` is shown exactly as you wrote it, in your words. Write it for the player:

- Say what the player gets: "Uploads your best times." not "Needed for network."
- One line, at most 200 characters.
- It isn't translated by the game. Write it in the language most of your players read.

> [!WARNING]
> Ask only for what you use. A mod that asks for `native` or `*` hosts without a clear reason is one many players will decline.

## See also

- [Services overview](services/overview.md)
- [Network service](services/net.md)
- [System service](services/system.md)
- [Permissions and consent in depth](reference/consent.md)
- [luma.json reference](reference/luma-json.md)
