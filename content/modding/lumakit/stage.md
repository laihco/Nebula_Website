---
title: 'LumaKit: stage'
nav_title: stage
description: New galaxies listed in the observatory's domes with their stars and comets, new domes, music per galaxy, warping, stars appearing, the hub replaced and stages built in code.
order: 17
level: intermediate
---

`kit.stage` connects your stages to the game. It lists a new galaxy in one of the observatory's domes, with its stars, comets, unlock rule, music and icon; adds a dome of your own; warps the player to a galaxy; makes a star appear; changes a galaxy's music; replaces the hub; and builds a whole stage in code when it loads. The stage itself (its models, collision, placement, cameras and gravity) is content in your mod's layers; this module is how the game finds it and lets the player in.

## Example

From [A new galaxy](tutorials/a-new-galaxy.md): a galaxy in the Kitchen dome, open after 20 stars, and its star appearing where the boss is defeated.

```lumascript source/main.lum
use kit.stage

let galaxy = stage.define_galaxy(stage.Galaxy {
    name: "LumaNebulaGalaxy"                  // the stage folder in layers/
    title: text "Galaxy.Name"
    dome: stage.Dome.Kitchen                  // which observatory dome lists it
    unlock: stage.Unlock.Stars(20)
    stars: [ stage.Star { scenario: 1, title: text "Star1" },
             stage.Star { scenario: 2, title: text "Star2", comet: none } ]
    music: sound "NebulaTheme"                // a stream (OGG) in layers/
})

fn boss_defeated(at: vec3) {
    stage.appear_star(at, scenario: 1)
}
```

A stage built in code, with a planet, its gravity and two objects:

```lumascript
use kit.stage
use kit.gravity

on start {
    stage.build("LumaTinyGalaxy", fn(var b: stage.Builder) {
        b.planet(model "Planet", model "PlanetCollision", vec3(0, 0, 0))
        b.gravity(gravity.Field.Point { at: vec3(0, 0, 0) })
        b.place("Kuribo", vec3(0, 1200, 0))
        b.place("LumaBalloon", vec3(300, 1200, 0))
    })
}
```

## Using it

Add LumaKit to your mod's `needs` in `luma.json` and `use` the module:

```json
"needs": [ { "id": "lumakit", "version": "^1" } ]
```

```lumascript
use kit.stage
```

The module hooks the game's dome galaxy selector, scenario select and stage music, and uses the game's own calls to change stage and make power stars appear. A stage built in code goes through the same cooking and checks as content from your files, through the [assets service](services/assets.md). Stars are counted with [progress](lumakit/progress.md). The module needs no permission.

