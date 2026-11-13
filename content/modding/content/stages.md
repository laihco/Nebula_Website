---
title: Stages
description: Place the game's objects and your own in a stage by patching its placement tables, with object arguments by name.
order: 8
level: intermediate
---

A stage's objects (enemies, coins, platforms, cannons, the objects your mod defines) are rows of placement tables
inside the stage's archive. You change them with a patch by key: add rows, change rows, remove rows. Your patch
combines with other mods' patches, and the game's rows you do not touch stay as they are.

## Quick start

To add a cannon to a stage, patch the stage's object table:

```text
my-mod/
  luma.json
  layers/
    base/
      patches/
        StageData/HeavenlyBeachGalaxy.arc/jmp/placement/common/objinfo.json
```

```json
{
  "patch": 1,
  "add": [
    {
      "name": "IronCannonLauncher",
      "l_id": 900,
      "pos_x": 0,
      "pos_y": 500,
      "pos_z": -2000,
      "args": { "ShotInterval": 120, "Speed": 30, "IsRotate": true }
    }
  ]
}
```

Check it against your imported game and the game's names folder, which holds the argument names:

```sh
lumalink check my-mod --game path/to/game.pak --names path/to/names
```

No code is needed. Objects your mod defines in code (with [LumaKit: actor](lumakit/actor.md) or
[LumaKit: item](lumakit/item.md)) are placed the same way, by the `name` they were given:

```lumascript
let keeper = actor.define(actor.Kind {
    name: "LumaKeeper"                 // placed in stages by this name
    look: model "Keeper"
})
```

## Where the tables are

A stage's placement tables are files of its archive, as [`lumalink extract`](lumalink/extract.md) writes them:

```text
StageData/<Stage>.arc/jmp/placement/<layer>/objinfo         objects
StageData/<Stage>.arc/jmp/placement/<layer>/areaobjinfo     areas
StageData/<Stage>.arc/jmp/placement/<layer>/cameracubeinfo  camera areas
StageData/<Stage>.arc/jmp/mapparts/<layer>/...              map parts
StageData/<Stage>.arc/jmp/start/<layer>/...                 Mario's start points
StageData/<Stage>.arc/jmp/generalpos/<layer>/...            named positions
```

`<layer>` is `common` (always on) or `layera` to `layerp`. A galaxy's scenario table says which layers each star
turns on.

Your patch goes at the same path with `.json` added, under `patches/`:
`layers/<l>/patches/StageData/<Stage>.arc/jmp/placement/<layer>/objinfo.json`.

> [!WARNING]
> Do not put a whole placement table under `files/` to replace the game's: the validator refuses a whole file at a
> table that has rows (L303). A whole file is only for a table the game does not have, such as a new stage's.

## A row

Each row gives the game's columns by name:

| Column                          | Meaning                                                                                                              |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `name`                          | The object, as the game's object factory knows it (`Kuribo`, `IronCannonLauncher`), or the name your mod gave a kind |
| `l_id`                          | The row's key: unique in the zone, across all its layers                                                             |
| `pos_x`, `pos_y`, `pos_z`       | Position, in game units                                                                                              |
| `dir_x`, `dir_y`, `dir_z`       | Rotation                                                                                                             |
| `scale_x`, `scale_y`, `scale_z` | Scale                                                                                                                |
| `SW_APPEAR`, `SW_A`, ...        | The switches the object listens to                                                                                   |
| `Obj_arg0` to `Obj_arg7`        | The object's arguments (or give them by name, below)                                                                 |
| `CommonPath_ID`                 | The path (rail) the object uses                                                                                      |

A row you add starts from the values most of the game's rows of that table have: `-1` for `Obj_arg0`-`7`, `SW_*`,
`CommonPath_ID` and similar columns, `1` for `scale_*`. Give only the columns you need.

If a layer's table in the game is empty, it is given every column of its kind before your patch applies, so the
first object you add to an empty layer has somewhere to go.

### Keys across a zone's layers

The game links objects by `l_id` across all the layers of a zone, so:

