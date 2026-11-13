---
title: Permissions and consent in depth
nav_title: Consent
description: How the player is asked to allow a mod's code and permissions - when the question appears, what it shows, required and optional permissions, what is asked again after an update, and how each layer checks a permission.
order: 9
level: advanced
---

A mod with code can do a lot, so the player decides what it may do. Before your code runs, the player is asked once
to allow it and every permission it declares. This page explains when that question appears, exactly what the player
reads, and what your mod gets for each answer. For the everyday view, start with [Permissions](start/permissions.md).

## What needs consent

| Your mod has         | The player is asked                                                                            |
| -------------------- | ---------------------------------------------------------------------------------------------- |
| No code              | Never. A mod of content only cannot use a permission; one it declares anyway is the Note L218. |
| Code                 | To allow its code, on this device.                                                             |
| Code and permissions | To allow its code and its permissions, in one question.                                        |

Your mod declares its permissions in [luma.json](reference/luma-json.md#permissions). A permission covers one thing
outside the game: the internet, the local network, the microphone, the clipboard, the player's save files, and so on.
Many services need none: your own folders, the clock, reading the controls, playing sound, drawing, the game's own
files.

## When the question is asked

| Moment                                                                                                                      | What happens                                                                                                                                                                                                      |
| --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The player **imports** the mod                                                                                              | The import's result screen ends with the question. The mod is installed either way: Allow turns it on, Not now installs it off.                                                                                   |
| The player **turns the mod on** on the Mods page                                                                            | The question comes before the change is applied. Not now leaves it off.                                                                                                                                           |
| **A start**, when the answer no longer holds (an update changed the code or a permission, or the mod was copied in by hand) | The mod's code does not start this session and its content is not used. When the title appears, the menu opens on the question by itself. Allowing applies at the next start, through the usual restart question. |
| **A mod asks to install another mod**                                                                                       | The request goes through the import screen, which asks as at import.                                                                                                                                              |

At no other moment. Your mod's code cannot open, answer or skip the question: it is the game's own screen, and no
service reaches it.

## What the player sees

The question appears on the Mods tab, one mod at a time:

1. A heading with the mod's name and version.
2. If the code changed since the player last answered: "This version changes the mod's code."
3. The code warning: "This mod runs its own code and can do anything on this device. Only allow mods you trust."
4. One row per permission, in the order `luma.json` lists them (`native` always first):
   - its short name (such as "Internet"), marked "new" when it is asked again;
   - "Needed to start" or "It starts without this";
   - what it allows, in the game's words (such as "Connects to the internet: api.example.org.");
   - "The mod says:" and your `why`, in quotation marks, exactly as you wrote it.
5. The buttons **Allow**, **Choose** (only when the mod has an optional permission) and **Not now**.

> [!WARNING]
> **The focus starts on Not now**, so a player pressing A through the screen grants nothing. Write a `why` that a
> player can act on: one plain line saying what the mod does with the permission.

Your `why` is drawn in the game's font, in the language you wrote it in; a character the font lacks shows the font's
missing-character mark. Escape and B mean Not now. **Choose** turns each permission row into an allow / don't allow
toggle; required ones stay allowed.

On the mod's own page, the player can later change each answer (Code and each permission: Allowed / Not allowed). A
change applies at the next start, through the restart question. A mod whose code the player declined reads "Off:
waiting for your answer" in the list.

## Required and optional permissions

A permission is **required** when your code imports its service with a plain `use svc.<name>`, and **optional** when
the import is marked `optional`. `native` is always required, because extra libraries load before your code.

```lumascript source/main.lum
use optional svc.capture     // optional: capture is none when it is not available to the mod
```

In C, an import marked `LUMA_OPTIONAL` is optional in the same way.

| The player  | A required permission                                                                                           | An optional permission                                                                                           |
| ----------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Allows it   | The service binds.                                                                                              | The service binds.                                                                                               |
| Declines it | The mod is off: "Off: you did not allow {permission}" (a Note in the mod log, since it is the player's choice). | The mod starts; the service is `none` (in C, its slot is null), and the mod's page lists it under "Not allowed". |

So make a permission optional when your mod has something sensible to do without it, and test that path.

## What is asked again

The game remembers each answer with a fingerprint of what the player was shown.

| Change in an update               | Asked again?                                                                         |
| --------------------------------- | ------------------------------------------------------------------------------------ |
| The code's libraries change       | Yes: "This version changes the mod's code." Until answered, the code does not start. |
| A new permission                  | Yes, marked "new".                                                                   |
| A permission's hosts change       | Yes, marked "new".                                                                   |
| Only a permission's `why` changes | No.                                                                                  |
| A permission is removed           | No; its answer is dropped.                                                           |
| The mod is removed                | Its answers go.                                                                      |

"Not now" to the code is remembered for that build: the player is not asked at every start, only when the code
changes or when they turn the mod on again.

## How a permission is checked

Each layer checks the same list, so a mistake is caught as early as possible:

| When                          | Check                                                                                          | Result                                                                                                                        |
| ----------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Building LumaScript           | `use svc.<name>` of a service whose permission `luma.json` does not declare                    | Reported at the `use` line (L506)                                                                                             |
| Checking and importing        | The code imports a permissioned service the manifest does not declare                          | L506: the mod is refused                                                                                                      |
| Checking and importing        | A permission declared that no code imports                                                     | Note L218                                                                                                                     |
| Each start                    | A required permission the player declined                                                      | The mod is off before the start check ("Off: you did not allow {permission}")                                                 |
| Binding the code              | The granted permissions are handed to the loader; an optional import not granted is left empty |                                                                                                                               |
| While running                 | A service asked for by name (from C) without the grant                                         | The call gets nothing; the mod log says `{mod} may not use {service}: the "{permission}" permission was not granted` (code 4) |
| While running, `net.internet` | A host not in the permission's `hosts`                                                         | The call is refused, and the mod log names the host (code 250)                                                                |

`native` is not a service: the validator checks it (L509) and the game checks it before it loads your extra
libraries. A mod that declares it and is not allowed it does not start.

## The permissions

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
| `system.clipboard` | Clipboard        | Reads and writes the clipboard.                                                   |
| `system.links`     | Web pages        | Opens web pages in your browser.                                                  |
| `save.game`        | Game saves       | Reads your save files and may offer one to replace; you confirm each replacement. |

For `net.internet`, `{hosts}` is your `hosts` list joined by commas; `*` alone reads "any address". Hosts are
lowercased before they are compared, so `API.example.org` is not a second host.

## See also

- [Permissions](start/permissions.md)
- [luma.json: permissions](reference/luma-json.md#permissions)
- [Services overview](services/overview.md)
- [How the game loads a mod](reference/loading.md#services-and-permissions)
- [Error codes](reference/error-codes.md)
