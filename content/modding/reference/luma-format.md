---
title: The .luma file format
nav_title: .luma format
description: What a .luma file is - the zip container and its limits, each top-level folder, layers and patches, code libraries per platform, saves a mod brings, and how the format is versioned.
order: 2
level: intermediate
---

A `.luma` file is one mod, packed for every platform at once. This page is the complete description of what may be
inside one and the rules each part keeps. You rarely build one by hand: `lumalink pack` writes it from your mod folder
after the validator has passed it, and your mod folder has the same layout.

## At a glance

```text
gold-flower-1.0.0.luma
  luma.json                         the manifest (required)
  layers/
    base/
      files/ObjectData/Kuribo.arc   a whole file placed at a game path
      patches/<game path>.json      rows changed in a file that has rows
      assets/models/GoldBall.glb    the mod's own new content
      textures/<model>/<tex>.png    the game's textures replaced by name
    matte/                          a second layer, chosen by an option
  code/
    windows-x64/mod.dll             the entry library, one per platform
    android-arm64/mod.so
  media/icon.png                    the icon and pictures luma.json names
  saves/RMGE01/GameData.bin         save files the mod offers the player
  certs/my-server-root.pem          TLS roots for a net permission
  kit/lumakit.player.form/*.json    data for a library mod such as LumaKit
  source/                           your LumaScript and C sources
```

Three rules hold for everything:

- **One file, every platform.** A `.luma` holds sources and patches, which each player's device prepares ("cooks")
  for itself, and, if the mod has code, one built library set per platform. Nothing in it belongs to one machine:
  no absolute paths, no compiled shaders, no cooked game data.
- **Strict.** Every key, folder and file is known. Anything unknown is an error naming it. Nothing is silently
  ignored.
- **Additions only.** Format 1 grows by minors (1.1, 1.2...) that add keys and folders. A mod states the format it
  needs in `luma.json`, and a game older than that refuses it with a message saying so.

## The container

A `.luma` is a zip file whose name ends in `.luma`.

