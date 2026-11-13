---
title: The game in scope
nav_title: The game in scope
description: Call the game's functions, read and write its objects' fields, keep objects with handles, and handle the game's null pointers, enums, globals and nerves - all by their own names.
order: 7
level: intermediate
---

Every function, field, class, enum and global the game describes is in scope in your mod by its own name. Nothing is
imported by hand: the compiler checks each use against the game's [description of itself](lumascript/game-description.md)
and writes the mod's import list from what you use. This page shows how to call the game, how game objects appear in
LumaScript (views and handles), and what happens where the game may give nothing.

## Example

```lumascript
// Goombas near the player hop.
hook after Kuribo::exeWander() {
    guard let p = MarioAccess::getPlayerActor() else { return }   // there may be no player
    if length(p.mPosition - self.mPosition) < 500.0 {
        self.mVelocity = vec3(0, 10, 0)                           // a field of the game's object
    }
}

on frame {
    var front = vec3(0, 0, 0)
    MR::getPlayerFrontVec(var front)                              // the game writes front
    let stage = MR::getCurrentStageName()                         // text
    let scenario = MR::getCurrentScenarioNo()
}
```

## Calling the game's functions

Call any function by its qualified name: `MR::getPlayerPos()`, `GameDataFunction::setGameEventValue("Name", 3)`.
Game functions take positional arguments only (the game's description may not name its parameters).

### Overloads

When one name has several signatures, the call's arguments choose:

1. the signatures that can take the arguments (none: error S0058, listing them);
2. among those, the ones each argument fits **as it is**: an integer literal fits `i32` (`s32`) exactly and a float
   literal fits `f32` exactly, so `pick(1)` with `pick(s32)` and `pick(u32)` calls `pick(s32)`;
3. among those, the one whose `const` matches the view: the const member on a const view, the other otherwise.

More than one left is error S0059, naming them. Then name the one you mean in backquotes:

```lumascript
MR::startAction(self, "Walk")                                     // chosen by its arguments
let near = `MR::isNear(const LiveActor *, const Vec3f &, f32)`(self, at, 300.0)
```

### Members and statics

A member function is called on an object: `actor.appear()`. Inside a class or hook of that class you may also call
it on `self` by its full name, `LiveActor::appear()`, or with no prefix at all, `appear()`. Calling a member function
any other way is error S0100. A static or free function takes no object.

## Views

A value of a game class type (`MarioActor`, `Kuribo`, `LiveActor`) is a **view**: it reaches the object's fields and
functions by their names, base classes' members included, as in C++.

```lumascript
hook after TalkMessageCtrl::startTalk() -> started {
    let id = self.getMessageID()                  // a member function through the view
}

hook before MarioActor::control() {
    self.mVelocity = self.mVelocity * 0.5         // a field, read and written
}
```

`self` in a hook on a member function, or in a [class](lumascript/classes.md), is a view of the object and is never
`none`. There, the class's own members may be written without `self.`: `kill()`, `makeActorAppeared()`.

### A view lasts one statement

A view is valid only while the code that received it runs: a hook's body, or the statement holding a game call's
result. The compiler refuses to keep one anywhere it could outlive that, naming the line (error S0103):

| Place                                                    | Why not                        |
| -------------------------------------------------------- | ------------------------------ |
| a module `let` or `var`                                  | lives for the mod's whole life |
| a field of a struct, an enum case or a class             | the struct may be kept         |
| a task's parameter                                       | a task runs on later frames    |
| a closure that may run later                             | the object may be gone by then |
| a local of a state's body read in its `update` or `exit` | those run on later frames      |

The rule follows the type through `?`, tuples, lists, sets and maps. A local list of views lives as long as a local
view, so it is allowed. A local view read after a `wait` is error S0104 (see [Tasks](lumascript/tasks.md)).

A plain game struct (one with no virtual functions, passed by value) read through a view is your own **copy**, not a
view: `let b = a.mBox` copies it, and so does `let b = a?.mBox` (a `Box?`). To give the game its own object, pass the
field directly: `MR::useBox(a.mBox)`. Passing your copy where the game takes a record by pointer or reference is
error S0098.

## Handles: keeping an object

To keep an object past the statement, take a **handle** with `ref(...)`. A `ref<C>` names the object and becomes
empty when it is gone. `get()` gives a view, or `none`:

```lumascript
var target: ref<Kuribo>? = none

hook after Kuribo::exeWander() { target = ref(self) }

on frame {
    if let k = target?.get() {                    // nothing when it is gone
        k.mVelocity = vec3(0, 10, 0)
    }
}
```

- `h.get()` gives `C?`. An empty handle is `h.get() == none`.
- `h!.get()` on a handle known not to be empty is a script error if it is ("the handle to Kuribo is empty").
- A handle learns that its object is gone both when the object is destroyed one by one and when a whole stage is
  released: a `ref<Kuribo>` kept in a module `var` across a stage change gives `none`.
- `ref<C>` takes only a class derived from `NameObj` (or one the game's description gives a lifetime); anything else
  is a build error naming it.
- Handles cost nothing while a mod holds none.

Handles are what you put in module variables, struct fields, lists, closures and task parameters.

## When the game may give nothing

C++ pointers can be null. LumaScript makes that visible in the types, so you cannot forget to check:

- Every pointer or reference the game **gives** you (a function's result, a pointer field read from an object) is
  `T?`, unless the game's description marks it never null. `const char *` is `text?`.
- A pointer **parameter** takes a `T`, not a `T?`, unless the description marks it may-be-null. Passing `none` or a
  `T?` to a `T` parameter is a build error naming the function and parameter: "test it first (`if let`) or give a
  value".
- `self` in a hook or class is never `none`. A `var x` argument is never null.

```lumascript
if let p = MarioAccess::getPlayerActor() {        // MarioActor?
    MR::tryRumblePadWeak(p, 0)                    // takes a MarioActor: p is tested
}
initModelManagerWithAnm("Crumble", none, false)   // this parameter may be null, so none is allowed
```

The description marks these from evidence in the game's code: a parameter the function tests for null, or passes on
only to such a parameter; a C++ reference `T &`; or a hand-kept list with a reason for each row. For example
`MR::getCurrentStageName()` never gives null, so it is plain `text`.

### Functions that need the player

Some functions read through another result without testing it. `MR::getPlayerPos()` is the player actor's position,
and with no player it would read a wild address. The description marks such a function as **needing** the other one
(`needs MarioAccess::getPlayerActor`), and the call tests it first:

- A function with a `T?` result gives `none`: `MR::getPlayerPos()` is a `vec3?`.
- A function with no result or a value result is not called, and you get a script error naming the need
  (S0912, "needs player, which is none now, so it was not called").

The player functions are the first so marked: `getPlayerPos`, `getPlayerCenterPos`, `getPlayerRotate`,
`getPlayerShadowRotate`, `getPlayerGravity`, `getPlayerUp/Front/SideVec`, `getPlayerGroundPos`,
`getPlayerHitRadius` and `isPlayerInAreaObj`.

```lumascript
guard let here = MR::getPlayerPos() else { return }
```

## Out parameters

When the game writes through a pointer or a non-const reference you pass, write `var` before your variable:

```lumascript
var front = vec3(0, 0, 0)
MR::getPlayerFrontVec(var front)                  // the game writes front

var g = vec3(0, -1, 0)
MR::calcGravityVector(self, var g)
```

A pointer to a number, vector or enum crosses only when the game's description says what the function does with it
(reads it, writes it, or both). Otherwise the call is refused at build time. See
[Types across the boundary](lumascript/interop-types.md).

## Writing to the game

You can write to a game field, global or array element that is not `const`, through a view that is not `const`:

```lumascript
self.mVelocity = vec3(0, 0, 0)
```

Writing anything else (a `const` field, a `const` global, through a `const` view) is error S0064, which says why.

## Globals and constant data

The game's statics are written as the game names them: `GameSystem::sInstance`. A `const` global is read only.

Constant game data in code (for example `Mario::kReactionDecay`) is read by name anywhere. You change it only in an
`on load` handler, before the stage that uses it loads (see [Lifecycle](lumascript/events.md)).

## The game's enums

With a game enum `Mode` that has a value `Walk`:

```lumascript
let m = Mode::Walk                                // in an expression: with ::
let s = MarioStatus_Swim                          // an unscoped enum's value alone, at global scope
match m {
    Mode.Walk => log "walking"                    // in a pattern: dotted
    else => log "other"
}
let n = m as int                                  // and back: n as Mode
```

- A value is written `Mode::Walk` in an expression; an unscoped enum's value also by its name alone.
- In a `match` arm it is written dotted, `Mode.Walk`. A missing value is error S0068, naming them. Two names for one
  value are one case.
- `as` converts a game enum to an integer and back. A value of an unnamed enum is an `int`.
- Message numbers are enums too: `ACTMES_SPIN_ATTACK`.

## Nerves by name

A game class's steps (its nerves) are named `nerve "Class.Step"`. That is the game's `const Nerve *` for the step,
usable wherever a game function takes one:

```lumascript
fn to_lv2(boss: NerveExecutor) {
    boss.setNerve(nerve "DinoPackunVs1.BattleLv2")
}

fn in_lv2(boss: NerveExecutor) -> bool {
    return same(boss.getCurrentNerve(), nerve "DinoPackunVs1.BattleLv2")
}
```

Each name is checked when building against the class's list of nerves; a name not listed is a build error naming the
class and its nerves. A nerve cannot be named by text made while running: when you need to choose one, `match` over
the steps the class has.

## Comparing objects

Views cannot be compared with `==`. Use `same(a, b)`: true when both are the same object (either may be `T?`). It
also compares your class's object with a view of its base, and a nerve with the game's `const Nerve *`.

```lumascript
fn is_player(a: LiveActor) -> bool {
    if let me = MarioAccess::getPlayerActor() { return same(a, me) }
    return false
}
```

## Virtual functions

A call through a view to a function the game marks `virtual` is a virtual call, as in C++: the object's own class's
version runs. In an override, `base.f()` calls the base class's version itself, without dispatch, as a qualified call
does in C++ (see [Classes](lumascript/classes.md)).

> [!PLANNED]
> A checked downcast, `as_class<T>(view)` giving `T?` (a view of the object as `T`, or `none`), is planned as the
> one way to test a view's own class. An upcast is implicit.

## Game versions

The compiler checks every game name you use against the description of each game version that `luma.json`'s
`nebula` range names. A name missing in any of them is a build error naming the version. When the mod loads, every
game name is bound by name, the whole list or nothing: a mod is never half bound.

A name that exists only in newer versions can be written `optional MR::foo`; it is then `none` on versions without
it, and your code tests it.

## See also

- [Hooks](lumascript/hooks.md)
- [Classes derived from the game's](lumascript/classes.md)
- [Types across the boundary](lumascript/interop-types.md)
- [Memory and lifetimes](lumascript/memory.md)
- [The game's description of itself](lumascript/game-description.md)
