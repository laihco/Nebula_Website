---
title: Table patches
description: Change rows of the game's tables by key with a JSON patch, so several mods' changes combine instead of overwriting each other.
order: 9
level: intermediate
---

Much of the game's data lives in tables: stage placement, scenario data, messages, animation control, lights,
camera settings. A mod never replaces one of these files whole. It writes a **patch**: a small JSON file that sets
cells, adds rows, removes rows or changes every row that matches. Because each change names its row by the table's
key, patches from several mods combine row by row, and the Mods screen names any cell two mods both change.

## Quick start

A patch sits under `patches/` at the table's game path, with `.json` added:

```text
my-mod/
  layers/
    base/
      patches/
        StageData/HeavenlyBeachGalaxy.arc/jmp/placement/common/objinfo.json
```

```json
{
  "patch": 1,
  "set": [{ "where": { "l_id": 40 }, "values": { "pos_y": 800 } }],
  "add": [{ "name": "Kuribo", "l_id": 900, "pos_x": 0, "pos_y": 500, "pos_z": -2000 }]
}
```

This moves the row with `l_id` 40 and adds a Goomba. Check the patch against your imported game, which holds the
tables and their columns:

```sh
lumalink check my-mod --game path/to/game.pak
```

> [!TIP]
> Already have a Wii mod that replaces whole table files? [`lumalink convert`](lumalink/convert.md) compares each
> file with your game and writes the patches for you.

## The patch file

`layers/<layer>/patches/<game path>.json`. The general shape:

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

