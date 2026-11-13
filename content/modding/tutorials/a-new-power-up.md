---
title: 'Tutorial: a new power-up, the Gold Flower'
nav_title: A new power-up
description: Make a flower that turns Mario gold; a spin throws gold balls that bounce, defeat enemies with a flash and drop coins.
order: 5
level: intermediate
---

This tutorial makes a complete power-up: the Gold Flower. You'll define a new player _form_ with its own look and aura, an _item_ that gives it, and a _projectile_ that Mario throws with a spin. It brings together most of what a gameplay mod does: LumaKit modules, callbacks, the game's own messages, handles kept across frames, a task and options.

> [!PLANNED]
> This tutorial uses the LumaKit modules `player.form`, `item` and `projectile`, which are written but not yet part of the LumaKit library you can install, so the code builds once they are. The `draw` service's tint calls (Step 7) may still change before release; see [Draw](services/draw.md).

## What you'll build

- A **Gold Flower** item, placeable in any stage by name. It floats and turns like the game's power-ups.
- Picking it up turns Mario **gold**: a gold model on Mario's own skeleton, a gold material and a glowing aura.
- While gold, a **spin throws a gold ball** forward. It bounces up to three times and lasts three seconds.
- A ball that hits an enemy **defeats it** with a gold flash, and it drops three coins.
- **Taking damage ends the form.**
- Two options on the Mods screen: how many balls may be out at once, and how long the flash lasts.

## What you'll learn

- How `form.define` makes a power-up form, and how `on_spin` gives it a move.
- How `item.define` makes a pick-up that gives the form.
- How `projectile.throw` makes a thrown object, and how its `on_hit` callback decides what happens on each hit.
- How to send the game's own attack message (`MR::sendMsgEnemyAttackFire`) so enemies react as they would to fire.
- How to keep objects across frames as `ref` handles, and clean up the ones that are gone.
- How a task (`flash`) runs an effect over several frames.
- How `number` options become `int` values in code.

## Before you start

- Finish [A new NPC](tutorials/a-new-npc.md). It explains `needs`, `use kit.<module>`, callbacks, tasks and handles.
- You need content: a gold Mario model made for Mario's skeleton, a flower model, a ball model, four effects and two sounds. See [Models](content/models.md), [Animation](content/animation.md), [Effects](content/effects.md) and [Sound](content/sound.md).

## The mod's folder

```text
gold-flower/
  luma.json
  source/
    main.lum
  layers/
    base/
      assets/
        GoldMario.glb           gold Mario, bound to Mario's skeleton
        GoldFlower.glb          the item
        GoldBall.glb            the thrown ball
        effects.json            GoldAura, GoldFlowerShine, GoldBallTrail, GoldBallBurst
        GetGold.sound.json      with its .wav or .ogg beside it
        ThrowGold.sound.json    with its .wav or .ogg beside it
```

- **Models.** Each `.glb` is cooked into the game's model format on the player's device. A glTF metre is 100 game units, so make the ball and the flower to the size you want in the game. `GoldMario` is a _character_ model: it's bound to Mario's skeleton, so it moves with Mario's own animations. LumaLink's [`add`](lumalink/add.md) command adds and binds a character model.
- **Material.** The gold look is a real material on the model. See [Materials](content/materials.md).
- **Effects.** All of a layer's effects are described in one `effects.json`. See [Effects](content/effects.md).
- **Sounds.** Each `.sound.json` describes one sound effect and names its source file. See [Sound](content/sound.md).

## Step 1: luma.json

```json luma.json
{
  "format": "1.0",
  "id": "gold-flower",
  "version": "1.0.0",
  "name": "Gold Flower",
  "summary": "Gold Mario throws gold balls; enemies they hit turn to coins.",
  "authors": ["you"],
  "game": { "id": "RMG" },
  "options": [
    {
      "key": "balls_at_once",
      "kind": "number",
      "min": 1,
      "max": 4,
      "default": 2,
      "name": "Gold balls at once"
    },
    {
      "key": "flash_frames",
      "kind": "number",
      "min": 5,
      "max": 60,
      "default": 20,
      "name": "Flash length (frames)"
    }
  ],
  "needs": [{ "id": "lumakit", "version": "^1" }]
}
```

