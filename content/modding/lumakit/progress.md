---
title: 'LumaKit: progress'
nav_title: progress
description: Save-file progress for mods - stars counted past 120, stars given from code, what getting a star does, comets added to any galaxy, per-file flags and numbers, and new-file rules.
order: 18
level: intermediate
---

`kit.progress` keeps your mod's progress with the player's save file. It counts stars beyond the game's 120, including your galaxies' stars, gives stars from code, lets you decide what getting a star does, adds comets to any galaxy, and keeps per-file flags and numbers (met a character, experience points, achievements) that follow the save file when it is copied or erased. It also runs your code when the player starts a new file, for rules such as New Game+.

## Example

A flag, a number, and a star that gives a 1-up instead of itself in one galaxy, built from the module's documented calls:

```lumascript source/main.lum
use kit.progress
use kit.item

let met_keeper = progress.flag("met-keeper")
let xp = progress.number("xp")

on start {
    progress.on_star(fn(galaxy: text, scenario: u32) -> progress.StarGet {
        if galaxy == "LumaNebulaGalaxy" and scenario == 2 {
            return progress.StarGet.Instead(item.Gives.Lives(1))
        }
        return progress.StarGet.Star
    })
    progress.on_new_file(fn() { xp.set(0) })
}

fn talked_to_keeper() {
    if not met_keeper.get() {
        met_keeper.set(true)
        let total = xp.add(10)
        log "xp now {total}"
    }
}
```

## Using it

Add LumaKit to your mod's `needs` in `luma.json` and `use` the module:

```json
"needs": [ { "id": "lumakit", "version": "^1" } ]
```

```lumascript
use kit.progress
```

Values are kept with the [save service](services/save.md), per save file. Star counting, the comet table and the game's save-data functions (`GameDataFunction`) are reached through hooks; comet kinds come from [stage](lumakit/stage.md). The module needs no permission.

> [!PLANNED]
> Not every LumaKit call can be made from a mod yet. See [What works today](lumakit/overview.md#what-works-today).

## Interface

```lumascript
pub fn stars() -> u32                                  // the game's and every mod's, on this file
pub fn has_star(galaxy: text, scenario: u32) -> bool
pub fn give_star(galaxy: text, scenario: u32)
pub fn on_star(f: fn(text, u32) -> StarGet)           // (galaxy, scenario): what getting a star does
pub enum StarGet { Star, Nothing, Instead(item.Gives) }
pub fn add_comet(galaxy: text, scenario: u32, comet: stage.Comet)
pub struct Flag { fn get(self) -> bool; fn set(self, on: bool) }
pub struct Number { fn get(self) -> i64; fn set(self, v: i64); fn add(self, d: i64) -> i64 }
pub fn flag(id: text) -> Flag                          // per file, following its copy and erase
pub fn number(id: text) -> Number
pub fn on_new_file(f: fn())
```

## Functions

### Stars

| Name                                 | Description                                                                                                                 |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `stars()`                            | The stars on the current save file: the game's own and every mod's, so the count goes past 120.                             |
| `has_star(galaxy, scenario)`         | `true` when the current file has star `scenario` of `galaxy`.                                                               |
| `give_star(galaxy, scenario)`        | Gives the current file that star.                                                                                           |
| `on_star(f)`                         | Sets what getting a star does. `f` is called with the galaxy's name and the star's scenario, and returns a `StarGet`.       |
| `add_comet(galaxy, scenario, comet)` | Adds a comet of kind `comet` (a [`stage.Comet`](lumakit/stage.md)) to star `scenario` of any galaxy, the game's or a mod's. |

### Flags and numbers

| Name             | Description                                                                                  |
| ---------------- | -------------------------------------------------------------------------------------------- |
| `flag(id)`       | Your mod's yes/no value `id` on the current save file.                                       |
| `number(id)`     | Your mod's whole number `id` on the current save file (experience, a count of achievements). |
| `on_new_file(f)` | Calls `f` when the player starts a new save file, for new-file rules such as New Game+.      |

### Flag

| Name      | Description                           |
| --------- | ------------------------------------- |
| `get()`   | The flag's value on the current file. |
| `set(on)` | Sets it.                              |

### Number

| Name     | Description                                                 |
| -------- | ----------------------------------------------------------- |
| `get()`  | The number's value on the current file.                     |
| `set(v)` | Sets it.                                                    |
| `add(d)` | Adds `d` (which may be negative) and returns the new value. |

## Types

### StarGet

What getting a star does, returned from your `on_star` function:

| Case         | Getting the star                                                   |
| ------------ | ------------------------------------------------------------------ |
| `Star`       | gives the star, as normal                                          |
| `Nothing`    | gives nothing                                                      |
| `Instead(g)` | gives `g` (an [`item.Gives`](lumakit/item.md)) instead of the star |

## Behaviour and edge cases

- **Per file.** Flags, numbers and stars belong to one save file. When the player copies a file, its values are copied with it; when they erase a file, its values go too.
- **Dialogue flags.** The flags a [talk](lumakit/talk.md) tree sets are kept here.
- **Your mod switched off.** Its `on_star` and `on_new_file` functions are no longer called, and comets it added are taken away.

## See also

- [stage](lumakit/stage.md): galaxies, stars and comet kinds
- [talk](lumakit/talk.md): flags set by dialogue
- [item](lumakit/item.md): `Gives`
- [Save service](services/save.md)
