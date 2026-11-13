---
title: Anatomy of a mod
nav_title: Anatomy of a mod
description: The folders of a mod, the luma.json keys you'll use most, source modules, content layers, built code and kit data.
order: 4
level: essential
---

Every mod has the same shape: a folder with a `luma.json` and some of a fixed set of subfolders, packed into one `.luma` file. This page goes through each part: what goes there, what the game does with it, and which page covers it in depth. When you're unsure where a file belongs, look it up here.

## The folder at a glance

```text
gold-flower/                      the mod folder (packed as gold-flower-1.0.0.luma)
  luma.json                       the manifest: required
  source/                         LumaScript (.lum) and C sources; LumaLink builds them
    main.lum                      the entry module
    ball/fly.lum                  another module, "ball/fly"
  layers/                         content, in named layers
    base/
      files/<game path>           a whole file placed at a game path
      patches/<game path>.json    rows changed, added or removed in a file that has rows
      assets/<mod path>           new assets of the mod's own
      textures/<model>/<texture>.png   the game's textures replaced by name
    matte/                        another layer, used only when its condition holds
  code/                           built by `lumalink build`: one library per platform
    windows-x64/mod.dll
    linux-x64/mod.so
    ...
  media/                          the icon and pictures named in luma.json
  kit/<module>/                   data for library mods such as LumaKit
  saves/<region>/                 save files the mod offers to the player
  certs/                          TLS root certificates for the mod's own servers
```

Only `luma.json` is required. A mod that only changes code has `source/` and `code/`. A texture pack has only `layers/`.

The format is **strict**: anything at the top level that isn't in this list is an error (L107). The same goes for a key in `luma.json` the format doesn't define (L202), and for a file in `media/` or `saves/` that `luma.json` doesn't name. Nothing is silently ignored, so a typo is always caught. An empty folder is allowed and means nothing.

| Folder             | Read by the game                          | What it holds                                                                  | More                                                   |
| ------------------ | ----------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------ |
| `luma.json`        | yes                                       | The manifest                                                                   | [luma.json](reference/luma-json.md)                    |
| `source/`          | no                                        | LumaScript and C sources. LumaLink builds and verifies from them.              | [LumaScript basics](lumascript/basics.md)              |
| `layers/<layer>/`  | yes                                       | Content: files placed at game paths, patches, new assets, texture replacements | [Content overview](content/overview.md)                |
| `code/<platform>/` | yes                                       | The built library for each platform                                            | [What the compiler emits](lumascript/compiled-form.md) |
| `media/`           | yes (Mods screen)                         | The icon and pictures named in `luma.json`                                     | [luma.json](reference/luma-json.md)                    |
| `kit/<module>/`    | no (read by the library mod)              | Data for library mods such as LumaKit                                          | [LumaKit overview](lumakit/overview.md)                |
| `saves/<region>/`  | yes (offered, never written silently)     | Save files of the game the mod brings                                          | [The .luma format](reference/luma-format.md)           |
| `certs/`           | yes, through a `net` permission's `roots` | PEM files of TLS roots for the mod's own hosts                                 | [Network service](services/net.md)                     |

## luma.json

`luma.json` is UTF-8 JSON with no comments and no duplicate keys, at most 1 MiB. Here is a fuller one than in [Your first mod](start/first-mod.md):

```json luma.json
{
  "format": "1.0",
  "id": "gold-flower",
  "version": "1.0.0",
  "name": "Gold Flower",
  "summary": "Gold Mario throws gold balls; enemies they hit turn to coins.",
  "authors": ["keepvaibin"],
  "license": "GPL-3.0-only",
  "links": { "home": "https://example.org/gold-flower" },
  "icon": "media/icon.png",
  "pictures": ["media/shot1.png"],
  "game": { "id": "RMG", "regions": ["RMGE01", "RMGP01", "RMGJ01"] },
  "needs": [{ "id": "lumakit", "version": "^1" }],
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
    }
  ],
  "layers": [{ "name": "base" }, { "name": "matte", "when": { "option": { "look": "matte" } } }]
}
```

### Required keys

| Key       | Meaning                                                                                                                                                                                                                      |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `format`  | The format the mod needs, `"1.<minor>"`. Today that's `"1.0"`. A game that reads an older format refuses the mod with "made for a newer Nebula".                                                                             |
| `id`      | 3 to 64 characters: lowercase letters, digits, `-` and `.`, starting with a letter, with no `..`. It's the mod's identity: needs, conflicts, saves and options are keyed by it. Two installed mods with one id are an error. |
| `version` | `MAJOR.MINOR.PATCH`, with an optional `-pre` suffix, compared by semantic-versioning rules.                                                                                                                                  |
| `name`    | 1 to 64 characters, one line.                                                                                                                                                                                                |
| `summary` | 1 to 200 characters, one line.                                                                                                                                                                                               |
| `authors` | 1 to 16 strings.                                                                                                                                                                                                             |
| `game`    | `id` is `"RMG"`. `regions` lists the game releases the mod works with (`RMGE01`, `RMGP01`, `RMGJ01`), all three by default. For a player whose game is another region, the mod shows as off, with the reason.                |