- Two `number` options. Their `default`, `min` and `max` are whole numbers, so code reads them as `int`. With a fraction in any of them, they'd be `f32`.
- `needs` lists LumaKit, which every `use kit.<module>` requires.

## Step 2: the declarations

```lumascript source/main.lum
use kit.player.form
use kit.item
use kit.projectile
use svc.draw

option balls_at_once: int
option flash_frames: int

let BALL_SPEED = 35.0          // game units per frame
let BALL_LIFE: u32 = 180       // frames
```

- Three LumaKit modules and one service. `kit.player.form` is used as `form` (the last part of its name).
- `option balls_at_once: int` and `option flash_frames: int` read the two options. The compiler checks each name against `luma.json` and that `int` fits its values. They always hold the player's current choice.
- Module-level `let`s are the way to name constants. The compiler folds a constant one into the code.

## Step 3: the gold form

```lumascript
pub let gold = form.define(form.Form {
    id: "gold"
    look: model "GoldMario"                  // bound to Mario's skeleton (LumaLink add character)
    aura: effect "GoldAura"                  // kept on the player while the form lasts
    ends_on_damage: true
    on_spin: throw_ball
})
```

`form.define` takes a `form.Form` and gives back a `FormId`. A form is everything a power-up changes about the player while it lasts:

| Field            | What it does here                                                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `id`             | The form's name in your mod. To the game it's `gold-flower/gold`.                                                              |
| `look`           | The model the player wears while the form lasts, bound to the player's skeleton. With `none`, the player keeps their own look. |
| `aura`           | An effect kept on the player for as long as the form lasts.                                                                    |
| `ends_on_damage` | Taking damage ends the form and the player is back to normal.                                                                  |
| `on_spin`        | A function called once each time the player spins in this form.                                                                |

