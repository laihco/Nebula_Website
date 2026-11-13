---
title: 'luma.json: every field'
nav_title: luma.json
description: The complete reference for luma.json, the manifest every mod has - every key, its type, default, allowed values and the error code that rejects a bad value.
order: 1
level: intermediate
---

`luma.json` is the one file every mod must have. It names the mod, says which game and which other mods it works
with, declares its options and permissions, and lists its layers and code. This page lists every key there is. If
you are starting out, [Anatomy of a mod](start/mod-anatomy.md) covers the few keys you need first.

## A complete example

This manifest uses almost every key. Most mods need far fewer: the seven required keys are marked in the table under
it.

```json luma.json
{
  "format": "1.0",
  "id": "gold-flower",
  "version": "1.0.0",
  "name": "Gold Flower",
  "summary": "Gold Mario throws gold balls; enemies they hit turn to coins.",
  "text": { "JpJapanese": { "name": "ゴールドフラワー", "summary": "..." } },
  "authors": ["keepvaibin"],
  "license": "GPL-3.0-only",
  "links": { "home": "https://example.org/gold-flower" },
  "icon": "media/icon.png",
  "pictures": ["media/shot1.png"],
  "game": { "id": "RMG", "regions": ["RMGE01", "RMGP01", "RMGJ01"] },
  "nebula": ">=2.0.0",
  "renderer": { "features": ["ray_tracing"] },
  "needs": [{ "id": "lumakit", "version": ">=1.0.0" }],
  "conflicts": [{ "id": "other-flower", "why": "Both change the Fire Flower." }],
  "load": { "after": ["lumakit"], "before": [] },
  "takes_over": ["goldflower-old"],
  "options": [
    {
      "key": "balls",
      "kind": "number",
      "default": 3,
      "min": 1,
      "max": 10,
      "step": 1,
      "name": "Balls at once"
    },
    {
      "key": "look",
      "kind": "choice",
      "default": "shiny",
      "values": ["shiny", "matte"],
      "name": "Look",
      "value_names": { "shiny": "Shiny", "matte": "Matte" }
    },
    { "key": "glow", "kind": "toggle", "default": true, "name": "Glow" },
    { "key": "nickname", "kind": "text", "default": "Gold", "max_length": 16, "name": "Nickname" },
    { "key": "throw", "kind": "key", "default": "b", "name": "Throw a ball" }
  ],
  "permissions": [
    { "name": "net.internet", "hosts": ["api.example.org"], "why": "Uploads your best times." }
  ],
  "layers": [
    { "name": "base" },
    { "name": "matte", "when": { "option": { "look": "matte" } } },
    { "name": "pal-text", "when": { "region": ["RMGP01"] } }
  ],
  "code": {
    "platforms": ["windows-x64", "linux-x64", "android-arm64", "macos-arm64", "ios-arm64"]
  },
  "saves": [
    {
      "region": "RMGE01",
      "file": "saves/RMGE01/GameData.bin",
      "why": "Starts you at the first level."
    }
  ],
  "kit": { "lumakit.player.form": 1 }
}
```

| Line                                       | What it says                                                                                             |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `format`                                   | Written for version 1.0 of the `.luma` format. **Required.**                                             |
| `id`, `version`                            | The mod's permanent identity and its version number. **Required.**                                       |
| `name`, `summary`                          | What the Mods screen shows. **Required.**                                                                |
| `text`                                     | The name and summary in Japanese, shown to players who play in Japanese.                                 |
| `authors`                                  | Who made it. **Required.**                                                                               |
| `license`, `links`, `icon`, `pictures`     | Shown on the mod's page.                                                                                 |
| `game`                                     | Super Mario Galaxy, all three regions. **Required.**                                                     |
| `nebula`                                   | Works with Nebula 2.0.0 and later.                                                                       |
| `renderer`                                 | Cannot run without ray tracing. Leave this out unless your mod truly cannot do without the feature.      |
| `needs`, `conflicts`, `load`, `takes_over` | How it relates to other mods.                                                                            |
| `options`                                  | Five settings the player can change on the Mods screen, one of each kind.                                |
| `permissions`                              | Asks to reach one internet host, with the reason the player reads.                                       |
| `layers`                                   | Three content layers: one always on, one when the player picks the matte look, one only in the PAL game. |
| `code`                                     | Code built for five platforms, in `code/<platform>/`.                                                    |
| `saves`                                    | Brings a save file the player is offered when they turn the mod on.                                      |
| `kit`                                      | Brings LumaKit data in `kit/`, in version 1 of the player-form data format.                              |

