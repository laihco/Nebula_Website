---
title: 'Recipes: short mods to learn from'
nav_title: Recipes
description: A dozen small worked mods, each a few lines with an explanation, from hard mode and rumble to lava you can swim in and lyrics on the staff roll.
order: 11
level: intermediate
---

Each recipe on this page is a small, complete idea: a goal, the code, and a few sentences on how it works. They're good starting points for your own mods and good examples of one technique each. They assume you've done [Your first mod](start/first-mod.md) and [Moon jump](tutorials/moon-jump.md); each `luma.json` holds only the parts that matter for the recipe.

> [!PLANNED]
> Recipes that `use kit.<module>` need LumaKit, whose modules are written but not all callable from a mod yet; see [What works today](lumakit/overview.md#what-works-today). Such a mod also lists `{ "id": "lumakit", "version": "^1" }` in its `needs`. Recipes that use the `draw` service use calls that may still change before release; see [Draw](services/draw.md).

## Spin and the Star Pointer from the start

**Goal:** have the spin and the Star Pointer from the moment a file starts, without playing the opening.

```lumascript source/main.lum
hook after GameScene::start() {                          // a file is loaded and a stage has begun
    MR::onGameEventFlagEnableToSpinAndStarPointer()
}
```

An `after` hook on `GameScene::start` runs each time a stage begins. It calls the game's own `MR::onGameEventFlagEnableToSpinAndStarPointer`, which turns on the game's event flag that allows both. See [Hooking the game's functions](lumascript/hooks.md).

## Rumble on hits and landings

**Goal:** a strong rumble when Mario is hurt and a light one when he lands.

```lumascript source/main.lum
hook after Mario::checkDamage() -> hit {
    if hit { if let p = MarioAccess::getPlayerActor() { MR::tryRumblePadStrong(p, 0) } }
}
hook after Mario::doLanding() { if let p = MarioAccess::getPlayerActor() { MR::tryRumblePadWeak(p, 0) } }
```

`-> hit` names the result of `Mario::checkDamage` for the `after` hook to read: true when Mario was hurt. The rumble itself is the game's own (`MR::tryRumblePadStrong` and `MR::tryRumblePadWeak`), so it reaches the player's pad through the game, and no new service or permission is needed. `if let` takes the player, who may be missing.

## Hard mode

**Goal:** every hit takes two (or three) times as much health.

```json luma.json
"options": [
  { "key": "factor", "kind": "number", "default": 2, "min": 1, "max": 3, "name": "Damage multiplier" }
]
```

```lumascript source/main.lum
option factor: int        // 2 by default; 1 to 3
wrap MarioActor::decLife(amount) {
    amount = low_bits<u16>(amount as u32 * factor as u32)  // u16 kept on purpose
    proceed()
}
```

A `wrap` hook surrounds the game's function: it names the arguments (`amount`), may change them, and calls `proceed()` to run the game's own code with the new values. `decLife` takes its amount as a `u16`, so the code multiplies in `u32` and keeps the low 16 bits with `low_bits<u16>` to give the game a `u16` again.

## Christmas decorations on 25 December

**Goal:** a layer of decorations that's only on during Christmas Day.

```json luma.json
"layers": [ { "name": "base" }, { "name": "xmas", "when": { "code": true } } ]
```

```lumascript source/main.lum
use svc.time

on layers -> list<text> {                    // which "when.code" layers are on; before content loads
    let d = time.wall()
    return if d.month == 12 and d.day == 25 { ["xmas"] } else { [] }
}
```

A layer is a folder of content (`layers/xmas/`) that applies only when its `when` holds. `"code": true` lets the mod's code decide: the game asks `on layers` before it loads any content, and turns on the layers named in the list it returns. `time.wall()` gives the real date and time in the player's time zone. Put the decorated models, textures or stage patches in `layers/xmas/`. See [Anatomy of a mod](start/mod-anatomy.md) and [Time](services/time.md).

## Gravity flip on a button

**Goal:** press a button to turn gravity upside down; press again to put it back.

```json luma.json
"options": [
  { "key": "flip_gravity", "kind": "key", "default": "two", "name": "Flip gravity" }
]
```

```lumascript source/main.lum
use kit.gravity
use svc.input

option flip_gravity: input.Action          // listed in the Controls page
var flipped: gravity.Override? = none

on frame {
    if input.read(flip_gravity).pressed == 1 {
        if let f = flipped { f.end(); flipped = none }
        else {
            if let p = MarioAccess::getPlayerActor() {
                flipped = gravity.override_player(gravity.Field.Parallel { direction: p.mGravity * -1.0 })
            }
        }
    }
}
```

The action follows the 2 button until the player binds it elsewhere in Controls; `pressed` is 1 on the frame it goes down. `gravity.override_player` replaces the player's gravity with a field of your choosing (here a parallel pull, opposite to the current one) and gives an `Override` handle; `end()` gives gravity back. If another mod overrides gravity too, the newest holds and yours holds again when it ends. See [LumaKit: gravity](lumakit/gravity.md) and [Input](services/input.md).

## Swimming in lava

**Goal:** a new kind of area, placed in stages like the game's own, where Mario swims as in water but slowly burns.

```lumascript source/main.lum
use kit.area

// A new area kind, placed in stages like the game's own areas; inside it the player swims, and burns slowly.
let lava = area.define(area.Kind { name: "LumaLavaSwimArea", shape_from_placement: true })

hook after MR::isInWater(at: vec3) -> inside {          // the game asks this to decide swimming
    if not inside and lava.contains(at) { result = true }
}

var burn = 0
on frame {
    if let at = MR::getPlayerPos(), MR::isPlayerSwimming(), lava.contains(at) {
        burn += 1
        if burn % 120 == 0 { MarioAccess::getPlayerActor()?.decLife(1) }
    } else { burn = 0 }
}
```

`area.define` makes an area kind; with `shape_from_placement`, each placed area takes its box, cylinder or sphere from its placement row. The game decides whether a point is water by calling `MR::isInWater`; the `after` hook changes its answer (`result = true`) inside the lava areas, so the game's own swimming takes over. `MR::isInWater` has two forms, and `(at: vec3)` picks the one that takes only a position. Every two seconds of swimming in lava costs one health. The lava's look on its surface is the area's own model in the stage's content. See [LumaKit: area](lumakit/area.md).

## Ice breath

**Goal:** a form whose attack button breathes a cone of ice that freezes enemies.

```json luma.json
"options": [
  { "key": "breath_key", "kind": "key", "default": "b", "name": "Ice breath" }
]
```

```lumascript source/main.lum
use kit.player.form
use kit.projectile
use svc.input

option breath_key: input.Action

let breath = form.define(form.Form {
    id: "ice-breath"
    look: model "IceMario"
    item: none                                   // given by the mod's own flower, placed like any item
    on_action: breath_key                        // B, or the key bound in the Controls page
    on_act: blow
    timer_frames: 1200
})

fn blow(player: MarioActor) {
    var front = vec3(0, 0, 0)
    MR::getPlayerFrontVec(var front)
    for i in 0..5 {                              // a cone: five short-lived puffs
        let side = cross(front, player.mGravity) * ((i - 2) as f32 * 0.15)
        projectile.throw(projectile.Shot {
            look: none, trail: effect "IceBreath"
            from: player.mPosition + front * 60.0, velocity: (front + side) * 18.0
            life_frames: 25, bounces: 0
            on_hit: fn(h: projectile.Hit) -> projectile.Then {
                MR::sendMsgEnemyAttackFreeze(h.sensor, h.target)   // the game's own freeze message
                return projectile.Then.Burst
            }
        })
    }
}
```

A form's `on_action` names an action and `on_act` the function called once each time it's pressed while the form lasts; the form ends by itself after 1200 frames. Each press throws five invisible, short-lived projectiles with an ice trail, spread sideways (`cross(front, gravity)` is "to the side" wherever Mario stands) into a cone. A puff that hits sends the game's own freeze message, so enemies freeze as they would to the game's ice. Give the form with an item of your own, as [the Gold Flower](tutorials/a-new-power-up.md) does.

## Destructible terrain

**Goal:** a block that cracks with each spin and breaks on the third.

```lumascript source/main.lum
use kit.actor

class Crumble : LiveActor {
    var hits: int = 0
    override fn init(iter: TableIter) {
        initModelManagerWithAnm("Crumble", none, false)
        actor.add_collision(self, "Crumble")     // the model's own collision, from the glTF's collision mesh
        makeActorAppeared()
    }
    override fn receiveMsgPlayerAttack(msg: u32, other: HitSensor, mine: HitSensor) -> bool {
        if not MR::isMsgPlayerSpinAttack(msg) { return false }
        hits += 1
        MR::startAction(self, "Crack{hits}")     // its own clips: Crack1, Crack2
        if hits >= 3 {
            MR::invalidateCollisionParts(self)
            MR::emitEffect(self, "Break")
            kill()
        }
        return true
    }
}
```

A class derived from `LiveActor` is placed in stages by its name, `Crumble`. `actor.add_collision` gives it its model's collision mesh, so Mario can stand on it. Each spin plays the next crack animation (`Crack1`, `Crack2`, chosen by building the clip's name), and the third turns its collision off, plays the `Break` effect and removes it. See [A new galaxy](tutorials/a-new-galaxy.md) for classes in depth.

## Voice-acted dialogue

**Goal:** play a recorded voice line whenever the game shows a message that has one.

```lumascript source/main.lum
use svc.audio

let voice_play = audio.Play { volume: 1.0, pitch: 1.0, bus: 2, loop: 0 }   // bus 2: voice; once
var voice: audio.Voice? = none

hook after TalkMessageCtrl::startTalk() -> started {
    if not started { return }
    let id = self.getMessageID()                 // the message being shown
    if sound_named("voice/{id}") != none {       // content in layers/, one file per message id (optional)
        voice = audio.play("voice/{id}", voice_play, fn(e: audio.EndedEvent) { voice = none })
    }
}
hook after TalkMessageCtrl::endTalk() -> ended {
    if ended { if let v = voice { audio.voice_stop(v, 0); voice = none } }
}
```

In a hook on a member function, `self` is the game object it was called on: here the talk controller, which knows which message it shows. Each voice line is a sound of the mod named after its message, `layers/base/assets/voice/<id>.sound.json`. `sound_named` looks content up by a name made while running, and gives `none` when the mod has no such sound, so messages without a recording stay silent. The voice plays on the voice bus, which follows the player's Voices volume, and stops when the message closes. See [Audio](services/audio.md) and [Sound](content/sound.md).

## Karaoke lyrics on the staff roll

**Goal:** show song lyrics at the bottom of the screen in time with the staff roll.

```lumascript source/main.lum
use svc.draw
use svc.time

struct Line { at: f32, words: text }      // seconds from the staff roll's start
let lines: list<Line> = json.decode<list<Line>>(data "lyrics.json")!

var started: u64? = none                  // the world step the staff roll began
hook before GameScene::exeStaffRoll() { if started == none { started = time.now().step } }

on draw draw.Point.Overlay {             // a 2D drawing point
    guard let s = started else { return }
    let t = (time.now().step - s) as f32 / 60.0
    if let l = lines.filter(fn(l: Line) -> bool { return l.at <= t }).last() {
        draw.text(l.words, at: vec2(0.5, 0.88), align: draw.Align.Center, font: font "Lyrics", size: 36.0,
                  colour: #FFFFFF)
    }
}
```

`data "lyrics.json"` is a data file of the mod, read when the mod is built and checked to exist; `json.decode` turns it into a list of lines, and `!` says it must decode. The first time the staff roll runs, the hook notes the world step; world steps run 60 a second and stop while the game is paused, so the lyrics stay in time with the music. Each frame, `on draw` shows the last line whose time has come, in the mod's own font. See [Draw](services/draw.md) and [Screens and fonts](content/screens.md).

## A 3D minimap

**Goal:** a small map in the bottom-right corner, rendered live from above the player.

```lumascript source/main.lum
use kit.hud
use svc.draw

let map_view = draw.view(draw.View {
    camera: draw.ViewCamera.Above(of: fn() -> vec3 { return MR::getPlayerPos() ?? vec3(0, 0, 0) }, height: 6000.0, ortho_width: 8000.0)
    target: draw.Target.Texture(256, 256)
})
let panel = hud.picture(hud.Corner.BottomRight, map_view.texture(), size: vec2(200, 200))
```

`draw.view` makes a second view of the world. Its camera, `ViewCamera.Above`, looks straight down from 6000 units above a point it asks for each frame (the player's position, or the origin when there's no player), showing 8000 units across. Its `target` is a 256-by-256 texture instead of the screen, and `hud.picture` shows that texture in a corner at 200 by 200. See [LumaKit: hud](lumakit/hud.md).

## A custom title screen

**Goal:** your own pictures on the title screen. No code.

Replace the title screen's pictures with your own PNG files, each at the game's path of the picture it replaces, under `layers/base/files/LayoutData/Title.arc/` (with `.png` as its ending). The game cooks a picture source into its own texture format on the player's device. [`lumalink extract`](lumalink/extract.md) shows what the archive holds. See [Screens and fonts](content/screens.md) and [Content overview](content/overview.md).

> [!PLANNED]
> Moving the title screen's panes (the logo, the menu) by patching the game's layout by pane name, as `layers/base/patches/LayoutData/Title.arc/Title.brlyt.json`, is a later layer of screen content.

## See also

- [Hooking the game's functions](lumascript/hooks.md)
- [Lifecycle, options and frames](lumascript/events.md)
- [LumaKit overview](lumakit/overview.md)
- [Services overview](services/overview.md)
- [The tutorials](tutorials/moon-jump.md), from the beginning
