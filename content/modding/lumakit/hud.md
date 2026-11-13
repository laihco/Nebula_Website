---
title: 'LumaKit: hud'
nav_title: hud
description: Timers, counters, meters, text and pictures in the screen's corners; text above actors and floating in 3D; popups and subtitles; and the game's own HUD parts hidden.
order: 11
level: essential
---

`kit.hud` puts things on the player's screen: timers, counters, meters, text and pictures, each in one of eight corners and edges. It also shows text that follows an actor or floats up from a point, an achievement-style popup, and subtitles, and it hides parts of the game's own HUD (lives, coins, star bits, stars, health). Every element you add is a handle you update and remove.

## Example

A boss health meter, from [A new galaxy](tutorials/a-new-galaxy.md), and a race timer that reads its time each frame, from [Balloon World](tutorials/balloon-world.md):

```lumascript source/main.lum
use kit.hud
use svc.time

var meter: hud.Meter? = none
var hunt_start: u64 = 0

fn boss_appears() {
    meter = hud.meter(hud.Corner.Top, max: 3, label: text "Boss.Name")
}

fn boss_hit(health: int) {
    meter?.set(health)
    if health <= 0 { meter?.remove() }
}

fn start_race() {
    hunt_start = time.now().frame
    hud.timer(hud.Corner.TopRight).follow(fn() -> u64 { return time.now().frame - hunt_start })
}
```

A minimap picture in a corner, from the recipes:

```lumascript
use kit.hud
use svc.draw

let map_view = draw.view(draw.View {
    camera: draw.ViewCamera.Above(of: fn() -> vec3 { return MR::getPlayerPos() }, height: 6000.0, ortho_width: 8000.0)
    target: draw.Target.Texture(256, 256)
})
let panel = hud.picture(hud.Corner.BottomRight, map_view.texture(), size: vec2(200, 200))
```

## Using it

Add LumaKit to your mod's `needs` in `luma.json` and `use` the module:

```json
"needs": [ { "id": "lumakit", "version": "^1" } ]
```

```lumascript
use kit.hud
```

The module draws through the [ui](services/ui.md) and [draw](services/draw.md) services, with layout, font and text content, and hooks the game's own HUD counters (`CounterLayoutController`) to hide them. It needs no permission.

> [!PLANNED]
> Not every LumaKit call can be made from a mod yet. See [What works today](lumakit/overview.md#what-works-today).

## Interface

```lumascript
pub enum Corner { TopLeft, Top, TopRight, Left, Right, BottomLeft, Bottom, BottomRight }
pub struct Timer { fn set(self, frames: u64); fn follow(self, f: fn() -> u64); fn remove(self) }
pub struct Text { fn set(self, s: text); fn remove(self) }
pub struct Meter { fn set(self, value: int); fn remove(self) }
pub struct Picture { fn set(self, tex: draw.Texture); fn remove(self) }
pub struct Counter { fn set(self, value: i64); fn remove(self) }
pub fn timer(at: Corner, frames: u64 = 0) -> Timer
pub fn text(at: Corner, s: text, frames: u32? = none) -> Text   // frames: removes itself after
pub fn meter(at: Corner, max: int, label: text? = none) -> Meter
pub fn picture(at: Corner, tex: draw.Texture, size: vec2) -> Picture
pub fn counter(at: Corner, value: i64, icon: draw.Texture? = none) -> Counter
pub fn above(of: LiveActor, s: text, height: f32 = 150.0) -> Text   // follows the actor
pub fn float_text(at: vec3, s: text, frames: u32 = 60)              // rises and fades
pub fn popup(title: text, line: text, icon: draw.Texture? = none)   // the achievement popup
pub fn subtitle(line: text, speaker: text? = none, frames: u32 = 180)
pub enum GamePart { Lives, Coins, StarBits, Stars, Health, All }
pub fn hide_game(part: GamePart, hidden: bool)
```

## Functions

### Elements in corners

Each takes a `Corner` and returns a handle.

| Name                       | Description                                                                                                                      |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `timer(at, frames)`        | A timer showing `frames` (default `0`). Update it with `set`, or give it a function with `follow`.                               |
| `text(at, s, frames)`      | A line of text. With `frames`, it removes itself after that many frames; with `none` (the default) it stays until you remove it. |
| `meter(at, max, label)`    | A meter from 0 to `max`, with an optional label. `max` must be 1 or more.                                                        |
| `picture(at, tex, size)`   | A picture of `size`, from any `draw.Texture` (including a view rendered to a texture, as in the minimap example).                |
| `counter(at, value, icon)` | A number, with an optional icon beside it.                                                                                       |

### Text in the world, popups and subtitles

| Name                              | Description                                                                                                 |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `above(of, s, height)`            | Text that follows the actor `of`, `height` (default `150.0`) above it: a name tag. Returns a `Text` handle. |
| `float_text(at, s, frames)`       | Text at a point in the world that rises and fades over `frames` (default `60`).                             |
| `popup(title, line, icon)`        | An achievement-style popup with a title, a line and an optional icon.                                       |
| `subtitle(line, speaker, frames)` | A subtitle line, with an optional speaker name, for `frames` (default `180`, 3 seconds).                    |

### The game's own HUD

| Name                      | Description                                                                                                                      |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `hide_game(part, hidden)` | Hides (`true`) or shows again (`false`) a part of the game's own HUD: `Lives`, `Coins`, `StarBits`, `Stars`, `Health`, or `All`. |

### Handles

| Handle    | Methods                                                                                                         |
| --------- | --------------------------------------------------------------------------------------------------------------- |
| `Timer`   | `set(frames)` shows a number of frames; `follow(f)` calls `f` each frame and shows what it returns; `remove()`. |
| `Text`    | `set(s)` changes the text; `remove()`.                                                                          |
| `Meter`   | `set(value)` sets the meter's value; `remove()`.                                                                |
| `Picture` | `set(tex)` changes the picture; `remove()`.                                                                     |
| `Counter` | `set(value)` changes the number; `remove()`.                                                                    |

## Types

### Corner

`TopLeft`, `Top`, `TopRight`, `Left`, `Right`, `BottomLeft`, `Bottom`, `BottomRight`: the eight places on the screen an element can go.

### GamePart

`Lives`, `Coins`, `StarBits`, `Stars`, `Health` and `All`: the parts of the game's own HUD that `hide_game` hides.

## Behaviour and edge cases

- **Stacking.** Elements in the same corner stack in the order they were made, including elements of different mods.
- **Fonts.** Text is drawn in the game's own message font, so use only characters that font has for each region your mod supports. Put text the player reads in your mod's text rows (`text "Boss.Name"`), so it is translated.
- **Wrong values.** A wrong argument is a script error at your line, for example `kit.hud.meter: max is 0; it must be >= 1`.
- **Removed handles.** `remove()` may be called any number of times. Any other call on a removed element is a script error (`kit.hud.meter was ended, so it can no longer be used`).
- **Your mod switched off.** Every element your mod added disappears, and parts of the game's HUD it hid come back.

> [!TIP]
> If all you want is to hide the game's HUD, see the [Hide the HUD tutorial](tutorials/hide-the-hud.md), which hooks the game directly.

## See also

- [screen](lumakit/screen.md): whole screens instead of corner elements
- [ui.kit](lumakit/ui-kit.md): panels with widgets
- [Draw service](services/draw.md): textures, views and drawing your own
- [Screens and fonts](content/screens.md)
- [Tutorial: Balloon World](tutorials/balloon-world.md)
- [Tutorial: hide the HUD](tutorials/hide-the-hud.md)
