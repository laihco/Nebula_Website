---
title: 'LumaKit: actor'
nav_title: actor
description: A new kind of object in a few lines - look, sensors, ground and shadow, what defeats it and what it drops, talk and callbacks - plus helpers for the usual parts of your own classes.
order: 7
level: essential
---

`kit.actor` makes new kinds of objects for stages: an NPC, a balloon to pop, a screen, a simple enemy. You describe the kind (its model, idle animation, sensors, whether it stands on the ground, which of the player's attacks defeat it and what it drops) and stages place it by name like the game's own objects. When you write your own class derived from the game's instead, the module's helper functions give you the usual parts in one call each: a body, collision, walking toward the player, a shock wave, a hat on a joint.

## Example

From [Balloon World](tutorials/balloon-world.md): a balloon kind that pops when the player touches it, spawned in the middle of a stage.

```lumascript source/main.lum
use kit.actor

let balloon_kind = actor.define(actor.Kind {
    name: "LumaBalloon"
    look: model "Balloon"
    sensors: [actor.Sensor.Body(radius: 80.0)]
    on_touch_player: pop
    idle_action: "Float"
})

fn hide_balloon(at: vec3) -> ref<LiveActor> {
    return ref(balloon_kind.spawn(at: at))   // a mod's actor made mid-stage
}

fn pop(b: LiveActor) {
    MR::emitEffect(b, "Pop")                 // the balloon model's own effect
    b.kill()
}
```

An NPC you can talk to, from [A new NPC](tutorials/a-new-npc.md):

```lumascript
use kit.actor
use kit.talk

let keeper = actor.define(actor.Kind {
    name: "LumaKeeper"                       // placed in stages by name
    look: model "Keeper"
    idle_action: "Wait"
    sensors: [actor.Sensor.Body(radius: 70.0)]
    on_talk: chat                            // shows the A button prompt near it
})

fn chat(self: LiveActor) { start chat_task(ref(self)) }

task chat_task(k: ref<LiveActor>) {
    wait talk.say(k, text "Keeper.Hello")
}
```

The helpers in a class of your own, from [A new galaxy](tutorials/a-new-galaxy.md):

```lumascript
use kit.actor

class Spikeroll : LiveActor {
    var speed: f32 = 0.0
    override fn init(iter: TableIter) {
        initModelManagerWithAnm("Spikeroll", none, false)
        actor.add_body(self, radius: 90.0)   // sensor, ground binder, shadow and gravity in one call
        makeActorAppeared()
    }
}

states Rolling for Spikeroll {
    state Wait { update { if MR::isNearPlayer(self, 1200.0) { go Chase } } }
    state Chase {
        enter { MR::startAction(self, "Roll") }
        update {
            self.speed = min(self.speed + 0.2, 9.0)
            actor.move_toward_player(self, self.speed)   // along the surface, under gravity
            if not MR::isNearPlayer(self, 2000.0) { go Wait }
        }
    }
    start Wait
}
```

## Using it

Add LumaKit to your mod's `needs` in `luma.json` and `use` the module:

```json
"needs": [ { "id": "lumakit", "version": "^1" } ]
```

```lumascript
use kit.actor
```

Kinds are classes derived from the game's (by default `LiveActor`), set up with the game's own calls for sensors, shadows, actions and attack messages. Placement uses the stage content system, `spawn_game` uses the [assets service](services/assets.md) to load a game class's files, and names come from the [mods service](services/mods.md). The module needs no permission.

> [!PLANNED]
> Not every LumaKit call can be made from a mod yet; in particular `define` and `find` wait for classes defined from a script, so today you write your own class and use the helpers. See [What works today](lumakit/overview.md#what-works-today).

## Interface

```lumascript
pub struct Kind {
    name: text                                // the class name stages place it by
    base: text = "LiveActor"                  // a derivable game class
    look: model? = none
    idle_action: text? = none                 // started when it appears
    sensors: list<Sensor> = []
    on_ground: bool = true                    // bound to the ground and pulled by gravity
    shadow: bool = true
    collision: text? = none                   // the model's collision mesh as a moving collision part
    defeated_by: set<Attack> = []             // these attacks defeat it: its "Down" action, then drops
    drops: item.Gives? = none
    on_init: fn(LiveActor)? = none
    on_frame: fn(LiveActor)? = none
    on_touch_player: fn(LiveActor)? = none
    on_attacked: fn(LiveActor, Attack) -> bool = fn(a: LiveActor, k: Attack) -> bool { return false }
    on_talk: fn(LiveActor)? = none            // makes it talkable (the A button prompt), with kit.talk
}
pub enum Sensor { Body(radius: f32), Attack(radius: f32), Eye(radius: f32), Push(radius: f32) }
pub enum Attack { Spin, Trample, HipDrop, StarBit, Fire, Any }
pub struct KindId { fn spawn(self, at: vec3) -> LiveActor; fn all(self) -> list<ref<LiveActor>>; fn name(self) -> text }
pub struct PlacementKey { stage: text, zone: text, layer: text, index: u32 }
pub struct Attached { fn remove(self); fn alive(self) -> bool }
pub fn define(k: Kind) -> KindId
pub fn find(name: text) -> KindId?
pub fn add_body(a: LiveActor, radius: f32)    // body sensor, ground binder, shadow, gravity: for a mod's class
pub fn add_collision(a: LiveActor, name: text)
pub fn move_forward(a: LiveActor, speed: f32)                 // along the surface, under gravity
pub fn move_toward(a: LiveActor, at: vec3, speed: f32)
pub fn move_toward_player(a: LiveActor, speed: f32)
pub fn turn_toward(a: LiveActor, at: vec3, degrees_per_frame: f32)
pub fn sees_player(a: LiveActor, distance: f32, degrees: f32) -> bool
pub fn shockwave(a: LiveActor, radius: f32, effect: effect, speed: f32 = 20.0, height: f32 = 60.0)
pub fn attach(to: LiveActor, look: model, joint: text, offset: mat34? = none) -> Attached
pub fn placement(a: LiveActor) -> PlacementKey?          // stable across machines with the same mods
pub fn find_placed(key: PlacementKey) -> LiveActor?
pub fn spawn_game(name: text, at: vec3) -> LiveActor?     // a game class by name, its files loaded first
```

## Functions

### Kinds

| Name                   | Description                                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `define(k)`            | Defines a kind for your mod and returns its `KindId`. Stages can then place it by `name`.                                             |
| `find(name)`           | The kind your mod defined in `kit/actor/<name>.json`, or `none`.                                                                      |
| `spawn_game(name, at)` | Makes one of the game's own classes by name at `at`, loading its files first, even if the stage did not load it. `none` if it cannot. |

### KindId

| Name        | Description                                                                                        |
| ----------- | -------------------------------------------------------------------------------------------------- |
| `spawn(at)` | Makes one of this kind in the stage now, at `at`.                                                  |
| `all()`     | Every actor of this kind now in the stage, as `ref`s: read each with `if let a = r.get() { ... }`. |
| `name()`    | The kind's name.                                                                                   |

### Helpers for your own classes

| Name                                          | Description                                                                                                                                                                                                 |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `add_body(a, radius)`                         | Gives `a` a body sensor of `radius`, binds it to the ground, adds a shadow and makes gravity pull it, in one call. Use it in `init`.                                                                        |
| `add_collision(a, name)`                      | Makes the collision mesh `name` of the actor's model a moving collision part, so the player can stand on it.                                                                                                |
| `move_forward(a, speed)`                      | Moves `a` forward along the surface, under gravity, at `speed` units per frame.                                                                                                                             |
| `move_toward(a, at, speed)`                   | Moves `a` toward the point `at`.                                                                                                                                                                            |
| `move_toward_player(a, speed)`                | Moves `a` toward the player, along the surface, under gravity.                                                                                                                                              |
| `turn_toward(a, at, degrees_per_frame)`       | Turns `a` to face `at`, at most `degrees_per_frame` each frame.                                                                                                                                             |
| `sees_player(a, distance, degrees)`           | `true` when `a` can see the player: within `distance`, and within `degrees` of the way `a` faces. `false` when there is no player.                                                                          |
| `shockwave(a, radius, effect, speed, height)` | Sends a shock wave out from `a`, a ring the player must jump, reaching `radius` and drawn with `effect`. `speed` (default `20.0`) and `height` (default `60.0`) set how fast it spreads and how high it is. |
| `attach(to, look, joint, offset)`             | Puts the model `look` on the joint `joint` of `to` (a hat on Mario's head, or on a Goomba's), with an optional `offset`. Returns an `Attached` handle; `remove()` takes it off.                             |

### Placement keys

| Name               | Description                                                                                                                                                                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `placement(a)`     | A key naming a placed actor by its stage, zone, layer and index in the placement list, or `none` for an actor that was not placed (one spawned by code). The key is the same on every machine with the same mods, so online mods can name an object to each other. |
| `find_placed(key)` | The actor a key names, or `none`.                                                                                                                                                                                                                                  |

## Types

### Kind

| Field             | Description                                                                                                                              |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `name`            | The name stages place it by. Unique within your mod; the game knows it as `<mod id>/<name>`.                                             |
| `base`            | The game class it derives from. Default `"LiveActor"`.                                                                                   |
| `look`            | Its model, or `none`.                                                                                                                    |
| `idle_action`     | An animation started when it appears.                                                                                                    |
| `sensors`         | Its hit sensors (see `Sensor`).                                                                                                          |
| `on_ground`       | Bound to the ground and pulled by gravity. Default `true`.                                                                               |
| `shadow`          | Casts a shadow. Default `true`.                                                                                                          |
| `collision`       | A collision mesh of the model to use as a moving collision part.                                                                         |
| `defeated_by`     | The player's attacks that defeat it. A defeated actor plays its `Down` animation, then gives `drops`.                                    |
| `drops`           | What a defeated actor gives, as an [`item.Gives`](lumakit/item.md): `Coins`, `StarBits`, `Lives`, `Health` or `Carry`.                   |
| `on_init`         | Called when it is made.                                                                                                                  |
| `on_frame`        | Called each frame.                                                                                                                       |
| `on_touch_player` | Called when the player touches it (from the actor's attack sensor).                                                                      |
| `on_attacked`     | Called when one of the player's attacks reaches it; return `true` if it took the hit. Default: returns `false`.                          |
| `on_talk`         | Makes it talkable: the A button prompt appears near it, and this is called when the player talks. Use [talk](lumakit/talk.md) inside it. |

### Sensor

| Case             | Description                                                   |
| ---------------- | ------------------------------------------------------------- |
| `Body(radius)`   | Its body sensor: what the player touches (`on_touch_player`). |
| `Attack(radius)` | An attack sensor.                                             |
| `Eye(radius)`    | An eye sensor.                                                |
| `Push(radius)`   | A push sensor.                                                |

Each is one of the game's own hit sensor kinds, a sphere of `radius` around the actor.

### Attack

The player's attacks, as the game tells them apart (`MR::isMsgPlayerSpinAttack` to `MR::isMsgFireBallAttack`): `Spin`, `Trample` (a stomp), `HipDrop` (a ground pound), `StarBit`, `Fire`, and `Any`.

### PlacementKey

`stage`, `zone`, `layer` and `index`: where a placed actor is in the stage's placement lists.

## Data files

A kind without code can be written as `kit/actor/<name>.json`, with every field of `Kind` except the callbacks. `drops` takes the same case names as `item.Gives`. Declare the data format in `luma.json` with `"kit": { "lumakit.actor": 1 }`, and look the kind up in code with `find`.

## Behaviour and edge cases

- **Names.** Two mods may each define a kind called `LumaBalloon`; the game knows them as `<mod id>/LumaBalloon`. A stage places the short name only from its own mod's layers; other stages use the full name.
- **Drops.** `drops` must be `Coins`, `StarBits`, `Lives`, `Health` or `Carry`. `Form` or `Call` is refused when you call `define`: `kit.actor.define: drops is Form; it must be Coins, StarBits, Lives, Health or Carry`.
- **Views and refs.** `spawn` and `find_placed` give a view, valid for now. To keep an actor across frames, keep a `ref` (as `all()` gives you).
- **Your mod switched off.** Actors of your kinds are removed with the game's own `kill`, and attached models are taken off. A stage that places a kind no mod defines any more does not make it: the stage loads without it, and the log names the kind, the stage and the mod.

## See also

- [talk](lumakit/talk.md): dialogue for `on_talk`
- [item](lumakit/item.md): `Gives`
- [cutscene](lumakit/cutscene.md)
- [Classes derived from the game's](lumascript/classes.md)
- [Tasks, states and wait](lumascript/tasks.md)
- [Tutorial: Balloon World](tutorials/balloon-world.md)
- [Tutorial: a new NPC](tutorials/a-new-npc.md)
