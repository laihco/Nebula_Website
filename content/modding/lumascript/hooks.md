---
title: Hooking the game's functions
nav_title: Hooks
description: Run your code before, after, around or instead of any of the game's functions - skip calls, change arguments and results, and know exactly what happens when two mods hook one function.
order: 5
level: essential
---

Hooks are how a mod changes what the game does. A hook names one of the game's functions and runs your code each
time the game calls it: before it, after it, around it, or instead of it. This page shows each kind, how to name the
function, and the rules that keep several mods' hooks working together.

## The four kinds

```lumascript
hook before MarioActor::control() {
    if frozen { skip }                        // a void function: skip it
}

hook after MR::getStarPieceNum() -> n {       // the result, named
    result = n * 2                            // changes what the caller receives
}

wrap MR::addStarPiece(num) {                  // the arguments, named; may be written
    num *= 2
    proceed()                                 // the next wrap, then the game's own code
}

replace Kuribo::exeWander() {                 // one mod only
    self.mVelocity = vec3(0, 0, 0)
}
```

| Kind          | Runs                    | May                                                                       | Must                                                  |
| ------------- | ----------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------- |
| `hook before` | before the function     | `skip` the call                                                           | give a result with `skip` when the function has one   |
| `hook after`  | after the function      | read and change `result`                                                  |                                                       |
| `wrap`        | around the function     | change arguments, call `proceed()` at most once per path, change `result` | give a result on every path when the function has one |
| `replace`     | instead of the function | give `result`                                                             | give a result on every path when the function has one |

`self` is the object the function was called on (the C++ `this`), for member functions.

## before: look first, maybe skip

A `before` hook runs before the game's function. `skip` stops the call: the game's function does not run.

```lumascript
option hide: bool

// Every counter the HUD brings in, and the coin counter: skip them when the option is on.
hook before CounterLayoutController::appear() { if hide { skip } }
hook before CoinCounter::appear() { if hide { skip } }
```

For a function that returns a value, `skip` must give one, so a skipped call always has a result. Write the result's
type after `->` in the head:

```lumascript
hook before `MR::isNear(const LiveActor *, const Vec3f &, f32)`(actor, at, dist) -> bool {
    if dist < 0.0 { skip false }              // the caller receives false
}
```

| Code  | When                                             |
| ----- | ------------------------------------------------ |
| S0117 | `skip` outside a `before` hook's own body        |
| S0118 | the function returns nothing: write `skip` alone |
| S0119 | the function returns a value: write `skip value` |

## after: read and change the result

An `after` hook runs once the game's function has returned. `-> name` names the result for the body, and writing
`result` changes what the caller receives:

```lumascript
// Rumble the pad when Mario takes a hit.
hook after Mario::checkDamage() -> hit {
    if hit, let p = MarioAccess::getPlayerActor() { MR::tryRumblePadStrong(p, 0) }
}

// Spin and the Star Pointer from the very start of a file.
hook after GameScene::start() {
    MR::onGameEventFlagEnableToSpinAndStarPointer()
}
```

A function that returns nothing has no result to name (S0116). `result` may be used only in an `after`, `wrap` or
`replace` hook's own body, never inside a closure in it (S0120).

### Results that are pointers to vectors

Some game functions return a pointer or reference to a vector (`Vec3f *`, `const TVec3f &`), such as
`MR::getPlayerPos`. You read it as a `vec3` copy, and you may write `result`:

```lumascript
hook after MR::getPlayerPos() -> p {
    if let here = p { result = here + vec3(0, 100, 0) }
}
```

The value you write is kept in one slot that belongs to the hook, and the caller receives a pointer to that slot. It
stays valid until the hook runs again, so a caller that keeps the pointer across a second call sees the newer value.
The compiler warns on every such hook, naming the function.

## wrap: run around the function

A `wrap` runs around the call. Its named arguments are places you may change before the game sees them, and
`proceed()` runs the rest of the call: the next mod's wrap, and then the game's own function.

```lumascript
option factor: int

// Hard mode: Mario loses `factor` times as much health.
wrap MarioActor::decLife(amount) {
    amount = low_bits<u16>(amount as u32 * factor as u32)   // keep 16 bits on purpose
    proceed()
}
```

Rules, each checked when building:

- `proceed()` is allowed only in a `wrap`'s own body (S0121).
- It runs at most once on any path, counting a loop's next round (S0122).
- For a function with a result, every path gives one, by `proceed()` or by `result = value`, at the body's end and
  at each `return` (S0123). A path that never proceeds must set `result`.
- Reading `result` before `proceed()` or before writing it is S0124.

```lumascript
wrap MR::getStarPieceNum() {
    if cheat_on {
        result = 999                          // this path does not proceed: the game's code is not run
    } else {
        proceed()
        result = result + 1                   // after proceed(), result holds the game's answer
    }
}
```

Only an `after` hook names its result with `-> name`. In a `before` hook, `-> T` gives the result's type; in a
`wrap` or `replace`, read and write `result` directly.

## replace: run instead of the function

A `replace` runs in place of the game's function and never proceeds. Only **one** mod may replace a given function:
a second is refused when mods load, naming both.

```lumascript
replace Kuribo::exeWander() {
    self.mVelocity = vec3(0, 0, 0)            // Goombas stand still
}
```

A `replace` of a function with a result must give it on every path ("a replace must give a result on every path").
Prefer `wrap` when you only need to change part of the behaviour: wraps from several mods can all apply.

## Naming the function

