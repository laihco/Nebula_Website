---
title: Classes derived from the game's
nav_title: Classes
description: Make new kinds of game objects by deriving from the game's classes - add fields, override virtual functions, place them in stages by name, and know what happens to their objects.
order: 8
level: intermediate
---

A `class` in LumaScript is a new kind of game object, derived from one of the game's own classes such as `LiveActor`.
The game's factory makes it, stages place it by its name like any of the game's objects, and you override the virtual
functions you want to change. This page shows how to declare one and what the game does with it.

## Example

```lumascript source/main.lum
class GoldBall : LiveActor {
    var age: int = 0
    override fn init(iter: TableIter) {
        initModelManagerWithAnm("GoldBall", none, false)
        makeActorAppeared()
    }
    override fn control() {
        age += 1
        if age > 300 { kill() }
    }
}
```

A stage that places `GoldBall` now gets one of these: it shows the mod's `GoldBall` model and disappears after 300
frames.

A fuller one, an enemy defeated by a spin or a ground pound:

```lumascript
class Spikeroll : LiveActor {
    var speed: f32 = 0.0
    override fn init(iter: TableIter) {
        initModelManagerWithAnm("Spikeroll", none, false)
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

## Declaring a class

```lumascript
class Name : GameClass {
    var field: Type = default      // the class's own data
    let other = value
    override fn virtualName(...) { }
    fn helper(self) { }            // a function of the class
    hook before GameClass::f() { } // a hook for this class's objects only
}
```

- The base is any game class the game's description lists as derivable (a class with virtual functions that starts
  with `NameObj`). Anything else is a build error.
- The name is how stages and the factory find the class. It may not be a game class's name, a name the factory
  already makes, or another mod's live class.

## Fields

Fields declared in the class are your mod's own, stored beside the game's object. The base's fields and functions are
reached by name as on any game object, with or without `self.`:

```lumascript
override fn control() {
    age += 1                       // the class's own field
    self.mVelocity = vec3(0, 1, 0) // the base's field
}
```

Fields start with the defaults you write (the data beneath them is zero-filled first). A field cannot
hold a view of a game object (error S0103); keep a `ref<C>` instead.

## Overriding virtual functions

`override` replaces one of the base's virtual functions for this class only. Only virtuals the game's description
lists can be overridden; anything else is a build error naming it.

When the name has a single virtual in the base, you may leave out the parameter types; they are the virtual's:

```lumascript
override fn receiveMsgPlayerAttack(msg, other, mine) -> bool {
    return false
}
```

Call the base's own version with `base.f()`. Without it, the base's code for that function does not run:

```lumascript
override fn control() {
    base.control()                 // the game's LiveActor::control first
    age += 1
}
```

Other mods' hooks on that function still run for your objects: an override is itself a hook limited to the class.

## Hooks in a class

A hook written inside a class applies to that class's objects only; the compiler adds the test that the object is one
of yours. It must be on a member function of the base, directly or through the base's own bases (error S0115).

```lumascript
class Crumble : LiveActor {
    var hits: int = 0
    hook after LiveActor::makeActorDead() {
        log "a Crumble was defeated after {hits} hits"
    }
}
```

## Placing objects

A class can be placed in a stage by its name, like a game class: write `GoldBall` as the object's name in your
stage's placement. See [Stages](content/stages.md). To make objects from code, use LumaKit's
[actor module](lumakit/actor.md).

If a stage places a class name that no mod made (a typo, or a mod that is off), a placeholder stands in its place and
the mod log says so. See [References](lumascript/references.md).

## State machines

A class may have state machines, one per object, stored with its fields. A machine runs from the class's `control`
by default:

```lumascript
states Rolling for Spikeroll {
    state Wait { update { if MR::isNearPlayer(self, 1200.0) { go Chase } } }
    state Chase {
        enter { MR::startAction(self, "Roll") }
        update { if not MR::isNearPlayer(self, 2000.0) { go Wait } }
    }
    start Wait
}
```

See [Tasks, states and wait](lumascript/tasks.md).

## What the game does with your class

- **When the mod starts**, the class is defined and the mod log gets a line of the form
  `class <name>: from <base> (made by the factory's <maker>), <n> bytes of its own, <k> overrides`.
- **When a stage makes an object** of the class, the factory makes a base object, the game gives it your class's
  data, and your overrides apply to it. If the factory makes something other than the base, the objects stay the
  game's own and the mod log says so once.
- **When an object is destroyed**, its data is freed with it. When a scene ends, all its objects' data goes.
- **When your mod is turned off or taken out**, its classes end and their objects become plain base objects again:
  they keep running the base's code. The mod log says
  `its <n> classes ended; their <m> objects are the game's own now`.

A class costs nothing until a mod defines one. After that, each overridden function costs one table read per call,
and only for the class's own objects.

## Limits

- A class derives from a game class, never from another mod class.
- At most 1024 classes can be defined in one session; a class's name is at most 63 bytes.
- A virtual function that comes from a second base class of the base (one not at its start) cannot be overridden
  yet.
- There is no inheritance between your own structs: `class` is only for deriving from the game.

## See also

- [The game in scope](lumascript/game-objects.md)
- [Hooks](lumascript/hooks.md)
- [Tasks, states and wait](lumascript/tasks.md)
- [LumaKit: actor](lumakit/actor.md)
- [A new NPC tutorial](tutorials/a-new-npc.md)
- [A new galaxy tutorial](tutorials/a-new-galaxy.md)