- an `add` must give its key (`l_id`);
- an `l_id` already used in any layer of that zone, by the game or by another file of your mod, is refused (L402,
  `Patch.KeyInGroup`, naming the table that has it);
- two mods adding the same `l_id` to one zone: the higher mod's row stays, the lower mod's row is left out (L404,
  a Note).

For Mario's start points (`MarioNo`) and named positions (`PosName` with `Obj_ID`), the key only has to be unique
among `common` and the layers some scenario turns on together with yours. So a new scenario can have its own start 0
in a layer no other scenario turns on with the old one.

> [!TIP]
> Pick `l_id` values well above those in the zone's tables. Extract the stage with `lumalink extract --game` to see
> them.

## Arguments by name

`Obj_arg0` to `Obj_arg7` mean something different for every object. Instead of numbers, give them by name in `args`:

```json
{
  "name": "IronCannonLauncher",
  "l_id": 900,
  "pos_x": 0,
  "pos_y": 500,
  "pos_z": -2000,
  "args": { "ShotInterval": 120, "Speed": 30, "IsRotate": true }
}
```

- **The names** are the game's own: the field each argument fills in the object's class (or one of its bases),
  without its `m` (`mShotInterval` becomes `ShotInterval`). An argument read into no single field is `Arg<n>`.
  `Arg0` to `Arg7` work for any object. A column the game reads by its own name is named as it is.
- The names come from a file the game's build writes from its source, `smg_game.luma-placement.json`, beside the game
  module. LumaLink reads it from the `--names` folder; nothing is matched by hand.
- **Values**: the game reads whole numbers, with -1 meaning "not given". A whole number goes in as it is (a float
  field takes it converted, as the game does). `true` is 1; `false` and `null` are -1. A fraction, text or a number
  outside 32 bits is refused (`Cook.Effect.Kind`, `Cook.Effect.Range`). A column the game reads by its own name takes
  the value as given, fractions too.
- A row with `args` has -1 in each `Obj_arg<n>` it gives neither way, as the game's rows have.
- In a `set`, the object is the found row's `name`, and only the arguments you name change:

  ```json
  { "patch": 1, "set": [{ "where": { "l_id": 900 }, "values": { "args": { "Speed": 45 } } }] }
  ```

`args` must be an object (`Patch.ArgsShape` otherwise).

### Refusals

The names are checked when the patch is applied: at the game's start, and by `lumalink check --game <game.pak>
--names <folder>`, which applies each such patch to the game's table as the start does. Each is **L804** on the file:

| Refusal                                             | When                                                                                    |
| --------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `Cook.Stage.NoObject` {where, name}                 | The factory has no object of that `name` (or the row has none)                          |
| `Cook.Stage.ArgName` {where, name, other, expected} | An argument name the object does not have; `expected` lists its names and `Arg0`-`Arg7` |
| `Cook.Stage.ArgTwice` {where, name, column}         | One argument given twice (by name and as `Obj_arg`, or by two names)                    |
| `Cook.Stage.NoFacts`                                | The argument names file is missing (the path is named)                                  |

At the game's start a refused patch fails **whole**, and the other mods' patches still apply. The Mods screen says
which patch failed.

## Objects no mod made

If a row places a class name that neither the game nor any mod on makes, the stage still plays: the placeholder
model stands at the place, with no behaviour and no collision, and the mod log has `Content.MissingClass` (620)
naming the file and the name.

> [!PLANNED]
> Next layers of stage content, not built yet:
>
> - collision and a flat zone;
> - gravity and areas;
> - cameras and paths;
> - a whole new stage with a star;
> - lights, sky and fog.
>
> [LumaKit: stage](lumakit/stage.md) describes registering a galaxy from code.

## See also

- [Table patches](content/table-patches.md): every patch operation, keys and conflicts
- [LumaKit: actor](lumakit/actor.md), [LumaKit: item](lumakit/item.md), [LumaKit: stage](lumakit/stage.md)
- [`lumalink extract`](lumalink/extract.md), [`lumalink check`](lumalink/check.md)
- [Content overview](content/overview.md)
- [Tutorial: a new galaxy](tutorials/a-new-galaxy.md)