The function is named `Class::name` (or `Namespace::name`), or by its exact signature in backquotes. You may follow
either with its parameters:

| Head                                                                                 | Chooses                                                  |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| `hook before Mario::tryJump()`                                                       | the function by name and parameter count                 |
| `wrap MR::addStarPiece(num)`                                                         | names its one parameter `num`                            |
| `hook after MR::isInWater(at: vec3) -> inside`                                       | the overload whose parameters fit these LumaScript types |
| ``hook before `MR::isNear(const LiveActor *, const Vec3f &, f32)`(actor, at, dist)`` | exactly this signature                                   |

When a name has several overloads, the hook's row is chosen by, in order: a quoted signature, the number of
parameters written, and their written types (matched as a call's arguments are). If none or more than one is left,
the build error lists every signature.

```lumascript
// MR::isInWater has two overloads; the one taking only a position is chosen by its parameter list.
hook after MR::isInWater(at: vec3) -> inside {
    if not inside and at.y < lava_level { result = true }
}
```

| Code  | When                                                        |
| ----- | ----------------------------------------------------------- |
| S0047 | no function of that name is known in the game's description |
| S0112 | no overload of that name takes that many parameters         |

In the head, parameters are names, each with an optional type. A `var` or a default value there is an error.

### Parameter types

The parameters take the types the function receives:

- numbers, vectors, enums and game structs by value, as for a call;
- a pointer to a number, vector or enum is `T?`: the place it points at, or `none` for null;
- a `const T &` parameter is read, never written (writing it is a build error);
- other pointers and references to game objects are views (see [The game in scope](lumascript/game-objects.md)).

A parameter written with a type must have that type. Writing to a value parameter changes the copy the function
receives; writing to a `T &` parameter changes the caller's object.

### self

`self` is the object for a member function, a constructor and a destructor. A free or static function has none. In a
hook on a member function you may use the class's own members without `self.`: `kill()`, `makeActorAppeared()`.

## Constructors and destructors

Constructors and destructors take `before` and `after` hooks only:

```lumascript
hook after Kuribo::Kuribo(name) { log "a Goomba was made" }
hook before Kuribo::~Kuribo() { log "a Goomba is going" }
```

`self` in a constructor's `before` (the object is not built yet) or a destructor's `after` (it is gone) is error
S0128. A `wrap` or `replace` on them, or on a function the game only reports, is S0113.

## Every override of a virtual

`every override of` hooks a virtual function and every override of it that the game describes, so you reach every
kind of actor at once:

```lumascript
hook before every override of LiveActor::control() {
    if frozen { skip }
}
```

`wrap every override of` works the same way. `self` is the object, typed as the virtual's class. Using
`every override of` on a function that is not virtual is S0114.

An override that calls its base's version runs the base's wrap **inside** its own. So a wrap that sets module state
around `proceed()` should save and restore it, never clear it:

```lumascript
var current: ref<LiveActor>? = none

wrap every override of LiveActor::movement() {
    let was = current
    current = ref(self)
    proceed()
    current = was                             // not `current = none`
}
```

## Hooks in a class

A hook written inside a `class` applies to that class's objects only; the compiler adds the test. It must be on a
member function of the game class the class derives from, directly or through a base (S0115). See
[Classes derived from the game's](lumascript/classes.md).

## Order

- **Within one mod**, hooks run in the order written.
- **Between mods**, the mod **higher** in the player's mod list is **outermost**: its `before` runs first, its
  `after` runs last (so its result stands), and its `wrap` encloses the lower mods' wraps.
- A `replace` belongs to one mod only.

Two mods with `before` hooks on the same function that do not skip both run, in load order, and each sees the call.

## A hook that calls the function it hooks

Inside a hook, a call **from your own code** to the function this hook is on does not run your mod's hooks on it
again. It runs the other mods' hooks and the game's code. So this does not loop forever:

```lumascript
hook after MR::getPlayerPos() -> p {
    let raw = MR::getPlayerPos()              // runs other mods' hooks and the game, not this hook
}
```

Code the game runs inside the call (a recursive game function, or an override calling its base under
`every override of`) runs every mod's hooks each time, as the game would.

## When something goes wrong

A [script error](lumascript/errors.md) inside a hook ends that hook's run, and the game's behaviour goes on:

| Hook      | After a script error                               |
| --------- | -------------------------------------------------- |
| `before`  | does not skip                                      |
| `after`   | leaves the result as it was                        |
| `wrap`    | proceeds, if it had not yet                        |
| `replace` | the game's own function runs and its result stands |

Hooks, tasks and handlers run on the game thread only. If the game calls a hooked function on another thread, your
hook does not run there: the call behaves as after a script error, and the mod log gets one line per hook (S0901,
"was called off the game thread"). Hooking a function the game's description marks as running off the game thread is
a build warning naming it.

## Functions you cannot hook

- A function the game evaluates while compiling (`constexpr`) can be called but not hooked.
- A function with a variable argument list (`...`) takes `before` hooks only, from C. See
  [Varargs](lumascript/varargs.md).
- A few functions have no row at all (templates, the allocator). They are listed in the game's description; see
  [The game's description of itself](lumascript/game-description.md).

## See also

- [The game in scope](lumascript/game-objects.md)
- [Classes derived from the game's](lumascript/classes.md)
- [Errors](lumascript/errors.md)
- [Lifecycle, options and frames](lumascript/events.md)
- [Loading a mod](reference/loading.md)
- [Hide the HUD tutorial](tutorials/hide-the-hud.md)