`pub` makes `gold` visible to other modules of your mod and to mods that use it. `form.Form` has many more fields (a timer, the game's form meter, music, scale, see-through, physics); see [LumaKit: player.form](lumakit/player-form.md).

> [!NOTE]
> Only one form can be on the player at a time. If two mods give a form, the newest holds; when it ends, the earlier one holds again. If your mod is switched off while Mario is gold, he's back to normal, with no crash.

## Step 4: the flower

```lumascript
let flower = item.define(item.Item {
    id: "GoldFlower"                         // placeable in a stage by this name, and given by code
    look: model "GoldFlower"
    shine: effect "GoldFlowerShine"
    sound_get: sound "GetGold"
    gives: item.Gives.Form(gold)
})
```

`item.define` makes a thing to pick up. The flower shows its model with a shine effect, plays `GetGold` when picked up, and `gives` the gold form: `item.Gives.Form(gold)`. Items float and turn like the game's power-ups by default.

Place it in a stage by the name `GoldFlower`, just as [A new NPC](tutorials/a-new-npc.md#step-5-place-the-keeper-in-a-stage) places the Keeper. Code can also make one with `flower.spawn(at)` or give it straight to the player with `flower.give()`. See [LumaKit: item](lumakit/item.md).

## Step 5: throwing a ball

```lumascript
var balls: list<ref<LiveActor>> = []

fn throw_ball(player: MarioActor) {
    balls = balls.filter(fn(b: ref<LiveActor>) -> bool { return b.get() != none })
    if balls.len() >= balls_at_once { return }
    var front = vec3(0, 0, 0)
    MR::getPlayerFrontVec(var front)
    let up = player.mGravity * -1.0
    let ball = projectile.throw(projectile.Shot {
        look: model "GoldBall"
        from: player.mPosition + front * 80.0 + up * 60.0
        velocity: front * BALL_SPEED
        bounces: 3
        life_frames: BALL_LIFE
        trail: effect "GoldBallTrail"
        burst: effect "GoldBallBurst"
        sound_throw: sound "ThrowGold"
        on_hit: hit
    })
    balls.push(ball)
}
```

LumaKit calls `throw_ball` at each spin, with the player.

**Counting the balls in flight.** `balls` is the mod's state: a module `var` that lives as long as the mod is on. It holds a handle (`ref<LiveActor>`) for each ball thrown, because a view can't be kept past the frame. A ball that has burst or run out of time is gone, and its handle is empty (`b.get() == none`). So first `filter` keeps only the handles of balls still flying, then, if there are already `balls_at_once` of them, the spin throws nothing.

**Which way is forward.** `MR::getPlayerFrontVec(var front)` is the game's own function. It writes the player's facing direction into `front`: `var front` passes the variable so the function can fill it. `player.mGravity * -1.0` is "up" for wherever Mario stands, as in [Moon jump](tutorials/moon-jump.md).

**The shot.** `projectile.throw` takes a `projectile.Shot` and gives back a `ref<LiveActor>` to the new ball:

| Field            | Value here                                                                             |
| ---------------- | -------------------------------------------------------------------------------------- |
| `look`           | The ball model.                                                                        |
| `from`           | Where it starts: 80 units in front of Mario and 60 up, so it doesn't start inside him. |
| `velocity`       | Game units per frame: forward at `BALL_SPEED`.                                         |
| `bounces`        | It may bounce three times.                                                             |
| `life_frames`    | It lasts 180 frames (three seconds at 60 frames a second) unless it bursts sooner.     |
| `trail`, `burst` | The effect it leaves behind, and the effect when it bursts.                            |
| `sound_throw`    | Played as it's thrown.                                                                 |
| `on_hit`         | Called each time it hits something, to decide what happens.                            |

A shot flies straight by default; `falls: true` would pull it down with gravity. See [LumaKit: projectile](lumakit/projectile.md).

## Step 6: what a hit does

```lumascript
fn hit(shot: projectile.Hit) -> projectile.Then {
    if not MR::sendMsgEnemyAttackFire(shot.sensor, shot.target) {
        return projectile.Then.Bounce                     // a wall, or something that is not hurt by fire
    }
    guard let enemy = shot.target.mHost else { return projectile.Then.Burst }
    start flash(ref(enemy))
    MR::appearCoinPop(enemy, enemy.mPosition, 3)
    return projectile.Then.Burst
}
```

`on_hit` gets a `projectile.Hit`: the ball's own hit sensor (`sensor`), the sensor it touched (`target`), where (`at`), and whether it was the map (`map`). The sensors are views, valid during the call. The function answers with a `projectile.Then`: `Bounce`, `Burst`, `Pass` (fly on through) or `Stick`.

- **Attack the way the game does.** `MR::sendMsgEnemyAttackFire(from, to)` sends the game's own fire-attack message from the ball's sensor to the target's. An enemy that is hurt by fire takes it and the call returns true. A wall, or anything that isn't hurt by fire, doesn't, and the ball bounces.
- **The enemy itself.** A sensor's `mHost` is the object it belongs to. It's a pointer field of a game object, so it may be `none`; `guard let` takes it, or bursts the ball if there's none.
- **Flash and coins.** `start flash(ref(enemy))` starts the flash task (next step) with a handle to the enemy. `MR::appearCoinPop(enemy, enemy.mPosition, 3)` is the game's own coin pop: three coins burst out where the enemy was.
- Returning `Burst` ends the ball with its burst effect.

## Step 7: the gold flash

```lumascript
task flash(e: ref<LiveActor>) {
    for f in 0..flash_frames {
        let fade = 1.0 - f as f32 / flash_frames as f32
        if let a = e.get() { draw.tint(a, multiply: #FFFFFF, add: #FFD700 * fade) } else { stop }
        wait 1 frames
    }
    if let a = e.get() { draw.untint(a) }
}
```

The flash fades out over `flash_frames` frames, so it's a task that waits one frame between steps.

- `fade` goes from 1 down towards 0. `as f32` turns the counts into floats before dividing.
- Each frame the task takes the enemy from its handle. If the enemy is gone (it was defeated and removed), `stop` ends the task.
- `draw.tint(a, multiply:, add:)` tints the object's drawing: `multiply` by white leaves its colours as they are, and `add` adds gold (`#FFD700`) scaled by `fade`, so the glow dims each frame.
- After the loop, `draw.untint(a)` puts its colours back, if it's still there.

## Check, build, pack and try

```sh
lumalink check gold-flower
lumalink build gold-flower
lumalink pack gold-flower
```

See [Check, build, pack and run](start/workflow.md) for the options these commands take and the faster edit loop with `lumalink run`.

`check` cooks and checks every model, effect and sound, and the build checks every content name in the code, so a missing `effect "GoldAura"` is an error before you ever start the game. Install LumaKit and `gold-flower.luma`, switch both on, and go to the stage where you placed a `GoldFlower`. Pick it up, spin near an enemy, and try the two options on the Mods screen.

## The complete file

```lumascript source/main.lum
use kit.player.form
use kit.item
use kit.projectile
use svc.draw

option balls_at_once: int
option flash_frames: int

let BALL_SPEED = 35.0          // game units per frame
let BALL_LIFE: u32 = 180       // frames

pub let gold = form.define(form.Form {
    id: "gold"
    look: model "GoldMario"                  // bound to Mario's skeleton (LumaLink add character)
    aura: effect "GoldAura"                  // kept on the player while the form lasts
    ends_on_damage: true
    on_spin: throw_ball
})

let flower = item.define(item.Item {
    id: "GoldFlower"                         // placeable in a stage by this name, and given by code
    look: model "GoldFlower"
    shine: effect "GoldFlowerShine"
    sound_get: sound "GetGold"
    gives: item.Gives.Form(gold)
})

var balls: list<ref<LiveActor>> = []

fn throw_ball(player: MarioActor) {
    balls = balls.filter(fn(b: ref<LiveActor>) -> bool { return b.get() != none })
    if balls.len() >= balls_at_once { return }
    var front = vec3(0, 0, 0)
    MR::getPlayerFrontVec(var front)
    let up = player.mGravity * -1.0
    let ball = projectile.throw(projectile.Shot {
        look: model "GoldBall"
        from: player.mPosition + front * 80.0 + up * 60.0
        velocity: front * BALL_SPEED
        bounces: 3
        life_frames: BALL_LIFE
        trail: effect "GoldBallTrail"
        burst: effect "GoldBallBurst"
        sound_throw: sound "ThrowGold"
        on_hit: hit
    })
    balls.push(ball)
}

fn hit(shot: projectile.Hit) -> projectile.Then {
    if not MR::sendMsgEnemyAttackFire(shot.sensor, shot.target) {
        return projectile.Then.Bounce                     // a wall, or something that is not hurt by fire
    }
    guard let enemy = shot.target.mHost else { return projectile.Then.Burst }
    start flash(ref(enemy))
    MR::appearCoinPop(enemy, enemy.mPosition, 3)
    return projectile.Then.Burst
}

task flash(e: ref<LiveActor>) {
    for f in 0..flash_frames {
        let fade = 1.0 - f as f32 / flash_frames as f32
        if let a = e.get() { draw.tint(a, multiply: #FFFFFF, add: #FFD700 * fade) } else { stop }
        wait 1 frames
    }
    if let a = e.get() { draw.untint(a) }
}
```

## Ideas to extend it

- **A time limit.** Give the form `timer_frames: 1200` and `meter: true`: it ends after 20 seconds, with the time left shown in the game's own form meter.
- **Its own music.** `music: sound "GoldTheme"` plays over the stage's music while the form lasts, as the game's own forms do.
- **A different look for Luigi.** `look_luigi: model "GoldLuigi"` is used when the player is Luigi.
- **Something to do when it ends.** `on_end: fn(MarioActor, form.Ended)` is called with why it ended: `Timer`, `Damage`, `Replaced`, `Ended` or `ModStopped`.
- **The flower in a bubble.** `container: item.Container.Bubble` (or `Crystal`) puts the item inside one, as the game does with some power-ups.
- **A breath attack instead of a ball.** The ice-breath recipe in [Recipes](tutorials/recipes.md) uses `on_action` and `on_act` to bind a form's move to a button.

## See also

- [LumaKit: player.form](lumakit/player-form.md), [item](lumakit/item.md) and [projectile](lumakit/projectile.md)
- [Hooking the game's functions](lumascript/hooks.md) and [Tasks, states and wait](lumascript/tasks.md)
- [Lifecycle, options and frames](lumascript/events.md)
- [Models](content/models.md), [Effects](content/effects.md) and [Sound](content/sound.md)