Two keys are not in the example: `code.libraries` (extra native libraries, which need the `native` permission; see
[code](reference/luma-json.md#code)) and `build`, which LumaLink writes for you.

## Rules for the whole file

- UTF-8 JSON, at most 1 MiB. No comments and no key twice in one object. Breaking any of these is **L201**.
- Every key is known. A key that is not on this page, at any depth, is **L202**; a required key that is missing is
  **L203**; a value of the wrong type or outside its range is **L204**. There is no "ignored" key and no place for
  your own extensions.
- The validator does not stop at the first problem: one `lumalink check` lists every error in the file, each with its
  line. See [Error codes](reference/error-codes.md).

## Every key at a glance

| Key           | Type                  | Required             | Default                                         | Rejected with                |
| ------------- | --------------------- | -------------------- | ----------------------------------------------- | ---------------------------- |
| `format`      | string `"1.<minor>"`  | yes                  |                                                 | L204, L205                   |
| `id`          | string                | yes                  |                                                 | L206, L802                   |
| `version`     | string (semver)       | yes                  |                                                 | L204                         |
| `name`        | string                | yes                  |                                                 | L204                         |
| `summary`     | string                | yes                  |                                                 | L204                         |
| `text`        | object by language    | no                   | none                                            | L214, L202                   |
| `authors`     | array of strings      | yes                  |                                                 | L204                         |
| `license`     | string (SPDX)         | no                   | none                                            | L204                         |
| `links`       | object                | no                   | none                                            | L204, L202                   |
| `icon`        | path                  | no                   | none                                            | L209                         |
| `pictures`    | array of paths        | no                   | none                                            | L209, L215                   |
| `game`        | object                | yes                  |                                                 | L207, L208, L204             |
| `nebula`      | string (semver range) | no                   | any release that reads this format              | L803                         |
| `renderer`    | object                | no                   | none                                            | L202, L203, L204, L806       |
| `needs`       | array of objects      | no                   | none                                            | L800                         |
| `conflicts`   | array of objects      | no                   | none                                            | L801                         |
| `load`        | object                | no                   | none                                            | L212                         |
| `takes_over`  | array of ids          | no                   | none                                            | L213                         |
| `options`     | array of objects      | no                   | none                                            | L210                         |
| `permissions` | array of objects      | no                   | none                                            | L211, L204, L218, L219, L506 |
| `layers`      | array of objects      | no                   | `[{"name": "base"}]` when `layers/base/` exists | L300, L301, L307             |
| `code`        | object                | when `code/` exists  |                                                 | L500, L501, L509             |
| `saves`       | array of objects      | when `saves/` exists |                                                 | L216, L217                   |
| `kit`         | object                | when `kit/` exists   |                                                 | L700, L701, L702             |
| `build`       | object                | written by LumaLink  |                                                 |                              |

## Identity

### format

The version of the `.luma` format the file is written for: a string `"1.<minor>"`. Today that is `"1.0"`.

|          |                                                                                                                                                        |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Type     | string, `"1.<minor>"`                                                                                                                                  |
| Required | yes                                                                                                                                                    |
| Errors   | **L204** when it is not in that form (a number such as `1` is wrong). **L205** when the minor is newer than the game reads: "made for a newer Nebula". |

Format 1 only grows: a new minor adds keys and folders and never changes the meaning of anything older. So write the
lowest minor that has every key you use, and an older game tells the player plainly that the mod needs a newer
Nebula.

### id

The mod's permanent name for programs. Other mods name it in `needs` and `conflicts`, and its save data, options and
folders are all kept under it, so choose it once.

|          |                                                                                                                                                                                                                            |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Type     | string                                                                                                                                                                                                                     |
| Required | yes                                                                                                                                                                                                                        |
| Allowed  | 3 to 64 characters: lowercase letters, digits, `-` and `.`; starts with a letter; no `..`. The part before the first `.` may not be a name Windows keeps (`con`, `prn`, `aux`, `nul`, `com1` to `com9`, `lpt1` to `lpt9`). |
| Errors   | **L206** when malformed. **L802** when another installed mod has the same id.                                                                                                                                              |

```json
"id": "you.hello"
```

> [!TIP]
> If you must rename a mod, keep the old id in [takes_over](reference/luma-json.md#takes-over) so players keep their saves and options.

### version

|          |                                                                                                                                        |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Type     | string                                                                                                                                 |
| Required | yes                                                                                                                                    |
| Allowed  | A semantic version `MAJOR.MINOR.PATCH`, with an optional `-pre` part (`1.2.0`, `2.0.0-beta.1`). Versions are compared by semver rules. |
| Errors   | **L204**                                                                                                                               |

Other mods' `needs` ranges are matched against this, so raise `MAJOR` when you change something other mods rely on.
See [Versions, dependencies and sharing](start/sharing.md).

### name and summary

| Key       | Type   | Required | Allowed                       |
| --------- | ------ | -------- | ----------------------------- |
| `name`    | string | yes      | 1 to 64 characters, one line  |
| `summary` | string | yes      | 1 to 200 characters, one line |

A value outside these limits is **L204**. These are the words the Mods screen shows when the player's language has
no entry in `text`.

### text

Translations of what the player reads, keyed by the game's names for its 14 languages:

`UsEnglish`, `EuEnglish`, `UsFrench`, `EuFrench`, `UsSpanish`, `EuSpanish`, `EuGerman`, `EuItalian`, `EuDutch`,
`UsPortuguese`, `JpJapanese`, `KrKorean`, `CnSimpChinese`, `TwTradChinese`, plus any language an installed language
mod adds.

```json
"text": {
  "JpJapanese": { "name": "ゴールドフラワー", "summary": "..." },
  "EuGerman": { "name": "Goldblume", "summary": "..." }
}
```

|          |                                                                               |
| -------- | ----------------------------------------------------------------------------- |
| Type     | object: language name to an object                                            |
| Required | no                                                                            |
| Holds    | `name`, `summary`, and the options' `name` and `value_names` in that language |
| Errors   | **L214** for a language the game does not have                                |

The game shows the player's language when it is present, and `name`/`summary` otherwise.

### authors

|          |                                                        |
| -------- | ------------------------------------------------------ |
| Type     | array of strings                                       |
| Required | yes                                                    |
| Allowed  | 1 to 16 entries                                        |
| Errors   | **L203** when missing, **L204** when empty or too long |

### license

An [SPDX](https://spdx.org/licenses/) license expression, such as `"MIT"` or `"GPL-3.0-only"`. Optional.

### links

|          |                                                                           |
| -------- | ------------------------------------------------------------------------- |
| Type     | object                                                                    |
| Required | no                                                                        |
| Keys     | `home`, `source`, `issues`; each an `https` URL                           |
| Errors   | **L202** for another key, **L204** for a value that is not an `https` URL |

```json
"links": { "home": "https://example.org/gold-flower", "issues": "https://example.org/gold-flower/issues" }
```

### icon and pictures

| Key        | Type           | Allowed                                                              |
| ---------- | -------------- | -------------------------------------------------------------------- |
| `icon`     | path           | A PNG under `media/`, square, 64 to 1024 pixels                      |
| `pictures` | array of paths | Up to 8 PNG or JPEG files under `media/`, at most 4096 pixels a side |

A named file that is missing, not a PNG (or JPEG for pictures), or outside its size is **L209**. `media/` holds only
the files these two keys name: any other file there is **L215**.

## The game and the device

### game

```json
"game": { "id": "RMG", "regions": ["RMGE01", "RMGP01", "RMGJ01"] }
```

| Key       | Type   | Required | Default   | Allowed                                         |
| --------- | ------ | -------- | --------- | ----------------------------------------------- |
| `id`      | string | yes      |           | `"RMG"` (Super Mario Galaxy)                    |
| `regions` | array  | no       | all three | `RMGE01` (US), `RMGP01` (PAL), `RMGJ01` (Japan) |

- Any other `id` is **L207**, naming the game it is for (for example "Super Mario Galaxy 2" for `SB4`).
- A region name that is not one of the three is **L204**.
- A player whose game is another region sees the mod as off, with the reason: the Note **L208**.

### nebula

A semver range of the Nebula releases the mod works with, such as `">=2.0.0"`. Leave it out to accept any release
that reads the mod's `format`. A release outside the range turns the mod off with **L803**.

### renderer

The graphics features your mod cannot work without.

```json
"renderer": { "features": ["ray_tracing"] }
```

|            |                                                                                                                                                                                                                                                                                           |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Type       | object with one key, `features`                                                                                                                                                                                                                                                           |
| Required   | no                                                                                                                                                                                                                                                                                        |
| `features` | 1 to 64 names, each once; each `[a-z][a-z0-9_]*`, at most 32 bytes, no `__`, not ending in `_`, and one of the features the game's renderer lists                                                                                                                                         |
| Errors     | **L202** for any other key in `renderer`, **L203** when `features` is missing, **L204** for a bad count, name, repeat or a name the game does not list. At each start, **L806** turns the mod off on a device whose graphics lack a listed feature, with one finding per missing feature. |

> [!TIP]
> If your mod can do without a feature, do not list it. Ask at run time instead (the `draw` service's capability
> query), and players on other devices can still use the mod.

## Other mods

### needs

Mods that must be installed, on, and loaded before this one.

```json
"needs": [ { "id": "lumakit", "version": ">=1.0.0" } ]
```

| Field     | Type   | Meaning                                             |
| --------- | ------ | --------------------------------------------------- |
| `id`      | string | The other mod's id                                  |
| `version` | string | A semver range the other mod's `version` must be in |

If a needed mod is missing, off, or of a version outside the range, this mod is off with the reason: **L800**. Two
mods that need each other, directly or through others, are a cycle, also **L800** ("a cycle: a -> b -> a"). A mod
that needs another starts after it; see [How the game loads a mod](reference/loading.md#start-order).

### conflicts

Mods that must not be on at the same time as this one.

```json
"conflicts": [ { "id": "other-flower", "why": "Both change the Fire Flower." } ]
```

| Field | Type   | Meaning                         |
| ----- | ------ | ------------------------------- |
| `id`  | string | The other mod's id              |
| `why` | string | The reason, shown to the player |

When both are on, this mod is refused with **L801** and your `why`.

### load

```json
"load": { "after": ["lumakit"], "before": ["some-other-mod"] }
```

`after` and `before` are lists of ids this mod loads after or before, when both mods are on. They only matter when
both are on, so you may name mods the player may not have. An order that cannot be met (a cycle) is **L212**, naming
it.

### takes_over

Earlier ids of this mod. When the old id is no longer installed, the old mod's saved data and options move to this
id at its first start, and the player sees "Takes over what {old} kept" when installing.

```json
"takes_over": ["goldflower-old"]
```

**L213** refuses a `takes_over` that names this mod's own id, or an installed mod that is on. If the old mod is
installed but off, nothing moves and the new mod's page says so.

## options

Settings the player changes on the Mods screen. Your code reads each one by its key (see
[Lifecycle, options and frames](lumascript/events.md)).

```json
"options": [
  { "key": "balls", "kind": "number", "default": 3, "min": 1, "max": 10, "step": 1, "name": "Balls at once" },
  { "key": "look", "kind": "choice", "default": "shiny", "values": ["shiny", "matte"], "name": "Look",
    "value_names": { "shiny": "Shiny", "matte": "Matte" } }
]
```

Up to 64 options. Every option has:

| Field     | Type    | Meaning                                                                |
| --------- | ------- | ---------------------------------------------------------------------- |
| `key`     | string  | The option's name, made of the same characters as `id`. Each key once. |
| `kind`    | string  | `choice`, `number`, `toggle`, `text` or `key`                          |
| `default` | by kind | The value before the player changes it. Required for every kind.       |
| `name`    | string  | The label on the Mods screen (translations go in `text`)               |

and, by kind:

| Kind     | Extra fields                                                    | `default`                                                               | Read in LumaScript as                                                   |
| -------- | --------------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `choice` | `values` (the choices), `value_names` (the label of each value) | one of `values`                                                         | `text`                                                                  |
| `number` | `min`, `max`, `step`                                            | a number from `min` to `max`                                            | `int` when `default`, `min`, `max` and `step` are all whole, else `f32` |
| `toggle` | none                                                            | `true` or `false`                                                       | `bool`                                                                  |
| `text`   | `max_length`, 1 to 256 (required)                               | at most `max_length` code points, no newline or other control character | `text`                                                                  |
| `key`    | none                                                            | one of the game's controls, below                                       | `input.Action`                                                          |

A `key` option is a bindable action: the player chooses the button, and their choice is kept by the input service.
Its default is one of these controls (case does not matter):

`a` `b` `one` `two` `plus` `minus` `home` `dpad_up` `dpad_down` `dpad_left` `dpad_right` `stick_up` `stick_down`
`stick_left` `stick_right` `c` `z` `shake` `nunchuk_shake` `pointer_up` `pointer_down` `pointer_left`
`pointer_right` `pointer_recenter` `jump_back`

**L210** names the option and the problem: an unknown kind, a key used twice, a default outside its own range, a text
default that is too long (`Option.DefaultTooLong`), or a key default that is not a control
(`Option.KeyDefaultUnknown`). A missing `default` is **L203**.

> [!TIP]
> Your code refers to an option by its key, so keep keys short and plain (`balls`, `look`).

## permissions

What your code asks the player to allow. Each entry names one permission and says why in one line. The player reads
your `why` on the consent screen; see [Permissions](start/permissions.md) and
[Permissions and consent in depth](reference/consent.md).

```json
"permissions": [
  { "name": "net.internet", "hosts": ["api.example.org", "*.cdn.example.org"], "why": "Uploads your best times." },
  { "name": "system.clipboard", "why": "Copies your time so you can paste it." }
]
```

| Field   | Type   | Required                                | Meaning                                          |
| ------- | ------ | --------------------------------------- | ------------------------------------------------ |
| `name`  | string | yes                                     | One permission name, below                       |
| `why`   | string | yes                                     | One line, 1 to 200 characters, in your own words |
| `hosts` | array  | `net.internet` only, and required there | The hosts the mod may reach                      |
| `roots` | array  | `net.local` and `net.internet` only     | Extra TLS root certificates for your own hosts   |

At most 11 entries, each name once.

### Permission names

| Name               | What the player reads                                                             |
| ------------------ | --------------------------------------------------------------------------------- |
| `native`           | Runs libraries of its own with full access to this device.                        |
| `fs.exchange`      | Reads and writes files in the Exchange folder, which you and other mods can open. |
| `net.local`        | Connects to devices on your network and to programs on this device.               |
| `net.internet`     | Connects to the internet: {hosts}.                                                |
| `input.inject`     | Presses buttons and moves the controls as if it were you.                         |
| `input.devices`    | Uses Bluetooth, USB and MIDI devices connected to this device.                    |
| `audio.microphone` | Hears your microphone.                                                            |
| `capture.camera`   | Sees your camera.                                                                 |
| `system.clipboard` | Reads and writes the clipboard.                                                   |
| `system.links`     | Opens web pages in your browser.                                                  |
| `save.game`        | Reads your save files and may offer one to replace; you confirm each replacement. |

A name `test.<parts>` is a test service's permission. It is allowed with the Note **L219**: only a test run
provides it.

### hosts

1 to 32 entries. Each is one of:

- a name: `api.example.org`;
- every name under a domain: `*.example.org` (not `example.org` itself);
- an IPv4 address in dotted digits: `203.0.113.7` (four numbers 0 to 255, no leading zeros);
- `*` alone: any host. The player then reads "any address". Use it only when the player types addresses at run time,
  such as a co-op partner's.

No port (a host grants every port), no IPv6 address, and no name whose last part is all digits. Letters may be either
case; two entries that are equal once lowercased are an error.

### roots

1 to 8 paths of PEM files inside the mod's `certs/` folder, each at most 64 KiB and holding at least one
`-----BEGIN CERTIFICATE-----` block. They add TLS roots for your own hosts.

```json
{
  "name": "net.internet",
  "hosts": ["game.example.org"],
  "roots": ["certs/my-server-root.pem"],
  "why": "Talks to the mod's own server."
}
```

### Errors

| Problem                                                            | Code                                                                               |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| A name not in the list                                             | L211 `Perm.Unknown`                                                                |
| `net` (the old single permission)                                  | L211 `Perm.NetSplit`: write `net.local` or `net.internet`                          |
| A name twice                                                       | L211 `Perm.Twice`                                                                  |
| No `why`, or not one line of 1 to 200 characters                   | L211 `Perm.NoWhy`                                                                  |
| `hosts` on any permission but `net.internet`                       | L211 `Perm.HostsOnlyNet`                                                           |
| `net.internet` without `hosts`                                     | L211 `Perm.NetHosts`                                                               |
| Fewer than 1 or more than 32 hosts                                 | L211 `Perm.HostCount`                                                              |
| A host not in one of the forms above                               | L204 `Expect.Host`                                                                 |
| Two hosts equal once lowercased                                    | L211 `Perm.HostTwice`                                                              |
| `roots` on another permission                                      | L211 `Perm.RootsOnlyNet`                                                           |
| `roots` not an array                                               | L204 `Expect.Array`                                                                |
| Fewer than 1 or more than 8 roots                                  | L211 `Perm.RootCount`                                                              |
| A root path not under `certs/`, or with an empty, `.` or `..` part | L211 `Perm.RootPath`                                                               |
| A root twice                                                       | L211 `Perm.RootTwice`                                                              |
| A root file that is not in the mod                                 | L211 `Perm.RootMissing`                                                            |
| A root file over 64 KiB                                            | L211 `Perm.RootSize`                                                               |
| A root file with no certificate block                              | L211 `Perm.RootNotPem`                                                             |
| Code that imports a service whose permission is not declared       | L506                                                                               |
| A permission declared that no code imports                         | Note L218 (it may still be used: C code can ask for a service by name at run time) |

## layers

The mod's content folders, in the order they apply. Each entry is the folder `layers/<name>/`. A layer with `when` is
used only when every condition holds.

```json
"layers": [
  { "name": "base" },
  { "name": "matte", "when": { "option": { "look": "matte" } } },
  { "name": "pal-text", "when": { "region": ["RMGP01"] } },
  { "name": "xmas", "when": { "code": true } }
]
```

| Field  | Type   | Meaning                                                                                                 |
| ------ | ------ | ------------------------------------------------------------------------------------------------------- |
| `name` | string | The layer's folder under `layers/`; the same characters as an option key, and it may not start with `@` |
| `when` | object | Conditions, all of which must hold (optional)                                                           |

Without a `layers` key, a mod with a `layers/base/` folder has one layer, `base`.

### when

| Condition  | Value                                                 | Holds when                                                                                            |
| ---------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `option`   | object: option key to a value, or to a list of values | the player's value of each named `choice`, `number` or `toggle` option is that value (or one of them) |
| `region`   | list of regions                                       | the player's game is one of them                                                                      |
| `language` | list of languages                                     | the game is played in one of them                                                                     |
| `platform` | list of platforms                                     | the game runs on one of them                                                                          |
| `code`     | `true`                                                | the mod's code turns it on, before content loads (in LumaScript, an `on layers` handler)              |

```lumascript source/main.lum
use svc.system

on layers -> list<text> {
    let d = system.local_date()
    return if d.month == 12 and d.day == 25 { ["xmas"] } else { [] }
}
```

| Problem                                                                                                     | Code                           |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------ |
| A listed layer without its folder, or a folder under `layers/` that is not listed                           | L300                           |
| A `when` that can never hold: an option value not among its values, an unknown region, language or platform | L301                           |
| `when.option` naming a `text` or `key` option (your code reads those; they choose no layer)                 | L301 `Layer.OptionNotChoosing` |
| `when.code` on a platform the mod has no code for                                                           | L307                           |

What goes inside a layer folder is on [The .luma file format](reference/luma-format.md#layers).

## code

Required when the mod has a `code/` folder, and only then.

```json
"code": {
  "platforms": ["windows-x64", "linux-x64", "android-arm64"],
  "libraries": { "windows-x64": ["steam_api64.dll"] }
}
```

| Field       | Type   | Meaning                                                                                                                                                  |
| ----------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `platforms` | array  | The platforms the code was built for. Each has its library in `code/<platform>/`.                                                                        |
| `libraries` | object | Optional. Per platform, extra libraries in the order they load, each a file name in `code/<platform>/`. Any extra library needs the `native` permission. |

Platforms: `windows-x64`, `windows-arm64`, `linux-x64`, `linux-arm64`, `macos-arm64`, `macos-x64`, `android-arm64`,
`android-x64`, `ios-arm64`. `lumalink build` fills this key for you.

On a platform not in `platforms`, a mod with code is off, with the Note **L507**. `code/` without `code`, or the
reverse, is **L500**; an unknown platform or a listed one without its library is **L501**; an extra library without
`native`, or a library file not named here, is **L509**.

## saves

Save files of the game that the mod brings, such as a file that starts later in the game. Required when the mod has
a `saves/` folder.

```json
"saves": [ { "region": "RMGE01", "file": "saves/RMGE01/GameData.bin", "why": "Starts you at the first level." } ]
```

| Field    | Type   | Meaning                                                  |
| -------- | ------ | -------------------------------------------------------- |
| `region` | string | The region the save is for; it must be in `game.regions` |
| `file`   | path   | The file, under `saves/<region>/`                        |
| `why`    | string | One line, shown when the player is asked                 |

The game never writes these silently: when the mod is turned on, the player is offered each save for their region,
reads `why`, chooses a user file to replace or declines, and confirms. **L216** refuses a malformed entry, a missing
file, a file that is not a save of its region, or a region not in `game.regions`. A file under `saves/` that no entry
names is **L217**.

## kit

Required when the mod has a `kit/` folder of data for a library mod such as LumaKit: each module id with the version
of that module's data format your files use.

```json
"kit": { "lumakit.player.form": 1 }
```

**L700**: a `kit/<module>/` folder not listed here, or the reverse. **L701**: a data file that fails the module's
schema, with the module's own message. **L702**: a data version no installed module provides. See
[LumaKit overview](lumakit/overview.md).

## build

Written by `lumalink build` when it builds the mod's code; you do not write it. It records the LumaLink version and
the game description the code was built against, which `lumalink verify` uses.

```json
"build": { "lumalink": "1.0.0+abcdef0", "self": "<the game description's id>" }
```

## Keys from the previous engine

Mods made for Nebula's previous mod engine used other keys. The validator names each one and what to write instead
(**L220**), so a converted mod is quick to fix. `lumalink convert` writes the current form for you.

| Old key                         | Write instead                                          |
| ------------------------------- | ------------------------------------------------------ |
| `plugins`                       | `code` (the library is `code/<platform>/mod.<ending>`) |
| `description`                   | `summary`                                              |
| `homepage`                      | `links.home`                                           |
| `load_after`, `load_before`     | `load.after`, `load.before`                            |
| `regions`, `versions`           | `game.regions`                                         |
| `requires`                      | `renderer.features`                                    |
| option `id`, `choices`, `range` | `key`, `values`, `min`/`max`/`step`                    |
| conflict `below`                | `why`                                                  |
| layer `path`                    | `name` (the folder is always `layers/<name>/`)         |

Some old values keep their key but changed shape, and are type errors (**L204**) until you rewrite them: `format` is a
string (`"1.0"`, not `1`), `game` is an object (`{"id": "RMG"}`, not `"RMG"`), and `name` is a string, with its
translations in `text`.

Rows the previous engine had and the current form does not (old layer rows and `when` keys such as `mods`, `not` and
`any`) go under one top-level key, `pre_standard` (a layer's under `pre_standard.layers.<layer name>`). Each key
there is a Note, **L221**: only the previous engine reads it. A key the previous engine never had is **L202** there
too.

## See also

- [The .luma file format](reference/luma-format.md)
- [Error codes](reference/error-codes.md)
- [Anatomy of a mod](start/mod-anatomy.md)
- [Permissions](start/permissions.md)
- [Versions, dependencies and sharing](start/sharing.md)
- [lumalink check](lumalink/check.md)