> [!PLANNED]
> Not every LumaKit call can be made from a mod yet. See [What works today](lumakit/overview.md#what-works-today).

## Interface

```lumascript
pub enum Dome { Terrace, Fountain, Kitchen, Bedroom, Engine, Garden, Mod(name: text) }
pub enum Unlock { Always, Stars(u32), Star(galaxy: text, scenario: u32), Code(fn() -> bool) }
pub enum Comet { Speedy, Daredevil, Cosmic, FastFoe, Purple }
pub struct Star { scenario: u32, title: text, comet: Comet? = none, hidden: bool = false }
pub struct Galaxy { name: text, title: text, dome: Dome, unlock: Unlock = Unlock.Always, stars: list<Star>,
                    music: sound? = none, icon: draw.Texture? = none }
pub struct GalaxyId { fn go(self, scenario: u32); fn name(self) -> text }
pub struct DomeDef { name: text, title: text, unlock: Unlock = Unlock.Always }
pub fn define_galaxy(g: Galaxy) -> GalaxyId
pub fn define_dome(d: DomeDef)
pub fn find(name: text) -> GalaxyId?
pub fn go_to(galaxy: text, scenario: u32)
pub fn appear_star(at: vec3, scenario: u32)
pub fn music(galaxy: text, scenario: u32?, s: sound)
pub fn hub(stage: text)                               // the hub replaced
pub fn build(name: text, make: fn(var Builder))      // a stage made in code when it loads
pub struct Builder { fn place(var self, kind: text, at: vec3, rotation: vec3 = vec3(0, 0, 0), args: list<int> = []);
                     fn planet(var self, look: model, collision: model, at: vec3); fn gravity(var self, f: gravity.Field) }
```

## Functions

| Name                         | Description                                                                                                                |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `define_galaxy(g)`           | Lists the galaxy `g` in its dome and returns its `GalaxyId`.                                                               |
| `define_dome(d)`             | Adds a dome of your own to the observatory. Galaxies join it with `Dome.Mod(name)`.                                        |
| `find(name)`                 | A galaxy your mod defined in `kit/stage/`, or `none`.                                                                      |
| `go_to(galaxy, scenario)`    | Warps the player to `galaxy`, star `scenario`, through the game's own stage change (`MR::requestChangeStageInGameMoving`). |
| `appear_star(at, scenario)`  | Makes the power star for `scenario` of the current galaxy appear at `at`.                                                  |
| `music(galaxy, scenario, s)` | Plays `s` as the music of `galaxy`: for one `scenario`, or for all with `none`.                                            |
| `hub(stage)`                 | Replaces the hub (the observatory) with your stage.                                                                        |
| `build(name, make)`          | Builds the stage `name` in code: when it loads, `make` is called with a `Builder` to place its parts.                      |

### GalaxyId

| Name           | Description                                         |
| -------------- | --------------------------------------------------- |
| `go(scenario)` | Warps the player to star `scenario` of this galaxy. |
| `name()`       | The galaxy's name.                                  |

### Builder

| Name                              | Description                                                                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `place(kind, at, rotation, args)` | Places an object of the class or kind `kind` at `at`, with an optional `rotation` and the placement's integer arguments `args`. |
| `planet(look, collision, at)`     | Places a planet: a model to draw and a model for its collision.                                                                 |
| `gravity(f)`                      | Adds a gravity field (from [gravity](lumakit/gravity.md)).                                                                      |

## Types

### Galaxy

| Field    | Description                                                                                                                     |
| -------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `name`   | The stage's name: its folder in your mod's `layers/`.                                                                           |
| `title`  | The name the player sees: one of your text rows.                                                                                |
| `dome`   | The dome that lists it: `Terrace`, `Fountain`, `Kitchen`, `Bedroom`, `Engine`, `Garden`, or `Mod(name)` for a dome of your own. |
| `unlock` | When it opens (see `Unlock`). Default: always.                                                                                  |
| `stars`  | Its stars.                                                                                                                      |
| `music`  | Its music, or `none`.                                                                                                           |
| `icon`   | Its picture in the dome, or `none`.                                                                                             |

### Star

| Field      | Description                                                                                |
| ---------- | ------------------------------------------------------------------------------------------ |
| `scenario` | The star's number in the galaxy (1 for the first).                                         |
| `title`    | The star's name: one of your text rows.                                                    |
| `comet`    | A comet for this star (`Speedy`, `Daredevil`, `Cosmic`, `FastFoe` or `Purple`), or `none`. |
| `hidden`   | A hidden star. Default `false`.                                                            |

### Unlock

| Case                     | Opens                                 |
| ------------------------ | ------------------------------------- |
| `Always`                 | from the start                        |
| `Stars(n)`               | once the player has `n` stars         |
| `Star(galaxy, scenario)` | once the player has that star         |
| `Code(f)`                | when your function `f` returns `true` |

### DomeDef

`name`, `title` and `unlock`, as for a galaxy.

## Data files

Galaxies and domes can be written as `kit/stage/<name>.json`. Declare the data format in `luma.json` with `"kit": { "lumakit.stage": 1 }`, and look a galaxy up in code with `find`.

## Behaviour and edge cases

- **Stars count.** Stars of your galaxies are counted with the game's own, through [progress](lumakit/progress.md), so they count toward `Unlock.Stars` and the player's total (past 120).
- **Stages built in code** are cooked and checked as your mod's own content files are, so a mistake is reported with the same codes.
- **Names in `place`.** A kind of your own mod is placed by its short name; a kind of another mod by `<mod id>/<name>` (see [actor](lumakit/actor.md)).
- **Your mod switched off.** Its galaxies and domes are no longer listed, and its music changes are undone.

## See also

- [progress](lumakit/progress.md): stars, comets and flags
- [actor](lumakit/actor.md): objects to place
- [gravity](lumakit/gravity.md)
- [Stages](content/stages.md): the stage files themselves
- [Tutorial: a new galaxy](tutorials/a-new-galaxy.md)
