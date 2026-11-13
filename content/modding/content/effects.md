---
title: Particle effects
nav_title: Effects
description: Write particle effects in effects.json, start from or replace the game's particles, and start effects on actors and models with content.fx.
order: 5
level: intermediate
---

Particle effects (sparkles, auras, trails, bursts) are written in one JSON file per layer, `effects.json`. The cook
turns them into the game's own particle data, and the game's particle code draws them: there is no second particle
system. You can make new effects (usually by starting from one of the game's particles), change the game's own
particles in place, and start effects from code on actors and models.

## Quick start

```text
my-mod/
  luma.json
  source/main.lum
  layers/
    base/
      assets/
        effects.json
        textures/gold_spark.png
```

```json
{
  "textures": { "GoldSpark": "textures/gold_spark.png" },
  "effects": {
    "aura": {
      "draw": "3D",
      "particles": [
        {
          "like": "Glow",
          "textures": { "sprite": "GoldSpark" },
          "emitter": { "rate": 4 }
        }
      ]
    }
  }
}
```

This makes an effect `aura` that starts as a copy of the game's `Glow` particle, with your sprite and a different
emission rate. Your code names it `effect "aura"`. With LumaKit, a power-up form keeps it on the player:

```lumascript source/main.lum
use kit.player.form

pub let gold = form.define(form.Form {
    id: "gold"
    aura: effect "aura"                // kept on the player while the form lasts
    ends_on_damage: true
})
```

Check it with your imported game, so `Glow` is looked up among the game's particles:

```sh
lumalink check my-mod --game path/to/game.pak
```

> [!TIP]
> Start from the game. [`lumalink extract --game`](lumalink/extract.md) on `ParticleData/Effect.arc` writes every
> particle of the game in this same form (each under `replace` by name, every value, textures by role). Copy the
> one closest to what you want into your `effects` and change only what you need.

## The file

`layers/<layer>/assets/effects.json`. There is one per layer; if several layers have one, a later layer's texture,
effect or replacement of the same name is used whole in place of the earlier one.

| Key        | Meaning                                                                                               |
| ---------- | ----------------------------------------------------------------------------------------------------- |
| `textures` | Your own textures: a name to a PNG or JPEG path in the mod (`/` between folders, no `..`, `\` or `:`) |
| `effects`  | Your new effects, by name                                                                             |
| `replace`  | The game's particles you change in place, by the game particle's name                                 |

### effects

Each key is an effect name: `[a-z][a-z0-9_]*`. The game knows it as `<id>:<name>`; your code writes
`effect "<name>"`.

| Key         | Meaning                                                 |
| ----------- | ------------------------------------------------------- |
| `particles` | The effect's emitters, in order: at least 1, at most 16 |
| `draw`      | The draw group (below). Default `3D`                    |

The cook names the particles itself (`<id>:<name>`, then `<id>:<name>#1`, `#2`... for later emitters) and writes the
game's name rows for them. You never edit the game's names file.

### replace

Each key is a game particle's name; the value is a particle written over that particle's own records. The replaced
particle keeps the game's number and name, so **everything in the game that starts it shows your version**, with no
code and no table to edit:

```json
{ "replace": { "Glow": { "textures": { "sprite": "GoldSpark" } } } }
```

- A replacement always starts from the game's own particle, not another mod's version. `like` inside a replacement
  starts it from a different game particle.
- An unknown name is refused (`Cook.Effect.ReplaceUnknown`).
- Two mods replacing one particle: the mod higher in the Mods list wins, and a Note (`Cook.Effect.Overlap` {name,
  other, winner}) names the other.

### A particle

| Key                                                                      | Meaning                                                        |
| ------------------------------------------------------------------------ | -------------------------------------------------------------- |
| `like`                                                                   | A game particle to start from. Without it, a plain glowing dot |
| `emitter`, `shape`, `extra`, `child`, `second_texture`, `fields`, `keys` | The particle's records, each an object of named values         |
| `primary_colors`, `environment_colors`                                   | Colour tracks                                                  |
| `textures`                                                               | The texture each role uses (below)                             |
| `texture_frames`                                                         | A list of texture names: a sprite animation                    |

- Every value of every record has a name. A value you give replaces that value only; everything else comes from
  `like` (or the plain dot). Derived values (rates, tables, counts) are worked out for you.
- `null` for `extra`, `child` or `second_texture` takes that record away.
- `like` and `replace` reach the game's particles only, not other mods'.
- Colours are `rrggbbaa` hex text, for example `"ffd040ff"`.

The names of every record's values are what `lumalink extract` writes for the game's particles: extract one to see
them all.

### Textures by role

A particle uses textures in up to four roles. You name a texture for a role; you never write a position in a list.

| Role       | What it is                                                                               |
| ---------- | ---------------------------------------------------------------------------------------- |
| `sprite`   | The particle's own picture. It may not be `null`                                         |
| `child`    | The picture of the particle's children                                                   |
| `second`   | The second texture (drawn only when `second_texture.second_on` is set)                   |
| `indirect` | The indirect (screen-warp) texture (drawn only when `second_texture.indirect_on` is set) |

```json
"textures": { "sprite": "GoldSpark", "second": "mr_noise00_i" }
```

- A texture name is one of your file's `textures`, or one of the game's particle textures by name.
- `texture_frames: ["Spark0", "Spark1", "Spark2"]` is a sprite animation (at most 255 frames). `sprite` defaults to
  its first frame.
- Over `like`, a role you name replaces only that role. `child`, `second` and `indirect` may be `null` to take them
  away.
- A role named while its record does not draw it (`second` without `second_on`, `indirect` without `indirect_on`,
  `child` with no child record) is a Note, `Cook.Effect.RoleOff` {role}.
- The raw index fields (`shape.texture_index`, `child.texture_index`, `second_texture.second_texture`,
  `second_texture.indirect_texture`) are refused, naming the role to write instead (`Cook.Effect.RawIndex`).
  A list for `textures` is refused too (`Cook.Effect.Positional`).

Your textures are cooked as RGBA with mip levels and clamped edges.

### Draw groups

`draw` picks where in the frame the effect is drawn:

| Name                 | What it is                                                     |
| -------------------- | -------------------------------------------------------------- |
| `3D`                 | The default: drawn in the scene, paused with it                |
| `PAUSE_IGNORE`       | Drawn in the scene; keeps moving while the game is paused      |
| `INDIRECT`           | Drawn in the indirect (screen-warp) pass                       |
| `AFTER_INDIRECT`     | Drawn after the indirect pass, over warped water and heat haze |
| `BLOOM_EFFECT`       | Drawn into the bloom source                                    |
| `AFTER_IMAGE_EFFECT` | Drawn into the after-image pass                                |

The game's screen groups (`2D`, `2D_PAUSE_IGNORE`, `FOR_2D_MODEL`) are for layouts, not for an actor's effect, and
are refused (`Cook.Effect.Choice`, which lists the six above).

Effects pause and slow with the scene, except `PAUSE_IGNORE`. With ray tracing, a mod's effect gives light as the
game's effects do; there is nothing for you to do.

## Starting effects from the game's tables

The game's actors start their effects from the table `ParticleData/Effect.arc/AutoEffectList.bcsv`. You can
[patch](content/table-patches.md) that table so a game actor starts one of your effects. The cook checks each row
your patch adds or changes, after every mod's effects are cooked:

- a word naming a particle that is in neither the game's names nor any mod's is `Cook.Effect.TableUnknown` {where,
  word};
- a numbered name with no `<name>00` particle (the game would make no emitter) is `Cook.Effect.TableNoFirst`
  {where, word}.

`where` is the cell's JSON pointer in your patch file. Rows no mod touched are not read.

## Checks and refusals

`lumalink check` and `pack` cook every layer's `effects.json`. With `--game` they check game names against the game's
particles; without it, any game name passes. The game's start cooks them again.

Every refusal is **L804** with a `Cook.Effect.<Kind>` reason in the player's language, and a JSON pointer to the value
(for example `/effects/aura/particles/1/emitter/rate`). A refusal stops the **whole file**: no half-merged particle
set is ever used.

| Reason                                   | When                                                                                           |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `UnknownPart` {particle, key, parts}     | A key the place does not take (a misspelt key is never ignored)                                |
| `UnknownValue` {record, key, names}      | A value name the record does not have                                                          |
| `Kind` {where, expected}                 | The wrong kind of value: a number, whole number, true/false, text, list or object was expected |
| `Range` {value, min, max}                | A number outside its range                                                                     |
| `Choice` {value, list}                   | Not one of the allowed words                                                                   |
| `Color` {value}                          | Not `rrggbbaa`                                                                                 |
| `Length`                                 | A list or text of the wrong length                                                             |
| `Missing`                                | A required key is missing                                                                      |
| `Keys` {track}                           | A colour or value track whose frames do not rise, or that has none                             |
| `NoTexture` {name}                       | A texture that is neither the file's nor the game's                                            |
| `TextureName`, `FilePath`, `FileMissing` | A bad texture name, a texture path leaving the mod, or a missing file                          |
| `LikeUnknown` {name}                     | `like` names no game particle                                                                  |
| `ReplaceUnknown` {name}                  | `replace` names no game particle                                                               |
| `RawIndex`                               | A raw texture index: name the role instead                                                     |
| `Positional`                             | `textures` as a list: name the four roles instead                                              |
| `Frames` {count}                         | More than 255 texture frames                                                                   |
| `NameBad` {name}                         | An effect name outside `[a-z][a-z0-9_]*`                                                       |
| `Empty` {effect}                         | An effect with no particles                                                                    |
| `TooMany` {effect}                       | More than 16 particles                                                                         |
| `Count`                                  | Too many particles in the game altogether                                                      |
| `OldForm`                                | An old `.jpc.json` merge file: write `effects.json` instead                                    |
| `TableUnknown`, `TableNoFirst`           | See [Starting effects from the game's tables](#starting-effects-from-the-game-s-tables)        |
| `Overlap` (Note)                         | Another mod replaces the same particle                                                         |
| `RoleOff` (Note)                         | A role is named but not drawn                                                                  |

A file that is not valid JSON is `Cook.Model.Json` {line, column}. A texture that cannot be read gives the image's
own refusal.

## Run time: the content.fx service

LumaKit starts effects for you through fields like a form's `aura`, a projectile's `trail` and `burst`, or
`actor.shockwave`'s `effect`. To start effects yourself, use the game's `content.fx` service: `use svc.content.fx`.
It needs no permission, and is called on the game thread.

| Member                                               | Description                                                                                                                                                                                                                          |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `start(actor, name, joint, place, follow)`           | Starts the effect `name` on `actor`, at the joint `joint` (none: the actor's base), offset and turned by `place`. With `follow` it follows every frame; without, it stays where it started. Gives an effect handle owned by your mod |
| `start_on_model(model, name, socket, place, follow)` | The same on a model your mod attached with [`content.model`](content/models.md#run-time-the-content-model-service), at its joint or [socket](content/models.md#sockets)                                                              |
| `stop(effect, now)`                                  | Stops making particles. Those alive fade as the effect says, or with `now` all go at once                                                                                                                                            |
| `tint(effect, scale, rgba)`                          | Scales and colours the effect on top of its own (1 and white: no change). `rgba` is `0xRRGGBBAA`                                                                                                                                     |

In LumaScript, `content.fx.start(...)` returns a `content.fx.Effect` handle.

- `name` is an effect name, checked when you build: `effect "aura"` for your own, or one of the game's effect names
  (`"Glow"`), which starts as the game starts it.
- `place` is an offset in game units and a turn in degrees about X, Y and Z, in the joint's space.
- Starting one name twice on one actor gives two handles and two emitters. (The game's one-per-name rule applies only
  to its own table's effects.)
- `tint`'s scale must be above 0 and finite.

### When a handle ends

A handle ends at `stop`, when its actor ends (its effects stop with it, as the game's do), when the model it was
started on is detached, at a scene change, and when your mod stops. A call on an ended handle is an error
(`LUMA_E_HANDLE`) that is reported, never a crash. When the actor dies or is clipped, its mod effects react one frame
after the game's own.

### Limits and messages

| Limit               | Value                                 |
| ------------------- | ------------------------------------- |
| Open effect handles | 256 a mod, 4096 for all mods together |
| Particles an effect | 16                                    |

| Code | Row                     | When                                                                                                              |
| ---- | ----------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 623  | `Content.MissingEffect` | A name built at run time is in no store: placeholder sparks start in its place                                    |
| 626  | `Content.MissingJoint`  | The joint or socket is not on the actor or model: the effect starts at the base or the model's root               |
| 640  | `Content.EffectEmpty`   | The effect started but made no particle in the 60 frames after its first emitter frame, while its actor was drawn |
| 641  | `Content.EffectsFile`   | The mod's cooked effects list cannot be read: its effects draw in the `3D` group                                  |

`Content.EffectEmpty` catches an effect that is invisible because of its data (a rate of 0, a texture that draws
nothing). It is checked once per effect name a session, on the first start. An emitter that starts late on purpose
is counted from its own first frame, and an effect stopped before the 60 frames are over is not checked.

A literal name that does not exist is found when you build and when the game imports the mod, before anything
plays.

## See also

- [Models](content/models.md)
- [Table patches](content/table-patches.md)
- [Content overview](content/overview.md)
- [LumaKit: player.form](lumakit/player-form.md), [LumaKit: projectile](lumakit/projectile.md),
  [LumaKit: actor](lumakit/actor.md)
- [`lumalink extract`](lumalink/extract.md)
- [Services overview](services/overview.md)
- [Tutorial: a new power-up](tutorials/a-new-power-up.md)