| Rule        | Value                                                                                                                                                                                                                                                                                                                                                                             | Error      |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Readable    | A zip file                                                                                                                                                                                                                                                                                                                                                                        | L100       |
| Compression | Stored or deflate only; no encryption, no multi-disk archive                                                                                                                                                                                                                                                                                                                      | L101       |
| Zip64       | Allowed                                                                                                                                                                                                                                                                                                                                                                           |            |
| Entry names | UTF-8, `/` between folders, relative; no `.` or `..` part, no empty part, no part ending in `.` or a space; none of the names Windows reserves (`CON`, `NUL`, `COM1`...); none of the characters Windows forbids (`<`, `>`, `:`, `"`, the vertical bar, `?`, `*`); no control characters; no combining marks or conjoining jamo (write names precomposed); at most 240 bytes each | L102       |
| Backslashes | An archive that uses `\` between folders throughout (as some Windows tools write) is read as if it used `/`, with a Note; a mix of both is refused                                                                                                                                                                                                                                | L108, L102 |
| Case        | Two entries that differ only in case, an entry twice, or a file where a folder is                                                                                                                                                                                                                                                                                                 | L103       |
| Entry kinds | Files and folders only: no links, no device files                                                                                                                                                                                                                                                                                                                                 | L104       |
| Limits      | At most 200,000 entries; a file at most 4 GiB unpacked; the whole at most 64 GiB unpacked                                                                                                                                                                                                                                                                                         | L105       |
| Integrity   | Stated sizes and checksums match the data; no two entries share data                                                                                                                                                                                                                                                                                                              | L106       |

Case matters because Windows, macOS and Android's storage treat two names that differ only in case as one file.

## The top-level folders

| Entry              | Read by the game                              | What it holds                                                                      |
| ------------------ | --------------------------------------------- | ---------------------------------------------------------------------------------- |
| `luma.json`        | yes                                           | The manifest. Required: without it, L200. See [luma.json](reference/luma-json.md). |
| `layers/<layer>/`  | yes                                           | Content: files at game paths, patches, new assets, texture replacements            |
| `code/<platform>/` | yes                                           | The built libraries for each platform                                              |
| `media/`           | yes (the Mods screen)                         | The icon and pictures `luma.json` names, and nothing else (L215)                   |
| `saves/<region>/`  | offered to the player, never written silently | Save files the mod brings                                                          |
| `certs/`           | only through a net permission's `roots`       | PEM files of TLS roots for the mod's own hosts                                     |
| `kit/<module>/`    | by the module that owns it                    | Data for a library mod such as LumaKit, checked against that module's schema       |
| `source/`          | no                                            | Your LumaScript and C sources and build description, for `lumalink verify`         |

Any other top-level entry is **L107**. An empty folder is allowed and means nothing.

## Layers

A layer is a folder of content that is on or off as a whole. `luma.json`'s `layers` lists them in the order they
apply and says when each is used (an option, the region, the language, the platform, or the mod's code). Without a
`layers` key, `layers/base/` is the one layer.

```text
layers/<layer>/
  files/<game path>            a whole file placed at a game path (new, or replacing the game's)
  patches/<game path>.json     rows changed, added or removed in a file that has rows
  assets/<mod path>            new content of the mod's own (models, textures, sounds, effects...)
  textures/<texture>.png|.dds  the game's textures replaced by name, like a texture pack
```

Anything else inside a layer is **L306**. A layer listed in `luma.json` without its folder, or a folder not listed,
is **L300**.

### Game paths

Game paths are the disc's paths: `ObjectData/Kuribo.arc`, `StageData/EggStarGalaxy/EggStarGalaxyMap.arc`. A file
inside an archive is written through it: `ObjectData/Kuribo.arc/Kuribo.bdl`.

- Paths are matched to the player's game without regard to case.
- A path that matches nothing is a **new file**. That is allowed only for kinds of file the game finds by name (an
  archive, a stream, a movie...); for any other kind it is **L302**.
- The first part of a path under `files/` or `assets/`, and a layer's name, may not start with `@` (L102): `@` names
  another mod's files.

### Whole files

A file under `files/` replaces the game's file at that path, or adds a new one. It may be in the game's own format (an
`.arc` holding `.bdl`, a `.bti`, an `.ast`) or an ordinary source file at the game path with its own ending, which
the player's device cooks:

```text
layers/base/files/ObjectData/Mario.arc/Mario.glb
```

Source kinds are `.gltf`/`.glb`, `.png`, `.ktx2`, `.dds`, `.wav`, `.ogg`, `.mid`, `.json`, `.ttf`, `.otf`, `.webm`
and `.mp4`. Each content kind says what a source may stand in for (see [Content](content/overview.md)); a source at a
path it cannot stand in for is **L304**. A movie is a file at its game path too: `files/MovieData/<name>.thp`, or a
`.webm`/`.mp4` source there.

> [!WARNING]
> **Files with rows are patched, never replaced.** Tables (`.bcsv` and the game's other tables), stage placement,
> scenario data and message files have rows. A whole file at such a path is **L303**: change it with a patch by key
> instead, so that several mods can change the same table. `lumalink convert` makes patches from a whole modified
> file for you.

When two mods that are on replace the same path, the one **higher in the Mods list** is used, and the Mods screen
names both and the path (the Note **L305**). Nothing is overridden silently.

### Mod paths

Files under `assets/` are your mod's own namespace. The game knows them as `<id>:<path>`, so nothing another mod
adds can collide with them.

### Texture replacements

`textures/` replaces the game's textures by name, the same way a Dolphin texture pack does. Names are the game's
`<model>/<texture>.png` (or `.dds`, which keeps its own mip levels) or Dolphin's `tex1_...` names, which the game
matches against the player's game when the mod is installed. Anything else in `textures/` is **L306**. A texture of
your own models belongs in the model's file or in `assets/`, not here.

## Patches

A patch changes rows of one file that has rows. It sits at the file's game path with `.json` added, under
`layers/<layer>/patches/`. This one changes a table whose rows are named by a `name` column:

```json
{
  "patch": 1,
  "key": ["name"],
  "set": [{ "where": { "name": "Kuribo" }, "values": { "speed": 2.5 } }],
  "add": [{ "name": "GoldKuribo", "speed": 3.0 }],
  "remove": [{ "name": "Unused" }],
  "select": [{ "match": { "name": { "glob": "Kuribo*" } }, "values": { "speed": 2.5 } }]
}
```

| Key      | Meaning                                                                                                                              |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `patch`  | The patch format's version: `1`                                                                                                      |
| `key`    | The columns that name a row. It must be the key the game defines for that kind of file; the validator says which it expected (L401). |
| `set`    | Change cells of the row `where` names                                                                                                |
| `add`    | Add a row; its key must not exist yet                                                                                                |
| `remove` | Remove the row named                                                                                                                 |
| `select` | Change every row whose cells match: `equals`, `prefix` or `glob` on a column each, all of them holding                               |

- A row that `where` or `remove` does not find, or an `add` whose key exists, is **L402**, naming the key's values.
- A value that does not fit its column's type, or a column the table does not have, is **L403**.
- A `select` naming a column the file's kind does not have, or a match other than `equals`, `prefix` or `glob`, is
  **L406**. A selector that matches no row at load is the Note **L407**.
- Malformed JSON or an unknown key is **L400**.

**Order.** Within one mod, `set` by key applies before `select`. Between mods, patches apply from the bottom of the
Mods list up, then in layer order, then file order, so the mod **higher in the list wins** a cell both change. The
Mods screen names both mods and the cell (the Note **L404**).

**Another mod's file.** To patch a file another mod brings, put the patch under `patches/@<id>/<mod path>.json` and
add that mod to `needs`; without the need it is **L405**.

The keys of every table, and how to write rows, are on [Table patches](content/table-patches.md).

## Code

```text
code/<platform>/mod.<ending>       the entry library: it exports luma_mod
code/<platform>/<library file>     each extra library named in code.libraries, loaded first, in order
```

| Platform                       | Entry library | Notes                                         |
| ------------------------------ | ------------- | --------------------------------------------- |
| `windows-x64`, `windows-arm64` | `mod.dll`     |                                               |
| `linux-x64`, `linux-arm64`     | `mod.so`      |                                               |
| `macos-arm64`, `macos-x64`     | `mod.dylib`   |                                               |
| `android-arm64`, `android-x64` | `mod.so`      | Loaded by the game's own loader               |
| `ios-arm64`                    | `mod.dylib`   | Unsigned in the `.luma`; signed on the device |

- **The entry library** exports `luma_mod` (L503) and imports nothing from the system (L504): `luma.h` gives it
  `memcpy`, `memset`, `memmove`, `memcmp` and the stack probe it needs. It may import from the mod's own extra
  libraries. It must not run code when the system loads it, before the game starts it (L509). `lumalink build`
  builds it this way for you.
- **Every name the library asks the game for** is checked against the game's description of itself, by LumaLink when
  you pack and by the game at import, with the same rule and message (L505).
- **A service** the code uses is part of its import list; a service that needs a permission the manifest does not
  declare is **L506**.
- **Extra libraries** (a platform SDK, a physics or XR library) import from the system by nature. They are allowed
  only with the permission `native`, whose consent text tells the player the mod has full access to the device
  (L509). Each system import of each extra library is listed in the report (the Note L510). On iOS an extra library
  is allowed only as the platform's signing allows (L511).
- **A platform missing from `code.platforms`** means the code does not run there: the mod is off on that platform,
  with the reason (L507).
- **Replacing a function.** A game function may be replaced by one mod at a time. When two mods that are on replace
  the same function, the one higher in the Mods list keeps it and the other is refused (L805, naming the higher).
- No other files under `code/`.

How the game binds and starts this code is on [How the game loads a mod](reference/loading.md).

## Saves a mod brings

A mod may bring save files of the game, for example a challenge file, or one that starts later in the game. Put each
at `saves/<region>/<file>` and name it in `luma.json`'s `saves`.

They are never written silently. When the mod is turned on, the game offers each one for the player's region: the
player reads its `why`, chooses a user file to replace or declines, and confirms in the game's own screen. A file
that is not a save of its region (checked by the game's own save check), or a region the mod does not list in
`game.regions`, is **L216**; a file under `saves/` that `luma.json` does not name is **L217**.

## Module data

`kit/<module>/` holds data files for a library mod, such as LumaKit's power-up forms written as JSON instead of code.
`luma.json`'s `kit` key names each module and the version of its data format. Each module supplies a schema (data,
never code) and the validator checks your files against it: **L700** to **L702**. See
[LumaKit overview](lumakit/overview.md).

## How problems are reported

Every rule on this page is a rule of the validator, with a code and a message in each of the game's 14 languages.
A message always names the mod (its `id`, or the file name when `luma.json` cannot be read), the entry inside the
`.luma`, the line and column for JSON, and what was expected. The validator never stops at the first error: one run
lists every error it can find. LumaLink and the game run the same validator, so `lumalink check` shows exactly what
the player would see. See [How the validator works](reference/validator.md) and
[Error codes](reference/error-codes.md).

## Versions of the format

- Format `1.0` is the current format. A minor (1.1, 1.2...) adds keys, folders, layer conditions or patch kinds; it
  never changes the meaning of anything in an earlier minor.
- A game supports a range of minors and refuses a higher one with "made for a newer Nebula (format 1.n)" (L205).
- Each content kind's own files are versioned on their own, inside the format: a patch has its `patch` key, and a
  source kind its own version key.

## See also

- [luma.json: every field](reference/luma-json.md)
- [Error codes](reference/error-codes.md)
- [Table patches](content/table-patches.md)
- [Content overview](content/overview.md)
- [lumalink pack](lumalink/pack.md)
- [lumalink verify](lumalink/verify.md)