| Key      | Meaning                                                                                                         |
| -------- | --------------------------------------------------------------------------------------------------------------- |
| `patch`  | The patch form's version: `1`                                                                                   |
| `key`    | The columns that name a row. It must be the key the table uses ([Row keys](#row-keys)); a different key is L401 |
| `set`    | A list of `{where, values}`: in the row whose key is `where`, set each column in `values`                       |
| `add`    | A list of new rows, each giving its key. Columns you leave out take the table's usual values                    |
| `remove` | A list of keys: the rows to take out                                                                            |
| `select` | A list of `{match, values}`: set `values` in **every** row whose cells match                                    |
| `rows`   | Only for tables keyed by place (`#`): the whole table, replacing the game's rows                                |

Columns are named by name, and each value is checked against the column's type in the game's own table (L403 when
it does not fit).

### Finding rows: where and remove

`where` and each `remove` entry give the key's columns and their values: `{ "l_id": 40 }`,
`{ "PosName": "MarioDemoPos4", "Obj_ID": -1 }`. A key that finds no row is an error naming the key's values (L402).
An `add` whose key already exists is an error too.

### Matching many rows: select

`select` is for changes that apply to many rows at once. Each `match` names columns, each with one test, and all
of them must hold:

| Test     | Matches when the cell                   |
| -------- | --------------------------------------- |
| `equals` | is exactly this value                   |
| `prefix` | starts with this text                   |
| `glob`   | matches this pattern (`*` for any text) |

A column the table does not have, or any other test, is L406. At load, the number of rows each selector matched is
reported, and a selector that matched none is a Note (L407). Within one mod, `set` by key applies before `select`.

### Cells that are not text

A few of the game's cells hold bytes no text encoding can read (some camera ids end in a counter byte). Wherever a
table is JSON (`lumalink extract`, a patch's `where`, `values` and `add`), such a cell is written as
`{ "bytes": "<hex>" }`. LumaLink writes them this way when it extracts.

## Row keys

Every table has a rule saying which columns name a row. Paths are matched without regard to case; `*` stands for one
folder name and `**` for any number of folders.

| Table                                                                                                                | Game path                                                                                             | Key                                                         |
| -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Stage placement (objects, areas, cameras, planets, stage objects, demos, sounds)                                     | `StageData/*/jmp/placement/*/*`                                                                       | `l_id`                                                      |
| Map parts, child objects, common paths                                                                               | `StageData/*/jmp/mapparts/*/*`, `StageData/*/jmp/childobj/*/*`, `StageData/*/jmp/path/commonpathinfo` | `l_id`                                                      |
| Start points                                                                                                         | `StageData/*/jmp/start/*/*`                                                                           | `MarioNo`                                                   |
| Named positions                                                                                                      | `StageData/*/jmp/generalpos/*/*`                                                                      | `PosName`, `Obj_ID`                                         |
| Camera parameters                                                                                                    | `StageData/*/camera/cameraparam.bcam`                                                                 | `id`                                                        |
| Zone list, scenario data, object names                                                                               | `StageData/*/zonelist.bcsv`, `scenariodata.bcsv`, `objnametable.tbl`                                  | `ZoneName`, `ScenarioNo`, `en_name`                         |
| Message ids                                                                                                          | `**/messageid.tbl`                                                                                    | `MessageId`                                                 |
| Animation tables, animation control, shadows, group info                                                             | `ObjectData/**/*.banmt`, `actoranimctrl.bcsv`, `shadow.bcsv`, `groupinfo`                             | `name`, `ActorAnimName`, `Name`, `name`                     |
| Controller rumble                                                                                                    | `ObjectData/*/padrumbledata.bcsv`                                                                     | `PadRumbleName`, `StartFrame`                               |
| Lights                                                                                                               | `ObjectData/LightData/LightData.bcsv`; `ObjectData/*/light*.bcsv`                                     | `AreaLightName`; `AreaLightName`, `LightID`                 |
| Nebula's ray tracing tables                                                                                          | `NebulaData/rt*`                                                                                      | stage, effect or model and material (compared without case) |
| Everything else: keyframes (`.pa`), cutscene steps, rail points, `jmp/list/*`, `struct.tbl` and other one-off tables |                                                                                                       | `#` (by place)                                              |

Keys compare exactly, byte for byte, except in the ray tracing tables, which compare without case.

### Tables keyed by place

Some tables are read in order (keyframes, a cutscene's steps, a rail's points) or have no column that tells rows
apart. Their rows are named by place: `"where": { "#": 3 }`, where 0 is the first row of the game's table.

- `set` by `#` and `select` work as on any table.
- `add` appends after the game's rows, in mod order (a higher mod's rows come later).
- `remove` is refused (L402): it would move every later row under other mods' `#`.
- `rows` gives the whole table: your rows replace the game's.
- Every `#` you name is checked against the game's row count (L402).

### Keys the game repeats

Two of the game's named-position tables hold two rows with one key; the game uses the first. A `where` that matches
more than one row is L402, naming the key and how many rows. Use `select` to change all of them.

## Columns and new rows

- Tables of one kind do not all have every column. An **empty** table takes every column of its kind before any patch
  applies, so the first row you add to an empty stage layer has its columns.
- A table **with rows** keeps its columns: setting a column it lacks is L403.
- A **new row** (`add`, `rows`) starts from the value most of the game's rows of that kind have: `-1` for
  `Obj_arg0`-`7`, `SW_*` and `CommonPath_ID`, `1` for `scale_*`, and so on. Give only what differs.

## How patches combine

- Patches apply **from the bottom of the Mods list up**, then in layer order, then in file order. The mod **higher**
  in the list wins.
- Two mods that `set` the same cell, or one that adds a row another removes, conflict: the higher mod's change is
  used, and both are named (L404, a Note, and on the Mods screen with the row and column).
- Two mods that give `rows` for one table, or one that gives `rows` and another that `set`s the same table,
  conflict the same way: the higher wins, and the Mods screen names both.
- Stage placement keys are links across a zone's layers, so a new `l_id` must be new to the whole zone. See
  [Stages](content/stages.md#keys-across-a-zone-s-layers).
- At the game's start, a patch that cannot be applied fails **whole**, and the other mods' patches still apply.

### Patching another mod's file

A patch on a table another mod brings goes under `@` and that mod's id, at its mod path:

```text
layers/<layer>/patches/@<id>/<mod path>.json
```

That mod must be in your `needs` in `luma.json`; otherwise the patch is L405.

### A table the game does not have

A whole table under `files/` is only allowed where the game has no table, for example a new galaxy's scenario data
(`files/StageData/<Galaxy>Scenario/ScenarioData.bcsv.json`, written as JSON). A whole file at a table the game has is
L303: patch it instead.

## Codes

| Code | Level | Meaning                                                                                                                                                                                                   |
| ---- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L400 | Error | The patch is not valid JSON, or has a key the form does not have                                                                                                                                          |
| L401 | Error | `key` is not the key this table uses (the message says which it expected)                                                                                                                                 |
| L402 | Error | A `where` or `remove` that finds no row, an `add` whose key exists, an `add` without its key, a key already used in the zone (`Patch.KeyInGroup`), `remove` on a `#` table, or a `#` past the table's end |
| L403 | Error | A column the table does not have, or a value that does not fit its column's type                                                                                                                          |
| L404 | Note  | Two mods change the same row; the higher one's change is used                                                                                                                                             |
| L405 | Error | A patch on another mod's file without that mod in `needs`                                                                                                                                                 |
| L406 | Error | A `select` naming a column the table does not have, or a test other than `equals`, `prefix` or `glob`                                                                                                     |
| L407 | Note  | A `select` that matched no row, at load                                                                                                                                                                   |
| L303 | Error | A whole file at a table that has rows                                                                                                                                                                     |

Each message names the patch file and, where it can, the line. Every code is listed in
[Error codes](reference/error-codes.md).

## See also

- [Stages](content/stages.md)
- [Content overview](content/overview.md)
- [`lumalink extract`](lumalink/extract.md), [`lumalink convert`](lumalink/convert.md),
  [`lumalink check`](lumalink/check.md)
- [The .luma file format](reference/luma-format.md)
- [Versions, dependencies and sharing](start/sharing.md)