### Optional keys you'll use most

| Key                                         | Meaning                                                                                                            | More                                            |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| `options`                                   | Up to 64 settings the player changes on the Mods screen                                                            | [Options](start/mod-anatomy.md#options) below   |
| `permissions`                               | Services that need the player's permission, each with a `why` line                                                 | [Permissions](start/permissions.md)             |
| `needs`                                     | Other mods (by id, with a version range) that must be installed, on and loaded first                               | [Sharing](start/sharing.md)                     |
| `layers`                                    | The content layers, in the order they apply, and when each is used                                                 | [Layers](start/mod-anatomy.md#layers) below     |
| `code`                                      | Required once the mod has `code/`. `platforms` lists the platforms built; `libraries` lists extra native libraries | [Code](start/mod-anatomy.md#code) below         |
| `kit`                                       | Required once the mod has `kit/`: the data version of each module's data                                           | [Kit data](start/mod-anatomy.md#kit-data) below |
| `icon`, `pictures`                          | A square PNG icon (64 to 1024 pixels) and up to 8 PNG or JPEG pictures, all under `media/`                         | [luma.json](reference/luma-json.md)             |
| `text`                                      | The name, summary and option names in other languages, by the game's language names (`JpJapanese`, `EuGerman`...)  | [luma.json](reference/luma-json.md)             |
| `license`, `links`                          | An SPDX license expression; `home`, `source` and `issues` links (`https` only)                                     | [luma.json](reference/luma-json.md)             |
| `conflicts`, `load`, `takes_over`, `nebula` | Mods that can't be on with this one, load order, earlier ids, and the Nebula releases it supports                  | [Sharing](start/sharing.md)                     |
| `renderer`                                  | Graphics features the mod can't do without, such as `"ray_tracing"`                                                | [luma.json](reference/luma-json.md)             |
| `saves`                                     | Save files the mod brings, each with its region, file and `why`                                                    | [luma.json](reference/luma-json.md)             |

LumaLink writes one more key itself when it builds code, `build`. It records the LumaLink version and the game description it built against, which [`lumalink verify`](lumalink/verify.md) needs.

## Source

`source/` holds your code. The game never reads it: LumaLink builds the libraries in `code/` from it.

- A `.lum` file is one LumaScript module. Its name is its path in `source/` without the extension, with `/` between parts: `source/ball/fly.lum` is the module `ball/fly`.
- `source/main.lum` is the module `main`, the mod's entry. Its `on start`, hooks and states are the mod's own. Hooks in other modules are the mod's too.
- A module brings in another with `use`:

```lumascript source/main.lum
use ./ball/fly        // another module of this mod (path from source/)
use kit.actor         // a LumaKit module (needs lumakit in luma.json "needs")
use svc.input         // a service: its functions and events
```

The game itself is always in scope and never `use`d. A mod can also hold C and C++ sources in `source/`, built into the same library. See [Files, modules and use](lumascript/basics.md) and [C in the same mod](lumascript/compiled-form.md).

## Layers

Content lives in **layers**. A layer is a folder `layers/<name>/`, and `luma.json`'s `layers` lists them in the order they apply. If you leave `layers` out and `layers/base/` exists, the mod has one layer, `base`.

Inside a layer there are four kinds of entry:

| Folder                                       | What                                                                                                                                                     |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `files/<game path>`                          | A whole file at a game path: new, or replacing the game's. For example `files/ObjectData/Mario.arc/Mario.glb` replaces Mario's model with a glTF source. |
| `patches/<game path>.json`                   | Rows changed, added or removed in a file that has rows (tables, stage placement, scenario data, messages)                                                |
| `assets/<mod path>`                          | New assets of your own: models, textures, sounds, effects                                                                                                |
| `textures/<model>/<texture>.png` (or `.dds`) | The game's textures replaced by name, like a texture pack. Dolphin's `tex1_...` names work too.                                                          |

A few rules that save a lot of confusion:

- **Game paths** are the disc's paths, such as `ObjectData/Kuribo.arc`. A file inside an archive is written as `ObjectData/Kuribo.arc/Kuribo.bdl`. Case doesn't matter when matching the player's game.
- **Files with rows are patched, never replaced.** A `files/` entry at the path of a table or other file with rows is an error that says "patch it by key" (L303). That way two mods can change different rows of one table. See [Table patches](content/table-patches.md).
- **Sources or game formats.** A whole file can be a game format (`.arc`, `.bti`...) or an ordinary source format (`.gltf`/`.glb`, `.png`, `.wav`, `.ogg`, `.json`, `.ttf`, `.webm`, `.mp4`...), at the game path with its own ending. Content is _cooked_ (prepared for the player's device) when the game starts with the mod. See [Content overview](content/overview.md).
- **Mod paths** under `assets/` are your own namespace. The game knows them as `<id>:<path>`, so they can never clash with another mod's.

A patch looks like this:

```json
{
  "patch": 1,
  "key": ["name"],
  "set": [{ "where": { "name": "Kuribo" }, "values": { "speed": 2.5 } }],
  "add": [{ "name": "GoldKuribo", "speed": 3.0 }],
  "remove": [{ "name": "Unused" }]
}
```

### Conditional layers

A layer can have a `when`. It's used only when every condition holds:

| Condition  | Holds when                                                                         | Example                             |
| ---------- | ---------------------------------------------------------------------------------- | ----------------------------------- |
| `option`   | An option has the value given (or one of a list of values)                         | `{ "option": { "look": "matte" } }` |
| `region`   | The player's game is one of the regions listed                                     | `{ "region": ["RMGP01"] }`          |
| `language` | The player's language is one of those listed                                       |                                     |
| `platform` | The game runs on one of the platforms listed                                       | `{ "platform": ["android-arm64"] }` |
| `code`     | Your mod's code chooses the layer before content loads, in its `on layers` handler | `{ "code": true }`                  |

When two mods replace the same file, or change the same table cell, the mod **higher in the Mods list** wins. The Mods screen names both mods and the path; it's never silent.

## Code

`lumalink build` writes `code/`; you don't put files there yourself. Each platform gets one entry library:

| Platform                       | Library                            |
| ------------------------------ | ---------------------------------- |
| `windows-x64`, `windows-arm64` | `mod.dll`                          |
| `linux-x64`, `linux-arm64`     | `mod.so`                           |
| `macos-arm64`, `macos-x64`     | `mod.dylib`                        |
| `android-arm64`, `android-x64` | `mod.so`                           |
| `ios-arm64`                    | `mod.dylib` (signed on the device) |

`luma.json`'s `code.platforms` lists the platforms built. On a platform the mod has no code for, the mod is off, with the reason (L507), unless it has no code at all.

A mod's own library may import nothing from the operating system. That's what lets one `.luma` work everywhere and lets the game check everything a mod calls. A mod that needs a third-party native library (a platform SDK, a physics library) lists it in `code.libraries` and needs the `native` permission, which tells the player the mod runs code with full access to the device. See [Permissions](start/permissions.md).

## Options

Options are settings the player changes on the Mods screen. Each one has a `key` (the same characters as an id), a `kind`, a `default` and a `name`, plus fields for its kind:

| `kind`   | Extra fields                                                                   | In LumaScript                                                   |
| -------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| `toggle` | none                                                                           | `bool`                                                          |
| `number` | `min`, `max`, `step`                                                           | `int` when the default and limits are whole numbers, else `f32` |
| `choice` | `values`, `value_names`                                                        | `text`, one of `values`                                         |
| `text`   | `max_length` (1 to 256)                                                        | `text`                                                          |
| `key`    | none (the default is one of the game's controls, such as `"a"` or `"dpad_up"`) | `input.Action`, a bindable action                               |

A default outside its own range is an error. In code, declare the option and read it by its key:

```lumascript source/main.lum
option hide: bool

hook before CounterLayoutController::appear() { if hide { skip } }
hook before CoinCounter::appear() { if hide { skip } }
```

`on option hide { }` runs when the player changes it. An option can also choose layers (`when.option`), except `text` and `key` options, which your code reads itself. See [Lifecycle, options and frames](lumascript/events.md).

## Kit data

Library mods such as LumaKit can be given **data** instead of code. A mod that defines a power-up, an item or dialogue entirely in JSON puts it in `kit/<module>/*.json` and states the data version in `luma.json`:

```json
{ "kit": { "lumakit.player.form": 1 } }
```

The data is checked against the module's own schema when you check or pack the mod (codes in the L700 range), and read when LumaKit starts. The same thing can be made in code with the module's `define` function, and code can find a data-defined one by its id. See [LumaKit overview](lumakit/overview.md).

## Media, saves and certs

- **`media/`** holds only the `icon` and `pictures` that `luma.json` names. Any other file there is an error (L215).
- **`saves/<region>/`** holds save files your mod brings, such as a challenge file or a save that starts later in the game. They're never written silently: when the mod is turned on, the player sees your `why` and chooses whether to replace a save file, and which one.
- **`certs/`** holds PEM root certificates for your own servers, named by a `net.local` or `net.internet` permission's `roots`. See [Network service](services/net.md).

## See also

- [luma.json reference](reference/luma-json.md): every key and its checks
- [The .luma format](reference/luma-format.md): the container, layers, patches and code in full
- [Content overview](content/overview.md)
- [Check, build, pack and run](start/workflow.md)
