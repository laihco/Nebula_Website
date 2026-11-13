---
title: 'LumaKit: player.character'
nav_title: player.character
description: Playable characters with their own name, icon, model, animations, voice and constants; switching character mid-level; and a second player on its own pad.
order: 4
level: intermediate
---

`kit.player.character` adds a playable character: a name, an icon, a model, its own animation clips and voice, and its own physics constants. The player can switch to it in the middle of a level and back to the game's Mario. The module also makes a second player: a second instance of the game's own player, driven by another pad.

## Example

A character of your own, played from code and switched back:

```lumascript source/main.lum
use kit.player.character

let toad = character.define(character.Character {
    id: "toad"
    name: text "Toad.Name"
    look: model "Toad"                         // its own skeleton or Mario's
})

fn play_toad() { toad.play() }
fn play_mario() { character.mario().play() }   // the game's own character again
```

A second player for split-screen co-op takes a `Second` with the pad that drives it; the camera follows it with [`camera.follow`](lumakit/camera.md) in a [`draw.view`](services/draw.md) on half the screen.

> [!PLANNED]
> A second player needs an `input.Pad` for its controller, and the [input service](services/input.md) does not give a second player's pad yet. Until it does, `second_player` cannot be given a pad.

## Using it

Add LumaKit to your mod's `needs` in `luma.json` and `use` the module:

```json
"needs": [ { "id": "lumakit", "version": "^1" } ]
```

```lumascript
use kit.player.character
```

You then write `character.define(...)`. The module works by deriving from and hooking the game's player object, and uses model, animation, sound and text content, the assets service (for a model your mod gets at run time) and the input service. It needs no permission of its own.

> [!PLANNED]
> Not every LumaKit call can be made from a mod yet. See [What works today](lumakit/overview.md#what-works-today).

## Interface

```lumascript
pub struct Character {
    id: text
    name: text
    icon: draw.Texture? = none
    look: model                               // its own skeleton or Mario's (LumaLink binds and scales it)
    actions: map<text, text> = {}             // the game's action name -> this character's clip
    voice: map<text, sound> = {}              // the game's voice name -> this character's sound
    tuning: player.state.Tuning? = none
    as_luigi: bool = false                    // the game's Luigi checks answer true
}
pub struct CharacterId { fn play(self); fn is_current(self) -> bool }
pub fn define(c: Character) -> CharacterId
pub fn find(id: text) -> CharacterId?
pub fn current() -> CharacterId?              // none: the game's own Mario or Luigi
pub fn mario() -> CharacterId                 // the game's own, to switch back
pub struct Second { look: model, pad: input.Pad, character: CharacterId? = none }
pub struct SecondPlayer { fn view(self) -> MarioActor; fn remove(self); fn alive(self) -> bool }
pub fn second_player(s: Second) -> SecondPlayer
```

## Functions

| Name               | Description                                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `define(c)`        | Defines a character for your mod and returns its `CharacterId`.                                                           |
| `find(id)`         | The character your mod defined in `kit/player.character/<id>.json`, or `none`.                                            |
| `current()`        | The mod-defined character being played, or `none` when it is the game's own Mario or Luigi.                               |
| `mario()`          | The game's own character, so you can switch back with `play()`.                                                           |
| `second_player(s)` | Makes a second player: a second instance of the game's player, driven by the pad in `s`. Returns a `SecondPlayer` handle. |

### CharacterId

| Name           | Description                                                               |
| -------------- | ------------------------------------------------------------------------- |
| `play()`       | Switches the player to this character now, even in the middle of a level. |
| `is_current()` | `true` while this character is played.                                    |

### SecondPlayer

| Name       | Description                                                            |
| ---------- | ---------------------------------------------------------------------- |
| `view()`   | The second player's `MarioActor`, for example to point a camera at it. |
| `remove()` | Removes the second player. Safe to call more than once.                |
| `alive()`  | `true` until it is removed.                                            |

## Types

### Character

| Field      | Description                                                                                                                        |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `id`       | Unique within your mod.                                                                                                            |
| `name`     | The character's name: a text row of your mod (`text "Toad.Name"`).                                                                 |
| `icon`     | A picture for the character, or `none`.                                                                                            |
| `look`     | Its model, on its own skeleton or on Mario's. LumaLink binds and scales it.                                                        |
| `actions`  | Maps the game's animation (action) names to this character's own clips.                                                            |
| `voice`    | Maps the game's voice names to this character's sounds.                                                                            |
| `tuning`   | The player's constants while this character is played, as a [`player.state.Tuning`](lumakit/player-state.md).                      |
| `as_luigi` | When `true`, the game's own "is the player Luigi?" checks (`MR::isPlayerLuigi`) answer `true` for this character. Default `false`. |

### Second

| Field       | Description                                                          |
| ----------- | -------------------------------------------------------------------- |
| `look`      | The second player's model.                                           |
| `pad`       | The pad that drives it (an `input.Pad`; see the note under Example). |
| `character` | A character to play it as, or `none`.                                |

## Data files

A character can be written as `kit/player.character/<id>.json`, with all of its fields. Declare the data format in `luma.json` with `"kit": { "lumakit.player.character": 1 }`, and look it up in code with `find`.

## Behaviour and edge cases

- **One character at a time.** If two mods switch the player's character, the newer request holds, and the older one holds again when the newer one ends.
- **A model from the internet.** `look` can be a model your mod gets while the game runs, through the [assets service](services/assets.md); it is checked by the validator like any model.
- **Second player.** The second player is the game's own player object, so it moves on planets and under gravity like the first.
- **Your mod switched off.** If your mod stops while its character is played, the player is the game's Mario again, and a second player your mod made is removed.

## See also

- [player.form](lumakit/player-form.md)
- [player.state](lumakit/player-state.md): `Tuning`
- [camera](lumakit/camera.md): following the second player
- [Models](content/models.md) and [Animation](content/animation.md)
- [Draw service](services/draw.md): views and screen regions
- [Input service](services/input.md): pads
