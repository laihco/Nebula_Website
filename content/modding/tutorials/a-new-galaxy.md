---
title: 'Tutorial: a new galaxy with its own enemy, boss, cutscene and music'
nav_title: A new galaxy
description: Register a new galaxy in the observatory, write an enemy and a three-hit boss as classes with state machines, and stage the boss's entrance as a cutscene.
order: 10
level: advanced
---

This is the biggest tutorial: a whole new galaxy. The stage itself (its planets, collision, objects, cameras, gravity, lights and sky) is _content_, built in modelling tools and described as data. The code is everything that behaves: the galaxy's place in the observatory, a new enemy, a boss with phases and a health meter, the boss's entrance and exit as cutscenes, and its music.

> [!PLANNED]
> Several parts of this tutorial are not built yet:
>
> - a whole new stage as content (its collision, zones, gravity, cameras, lights and sky), described in [Stages](content/stages.md);
> - music: `audio.play_music` and `audio.stop_music` (Steps 6 and 7) are not in `audio` 1.0, which plays sound effects and streams; see [Audio](services/audio.md);
> - the LumaKit modules `stage`, `actor`, `cutscene` and `hud` are written but not yet all callable from a mod; see [What works today](lumakit/overview.md#what-works-today).
>
> The classes, state machines and hooks into the game's messages below are the language as it is.

## What you'll build

- **The Nebula Galaxy**, listed in the Kitchen dome of the observatory once the player has 20 stars, with two stars and its own music.
- **Spikeroll**, a spiked orb that waits until Mario comes near, rolls after him, slows down when he gets away, hurts him on contact, and bursts into coins when he spins into it or ground-pounds it.
- **Orb King**, a boss that greets Mario in a cutscene, shows a three-point health meter, slams the ground to send out a shockwave, and is dizzy for three seconds after each slam. Only a ground pound while it's dizzy hurts it. After three hits it's defeated in a closing cutscene and a star appears.

## What you'll learn

- How `stage.define_galaxy` adds a galaxy with its dome, unlock rule, stars and music.
- How to write a class derived from the game's `LiveActor`, and override its virtual functions (`init`, `attackSensor`, `receiveMsgPlayerAttack`).
- How the game's hit messages work: sensors, `MR::sendMsgEnemyAttack`, `MR::isMsgPlayerSpinAttack`, `MR::isMsgPlayerHipDrop`.
- How a `states` machine gives each object its own behaviour, with `enter`, `update`, `wait` and `go`.
- How `is_state` lets the class ask which state its machine is in.
- How `cutscene.play` stages a scene of camera shots and lines, and is waited on.

## Before you start

- Finish [A new power-up](tutorials/a-new-power-up.md) (LumaKit, the game's messages) and [the ghost time trial](tutorials/ghost-time-trial.md) (tasks, handles).
- Read [Classes derived from the game's](lumascript/classes.md) and [Tasks, states and wait](lumascript/tasks.md).

## The mod's folder

```text
nebula-galaxy/
  luma.json
  source/
    main.lum
  layers/
    base/
      assets/
        Spikeroll.glb       with its clip "Roll" and its effect "Burst"
        OrbKing.glb         with its clips "Slam", "Dizzy" and "Hurt" and its effect "Hit"
        effects.json        Shockwave
      ...                   the stage LumaNebulaGalaxy and the music streams (see the note above)
```

The stage places the enemy and the boss by their class names, `Spikeroll` and `OrbKing`, as it places any of the game's objects. The galaxy's name, star titles and the boss's lines (`Galaxy.Name`, `Star1`, `Star2`, `Boss.Name`, `Boss.Greeting`) are text rows of the mod.

## Step 1: luma.json

```json luma.json
{
  "format": "1.0",
  "id": "you.nebula-galaxy",
  "version": "1.0.0",
  "name": "The Nebula Galaxy",
  "summary": "A new galaxy with its own enemy, a boss and music.",
  "authors": ["you"],
  "game": { "id": "RMG" },
  "needs": [{ "id": "lumakit", "version": "^1" }]
}
```

## Step 2: register the galaxy

```lumascript source/main.lum
use kit.stage
use kit.actor
use kit.cutscene
use kit.hud
use svc.audio

let galaxy = stage.define_galaxy(stage.Galaxy {
    name: "LumaNebulaGalaxy"                  // the stage folder in layers/
    title: text "Galaxy.Name"
    dome: stage.Dome.Kitchen                  // which observatory dome lists it
    unlock: stage.Unlock.Stars(20)
    stars: [ stage.Star { scenario: 1, title: text "Star1" },
             stage.Star { scenario: 2, title: text "Star2", comet: none } ]
    music: sound "NebulaTheme"                // a stream (OGG) in layers/
})
```

`stage.define_galaxy` takes a `stage.Galaxy` and gives a `GalaxyId`:

| Field    | Here                                                                                                                                                                         |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`   | The stage, by its folder in your layers.                                                                                                                                     |
| `title`  | What the galaxy is called on screen, a text row.                                                                                                                             |
| `dome`   | Which observatory dome lists it: `Terrace`, `Fountain`, `Kitchen`, `Bedroom`, `Engine`, `Garden`, or a dome of a mod.                                                        |
| `unlock` | When it appears: `Always`, after a number of `Stars(n)`, after a particular `Star(galaxy, scenario)`, or when a function of yours says so (`Code`).                          |
| `stars`  | Its scenarios. Each `stage.Star` has a number and a title; `comet` makes it a comet star (`Speedy`, `Daredevil`, `Cosmic`, `FastFoe`, `Purple`), and `none` is a normal one. |
| `music`  | The galaxy's music.                                                                                                                                                          |

The galaxy's stars are got and counted like the game's own. See [LumaKit: stage](lumakit/stage.md).

## Step 3: the enemy as a class

```lumascript
// The enemy: a spiked orb that rolls toward the player and is defeated by a spin or a stomp.
class Spikeroll : LiveActor {
    var speed: f32 = 0.0
    override fn init(iter: TableIter) {
        initModelManagerWithAnm("Spikeroll", none, false)  // the mod's model, placed by name in the stage JSON
        actor.add_body(self, radius: 90.0)                   // kit.actor: sensor + binder + shadow in one call
        makeActorAppeared()
    }
    override fn attackSensor(mine: HitSensor, other: HitSensor) {
        if MR::isSensorPlayer(other) { MR::sendMsgEnemyAttack(other, mine) }
    }
    override fn receiveMsgPlayerAttack(msg: u32, other: HitSensor, mine: HitSensor) -> bool {
        if MR::isMsgPlayerSpinAttack(msg) or MR::isMsgPlayerHipDrop(msg) {
            MR::emitEffect(self, "Burst")
            MR::appearCoinPop(self, self.mPosition, 2)
            kill()
            return true
        }
        return false
    }
}
```

`class Spikeroll : LiveActor` derives a new class from the game's `LiveActor`, the base of the game's actors. The game's factory makes it, so a stage places it by its name, `Spikeroll`, like one of the game's own. `var speed` is a field of the mod's, stored with each Spikeroll.

`override fn` replaces one of the base's virtual functions for this class only:

- **`init`** runs when the stage makes the object. `initModelManagerWithAnm` is the game's own `LiveActor` function: it loads the model `Spikeroll` and its animations (the second argument may be `none`). `actor.add_body(self, radius:)` is a LumaKit helper that adds, in one call, what a normal enemy needs: a body sensor, binding to the ground, a shadow and gravity. `makeActorAppeared` shows it.
- **`attackSensor`** is called by the game when this object's sensor touches another. If the other sensor is the player's, `MR::sendMsgEnemyAttack(other, mine)` sends the game's own "an enemy hit you" message: Mario takes damage exactly as from any enemy.
- **`receiveMsgPlayerAttack`** is called when the player attacks it. `MR::isMsgPlayerSpinAttack` and `MR::isMsgPlayerHipDrop` tell which attack the message is. On a spin or a ground pound it plays its `Burst` effect, pops two coins and `kill`s itself, and returns `true` (the attack was taken). Any other attack returns `false`, so it does nothing.

Calls like `kill()` and `makeActorAppeared()` are members of the base, reached by name inside the class.

## Step 4: the enemy's behaviour, as a state machine

```lumascript
states Rolling for Spikeroll {
    state Wait { update { if MR::isNearPlayer(self, 1200.0) { go Chase } } }
    state Chase {
        enter { MR::startAction(self, "Roll") }
        update {
            self.speed = min(self.speed + 0.2, 9.0)
            actor.move_toward_player(self, self.speed)       // along the surface, under gravity
            if not MR::isNearPlayer(self, 2000.0) { go Slow }
        }
    }
    state Slow {
        update { self.speed *= 0.9; actor.move_forward(self, self.speed); if self.speed < 0.1 { go Wait } }
    }
    start Wait
}
```

`states Rolling for Spikeroll` gives every Spikeroll its own machine, stored with its fields and run from the class's own update each frame. Each `state` may have an `enter` block (run once on entering it), an `update` block (run every frame while in it) and an `exit` block; `go` jumps to another state; `start` names the first one.

- **Wait**: each frame, if Mario is within 1200 units (`MR::isNearPlayer`), go to Chase.
- **Chase**: on entering, start the `Roll` animation. Each frame, speed up by 0.2 to at most 9, and roll toward the player with `actor.move_toward_player`, which moves along the surface under gravity, so it follows Mario round a planet. If he's more than 2000 units away, go to Slow.
- **Slow**: lose 10% of its speed each frame, rolling on forward with `actor.move_forward`, and go back to Wait once it has nearly stopped.

The gap between 1200 and 2000 matters: an enemy that started and stopped chasing at the same distance would flicker between states at the edge.

## Step 5: the boss as a class

```lumascript
// The boss: three hits, a health meter, a phase change, its own music.
class OrbKing : LiveActor {
    var health: int = 3
    var meter: hud.Meter? = none
    override fn init(iter: TableIter) {
        initModelManagerWithAnm("OrbKing", none, false)
        actor.add_body(self, radius: 300.0)
        makeActorAppeared()
    }
    override fn receiveMsgPlayerAttack(msg: u32, other: HitSensor, mine: HitSensor) -> bool {
        if not MR::isMsgPlayerHipDrop(msg) or not is_state(OrbKingStates.Dizzy) { return false }
        health -= 1
        meter?.set(health)
        go OrbKingStates.Hurt
        return true
    }
}
```

The boss keeps its health and a handle to its HUD meter as fields. It's hurt only by a ground pound, and only while dizzy:

- `is_state(OrbKingStates.Dizzy)` is true while this boss's machine `OrbKingStates` is in the state `Dizzy`.
- On a hit, `health` drops by one, the meter shows it (`meter?.set` does nothing if there's no meter yet), and `go OrbKingStates.Hurt` switches the machine to `Hurt`. From inside the class (not the machine), the state is named with its machine: `OrbKingStates.Hurt`.

## Step 6: the boss's phases, and its entrance

```lumascript
states OrbKingStates for OrbKing {
    state Intro {
        enter {
            wait cutscene.play(cutscene.Scene {                 // kit.cutscene: shots, lines, a wait for the player
                shots: [ cutscene.Shot.Look(at: ref(self), from_offset: vec3(0, 400, 900), frames: 120),
                         cutscene.Shot.Line(speaker: ref(self), line: text "Boss.Greeting") ]
                letterbox: true
            })
            self.meter = hud.meter(hud.Corner.Top, max: 3, label: text "Boss.Name")
            audio.play_music(sound "BossTheme")
            go Attack
        }
    }
    state Attack {
        enter { MR::startAction(self, "Slam") }
        wait 90 frames
        actor.shockwave(self, radius: 1500.0, effect: effect "Shockwave")   // a ring the player must jump
        go Dizzy
    }
    state Dizzy { enter { MR::startAction(self, "Dizzy") } wait 180 frames; go Attack }
    state Hurt {
        enter { MR::startAction(self, "Hurt"); MR::emitEffect(self, "Hit") }
        wait 60 frames
        if self.health <= 0 { go Defeated } else { go Attack }
    }
```

**Intro: the cutscene.** `cutscene.play` takes a `cutscene.Scene`, a list of shots, and returns a pending result: `wait` holds the state until the scene ends (or the player skips it). The shots here:

- `Shot.Look(at:, from_offset:, frames:)`: the camera looks at the boss from 400 up and 900 back, for 120 frames.
- `Shot.Line(speaker:, line:)`: the boss says its greeting in the game's balloon.

A scene keeps handles, not views, so the boss is given as `ref(self)`. `letterbox: true` adds the black bars. After the scene, the boss puts its health meter at the top of the screen with `hud.meter` (a maximum of 3, labelled with the boss's name), starts its music, and goes to `Attack`.

**Attack, Dizzy, Hurt: the fight's loop.** A state's body runs from top to bottom and may `wait`, like a task:

- **Attack** starts the `Slam` animation, waits 90 frames for it to land, then sends out a shockwave with `actor.shockwave`: a ring that spreads out to a radius of 1500 units, which the player must jump over. Then it's dizzy.
- **Dizzy** plays `Dizzy` for 180 frames (three seconds), then attacks again. This is the window for a ground pound.
- **Hurt** plays `Hurt` and the `Hit` effect, waits a second, then goes on attacking, or to `Defeated` once health reaches 0.

## Step 7: defeat

```lumascript
    state Defeated {
        enter {
            self.meter?.remove()
            wait cutscene.play(cutscene.Scene { shots: [cutscene.Shot.Look(at: ref(self), from_offset: vec3(0, 200, 700),
                                                                              frames: 90)] })
            audio.stop_music(fade_frames: 60)
            stage.appear_star(self.mPosition, scenario: 1)
            kill()
        }
    }
    start Intro
}
```

The meter comes off the screen, a short closing shot looks at the boss for 90 frames, the music fades out over 60 frames, and `stage.appear_star` makes the galaxy's first star appear where the boss stood. Then the boss is gone.

A state's own object (`self`) lives with the machine, so it's safe to read `self.mPosition` after the `wait`, unlike a view in a task.

## Check, build, pack and try

```sh
lumalink check nebula-galaxy
lumalink build nebula-galaxy
lumalink pack nebula-galaxy
```

See [Check, build, pack and run](start/workflow.md) for the options. Once the planned parts are in, install LumaKit and the mod, collect 20 stars, and look for the Nebula Galaxy in the Kitchen dome.

## The complete file

```lumascript source/main.lum
use kit.stage
use kit.actor
use kit.cutscene
use kit.hud
use svc.audio

let galaxy = stage.define_galaxy(stage.Galaxy {
    name: "LumaNebulaGalaxy"                  // the stage folder in layers/
    title: text "Galaxy.Name"
    dome: stage.Dome.Kitchen                  // which observatory dome lists it
    unlock: stage.Unlock.Stars(20)
    stars: [ stage.Star { scenario: 1, title: text "Star1" },
             stage.Star { scenario: 2, title: text "Star2", comet: none } ]
    music: sound "NebulaTheme"                // a stream (OGG) in layers/
})

// The enemy: a spiked orb that rolls toward the player and is defeated by a spin or a stomp.
class Spikeroll : LiveActor {
    var speed: f32 = 0.0
    override fn init(iter: TableIter) {
        initModelManagerWithAnm("Spikeroll", none, false)  // the mod's model, placed by name in the stage JSON
        actor.add_body(self, radius: 90.0)                   // kit.actor: sensor + binder + shadow in one call
        makeActorAppeared()
    }
    override fn attackSensor(mine: HitSensor, other: HitSensor) {
        if MR::isSensorPlayer(other) { MR::sendMsgEnemyAttack(other, mine) }
    }
    override fn receiveMsgPlayerAttack(msg: u32, other: HitSensor, mine: HitSensor) -> bool {
        if MR::isMsgPlayerSpinAttack(msg) or MR::isMsgPlayerHipDrop(msg) {
            MR::emitEffect(self, "Burst")
            MR::appearCoinPop(self, self.mPosition, 2)
            kill()
            return true
        }
        return false
    }
}

states Rolling for Spikeroll {
    state Wait { update { if MR::isNearPlayer(self, 1200.0) { go Chase } } }
    state Chase {
        enter { MR::startAction(self, "Roll") }
        update {
            self.speed = min(self.speed + 0.2, 9.0)
            actor.move_toward_player(self, self.speed)       // along the surface, under gravity
            if not MR::isNearPlayer(self, 2000.0) { go Slow }
        }
    }
    state Slow {
        update { self.speed *= 0.9; actor.move_forward(self, self.speed); if self.speed < 0.1 { go Wait } }
    }
    start Wait
}

// The boss: three hits, a health meter, a phase change, its own music.
class OrbKing : LiveActor {
    var health: int = 3
    var meter: hud.Meter? = none
    override fn init(iter: TableIter) {
        initModelManagerWithAnm("OrbKing", none, false)
        actor.add_body(self, radius: 300.0)
        makeActorAppeared()
    }
    override fn receiveMsgPlayerAttack(msg: u32, other: HitSensor, mine: HitSensor) -> bool {
        if not MR::isMsgPlayerHipDrop(msg) or not is_state(OrbKingStates.Dizzy) { return false }
        health -= 1
        meter?.set(health)
        go OrbKingStates.Hurt
        return true
    }
}

states OrbKingStates for OrbKing {
    state Intro {
        enter {
            wait cutscene.play(cutscene.Scene {                 // kit.cutscene: shots, lines, a wait for the player
                shots: [ cutscene.Shot.Look(at: ref(self), from_offset: vec3(0, 400, 900), frames: 120),
                         cutscene.Shot.Line(speaker: ref(self), line: text "Boss.Greeting") ]
                letterbox: true
            })
            self.meter = hud.meter(hud.Corner.Top, max: 3, label: text "Boss.Name")
            audio.play_music(sound "BossTheme")
            go Attack
        }
    }
    state Attack {
        enter { MR::startAction(self, "Slam") }
        wait 90 frames
        actor.shockwave(self, radius: 1500.0, effect: effect "Shockwave")   // a ring the player must jump
        go Dizzy
    }
    state Dizzy { enter { MR::startAction(self, "Dizzy") } wait 180 frames; go Attack }
    state Hurt {
        enter { MR::startAction(self, "Hurt"); MR::emitEffect(self, "Hit") }
        wait 60 frames
        if self.health <= 0 { go Defeated } else { go Attack }
    }
    state Defeated {
        enter {
            self.meter?.remove()
            wait cutscene.play(cutscene.Scene { shots: [cutscene.Shot.Look(at: ref(self), from_offset: vec3(0, 200, 700),
                                                                              frames: 90)] })
            audio.stop_music(fade_frames: 60)
            stage.appear_star(self.mPosition, scenario: 1)
            kill()
        }
    }
    start Intro
}
```

## Ideas to extend it

- **A comet star.** Give the second star `comet: stage.Comet.Speedy` (or `Daredevil`, `Cosmic`, `FastFoe`, `Purple`).
- **Defeated by more attacks.** Spikeroll could also give way to a star bit or a fireball: LumaKit's `actor.Attack` names `Spin`, `Trample`, `HipDrop`, `StarBit` and `Fire`, and a simpler enemy can be a `kit.actor` kind with `defeated_by` and `drops` instead of a class.
- **Let the boss see Mario.** `actor.sees_player(a, distance, degrees)` and `actor.turn_toward(a, at, degrees_per_frame)` give it eyes, for an attack aimed at the player.
- **Warp there.** `galaxy.go(scenario)` takes the player straight to a star of your galaxy.

## See also

- [LumaKit: stage](lumakit/stage.md), [actor](lumakit/actor.md), [cutscene](lumakit/cutscene.md) and [hud](lumakit/hud.md)
- [Classes derived from the game's](lumascript/classes.md)
- [Tasks, states and wait](lumascript/tasks.md)
- [Stages](content/stages.md), [Models](content/models.md) and [Animation](content/animation.md)
- [Audio](services/audio.md)
