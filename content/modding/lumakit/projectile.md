---
title: 'LumaKit: projectile'
nav_title: projectile
description: Things thrown or shot - with a look, speed, gravity, bounces, a lifetime, a trail, a burst, sounds and a callback that decides what each hit does.
order: 6
level: intermediate
---

`kit.projectile` throws or shoots things: a fireball that bounces, a puff of ice breath, a coin flicked at an enemy. You describe one shot (where it starts, its velocity, whether gravity pulls it, how many times it bounces, how long it lives, its trail and burst effects) and the module moves it, finds what it hits and asks your callback what to do.

## Example

From the [Gold Flower tutorial](tutorials/a-new-power-up.md): a ball that bounces three times, and defeats an enemy with fire when it hits one.

```lumascript source/main.lum
use kit.projectile

fn throw_ball(player: MarioActor) {
    var front = vec3(0, 0, 0)
    MR::getPlayerFrontVec(var front)
    let up = player.mGravity * -1.0
    projectile.throw(projectile.Shot {
        look: model "GoldBall"
        from: player.mPosition + front * 80.0 + up * 60.0
        velocity: front * 35.0                // game units per frame
        bounces: 3
        life_frames: 180
        trail: effect "GoldBallTrail"
        burst: effect "GoldBallBurst"
        sound_throw: sound "ThrowGold"
        on_hit: hit
    })
}

fn hit(shot: projectile.Hit) -> projectile.Then {
    if not MR::sendMsgEnemyAttackFire(shot.sensor, shot.target) {
        return projectile.Then.Bounce         // a wall, or something fire does not hurt
    }
    MR::appearCoinPop(shot.target.mHost, shot.target.mHost.mPosition, 3)
    return projectile.Then.Burst
}
```

A shot with no model, only its trail, from the ice breath recipe:

```lumascript
projectile.throw(projectile.Shot {
    look: none, trail: effect "IceBreath"
    from: player.mPosition + front * 60.0, velocity: front * 18.0
    life_frames: 25, bounces: 0
    on_hit: fn(h: projectile.Hit) -> projectile.Then {
        MR::sendMsgEnemyAttackFreeze(h.sensor, h.target)   // the game's own freeze message
        return projectile.Then.Burst
    }
})
```

## Using it

Add LumaKit to your mod's `needs` in `luma.json` and `use` the module:

```json
"needs": [ { "id": "lumakit", "version": "^1" } ]
```

```lumascript
use kit.projectile
```

Shots are game actors derived from `LiveActor`. The module uses the game's own hit sensors, map collision and gravity, and effect and sound content. It needs no permission.

> [!PLANNED]
> Not every LumaKit call can be made from a mod yet. See [What works today](lumakit/overview.md#what-works-today).

## Interface

```lumascript
pub struct Shot {
    look: model? = none                       // none: only its trail
    from: vec3
    velocity: vec3                            // game units per frame
    falls: bool = false                       // pulled by gravity
    bounces: u32 = 0
    life_frames: u32 = 180
    radius: f32 = 30.0
    trail: effect? = none
    burst: effect? = none
    sound_throw: sound? = none
    sound_hit: sound? = none
    hits_map: bool = true
    on_hit: fn(Hit) -> Then = fn(h: Hit) -> Then { return Then.Burst }
}
pub struct Hit { sensor: HitSensor; target: HitSensor; at: vec3; map: bool }   // views, valid in the call
pub enum Then { Bounce, Burst, Pass, Stick }
pub fn throw(s: Shot) -> ref<LiveActor>
```

## Functions

| Name       | Description                                                                                                                                                                         |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `throw(s)` | Starts the shot `s` and returns a `ref` to it, which goes empty when the shot is gone. Keep the refs if you want to limit how many shots are out at once (check `empty()` on each). |

## Types

### Shot

| Field                      | Description                                                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `look`                     | Its model. `none` draws only its trail.                                                                             |
| `from`                     | Where it starts.                                                                                                    |
| `velocity`                 | Its direction and speed, in game units per frame.                                                                   |
| `falls`                    | Pulled by gravity, along the gravity of the place it flies through (so it curves around a planet). Default `false`. |
| `bounces`                  | How many times it bounces before it bursts. Default `0`.                                                            |
| `life_frames`              | How long it lives, in frames. Default `180` (3 seconds).                                                            |
| `radius`                   | The size of its hit sensor. Default `30.0`.                                                                         |
| `trail`, `burst`           | Effects kept on it while it flies, and played where it bursts.                                                      |
| `sound_throw`, `sound_hit` | Sounds played when it is thrown and when it hits.                                                                   |
| `hits_map`                 | Collides with the stage's ground and walls. Default `true`.                                                         |
| `on_hit`                   | Called at each hit; returns what the shot does next. By default it bursts.                                          |

### Hit

What `on_hit` is given. `sensor` and `target` are views of the game's hit sensors and are valid only during the call: copy what you need, or take a `ref` of the target's actor (`ref(h.target.mHost)`).

| Field    | Description                                                                          |
| -------- | ------------------------------------------------------------------------------------ |
| `sensor` | The shot's own hit sensor. Pass it to the game's attack messages, as in the example. |
| `target` | The hit sensor it touched. `target.mHost` is the actor.                              |
| `at`     | Where the hit happened.                                                              |
| `map`    | `true` when it hit the stage itself rather than an actor.                            |

### Then

| Case     | The shot                              |
| -------- | ------------------------------------- |
| `Bounce` | bounces off                           |
| `Burst`  | bursts (plays `burst`) and is removed |
| `Pass`   | flies on through                      |
| `Stick`  | stops and stays where it hit          |

## Behaviour and edge cases

- **When `on_hit` runs.** During the game's hit check, on the game thread. Only call the game's message functions with the `Hit` it gives you there; do not keep the views.
- **Many shots.** The module is designed for dozens of shots at once (64 within one frame's budget).
- **Your mod switched off.** All of your mod's shots are removed at once.

## See also

- [player.form](lumakit/player-form.md): `on_spin` and `on_act`, where shots are usually thrown
- [pointer](lumakit/pointer.md): what B throws
- [actor](lumakit/actor.md)
- [Effects](content/effects.md) and [Sound](content/sound.md)
- [The game in scope](lumascript/game-objects.md): views and `ref`
