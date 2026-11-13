---
title: Functions, structs, enums and closures
nav_title: Functions and structs
description: Declare functions with default and named arguments, group data in structs with their own functions, model choices with enums, and pass code around as closures.
order: 4
level: essential
---

This page covers the pieces you build a mod's own logic from: functions, structs (records with named fields and
their own functions), enums (a choice of cases, each with or without data) and closures (functions made on the spot
that you can store and call later).

## A quick example

```lumascript
struct Ball {
    pos: vec3
    vel: vec3 = vec3(0, 0, 0)
    life: int = 120
    fn step(var self) { self.pos += self.vel; self.life -= 1 }
    fn dead(self) -> bool { return self.life <= 0 }
}

enum Phase { Idle, Flying(speed: f32), Done }

fn area(w: f32, h: f32) -> f32 { return w * h }

pub fn greet(name: text, times: int = 1) {
    for i in 0..times { log "hi {name}" }
}

on start {
    var b = Ball { pos: vec3(0, 0, 0) }
    b.step()
    greet("Rosalina", times: 2)
    let p = Phase.Flying(speed: 3.0)
    let double = fn(x: int) -> int { return x * 2 }
    log "{area(2.0, 3.0)} {double(21)} {b.dead()}"
}
```

## Functions

```lumascript
fn area(w: f32, h: f32) -> f32 { return w * h }
fn shout(t: text) { log t.upper() }                 // no result
```

- Each parameter's type is written; so is the result's, after `->`. Locals never need one.
- `pub fn` makes the function visible to modules that `use` this one.
- A parameter may have a default: `times: int = 1`. Callers may then leave it out.
- A function may be declared inside another function's body (a local `fn`).

### Every path must return

A function with a result must not reach its closing `}`. Every path ends in `return value`, or in a loop that never
ends (`while true` with no `break` of its own). An `if` without `else` can always fall through. The error is S0101,
at the closing `}`, naming the result type.

```lumascript
fn sign(x: int) -> int {
    if x < 0 { return -1 } else if x > 0 { return 1 }
    return 0                                        // without this: S0101
}
```

### Named arguments

A call gives its positional arguments first, then any by name, `name: value`:

```lumascript
greet("Peach")
greet("Peach", times: 3)
```

A name the function lacks, a parameter given twice, or a required one missing is a build error naming it. Named
arguments work for your own functions, LumaKit's and services' (whose parameters have names). The game's functions
and the built-in functions take positional arguments only.

### var parameters

Parameters are values: a function gets copies. A parameter marked `var` lets the function change the **caller's**
variable. The caller writes `var` too, so you can see it at the call:

```lumascript
fn grow(var l: list<int>) { l.push(0) }

on start {
    var mine = [1, 2]
    grow(var mine)                                  // mine is now [1, 2, 0]
}
```

A named argument may be a `var` one: `name: var x`. The game's out parameters use the same form:
`MR::getPlayerFrontVec(var front)` (see [The game in scope](lumascript/game-objects.md)).

## Structs

A struct is a record of named fields. Fields may have defaults; a struct literal must give every field without one.

```lumascript
struct Best { frames: u32, file: text }

struct Ball {
    pos: vec3
    vel: vec3 = vec3(0, 0, 0)
    life: int = 120
}

let b = Ball { pos: vec3(0, 0, 0) }                 // vel and life take their defaults
let frames: u32 = 900
let file = "runs/egg.replay"
let best = Best { frames, file }                    // shorthand: a field named like a local
```

- Fields are separated by `,` or line ends, in the declaration and in a literal.
- A struct literal starts with a capitalised name, or a module's: `item.Item { ... }`.
- In the condition of `if`, `while`, `match`, `guard` or `for`, put a struct literal in parentheses.
- Structs are values: assigning one copies it. Two structs compare with `==` when every field compares.
- A struct cannot hold a view of a game object (error S0103); hold a `ref<C>` instead.

### A struct's own functions

Functions declared in a struct take `self` first. `self` gives the struct's value; `var self` lets the function
change it.

```lumascript
struct Ball {
    pos: vec3
    vel: vec3 = vec3(0, 0, 0)
    life: int = 120
    fn step(var self) { self.pos += self.vel; self.life -= 1 }
    fn dead(self) -> bool { return self.life <= 0 }
}

on start {
    var b = Ball { pos: vec3(0, 0, 0), vel: vec3(0, 1, 0) }
    b.step()                                        // needs b to be a var
    if b.dead() { log "gone" }
}
```

`self` is only ever the first parameter of a struct's function or a class member. A free function names its own
parameter.

## Enums

An enum is a choice between cases. Each case may carry data, by position in `( )` or by name in `{ }`:

```lumascript
enum Phase { Idle, Flying(speed: f32), Done }
enum Shape { Dot, Circle(r: f32), Box { w: f32, h: f32 } }
```

A case without data is written with its enum: `Phase.Idle`. A case with data is made like a call, positional or
named by its fields:

```lumascript
let p = Phase.Flying(3.0)
let q = Phase.Flying(speed: 3.0)
let s = Shape.Box(w: 2.0, h: 1.0)
```

Read the data with `match` (see [Basics](lumascript/basics.md)):

```lumascript
fn area(s: Shape) -> f32 {
    match s {
        Shape.Circle(r) => return 3.14159 * r * r
        Shape.Box { w, h } => return w * h
        Shape.Dot => return 0.0
    }
}
```

An enum without data converts to an integer with `as` (`Phase.Done as int`). In JSON a case without data is written
as its name, and one with data as `{"Case": {fields}}`.

## Closures

`fn(...) { ... }` written as a value makes a closure: a function you can store, pass and call later.

```lumascript
let step = 5
let add_step = fn(x: int) -> int { return x + step }
log "{add_step(10)}"                                // 15

let alive = balls.filter(fn(b: ref<LiveActor>) -> bool { return b.get() != none })
```

- A closure's parameters are typed. Its result type may be left out when it gives none: `fn(i: int) { log "{i}" }`.
- A closure **copies** what it uses from around it when it is made. It never refers to a local that may have ended,
  and later changes to the original do not reach the copy.
- Its type is written `fn(A, B) -> R`: `var on_hit: fn(int) -> bool`.

### Closures and game objects

A closure that may run later cannot read a view of a game object, `self`, or a member through `self` (error S0103):
the object may be gone by then. Capture a handle instead:

```lumascript
let h = ref(self)
let later = fn() { if let a = h.get() { a.kill() } }
```

A closure written directly as the argument of `filter`, `map`, `any`, `all`, `sum` or `sort_by` runs at once,
inside its statement, so it may read views.

## Not in LumaScript 1

These are left out on purpose, so nobody waits for them. Each can be added later without changing the meaning of a
valid mod.

- Generics of your own (only built-ins such as `json.decode<T>` take a type).
- Inheritance between your own structs (only `class X : GameClass`, see [Classes](lumascript/classes.md)).
- Operator overloading.
- Threads: services that need them work on their own threads and deliver events to you.
- Unsafe blocks: C in the same mod is the way out ([What the compiler emits](lumascript/compiled-form.md)).
- Macros.

## See also

- [Basics](lumascript/basics.md)
- [Types and values](lumascript/types.md)
- [Classes derived from the game's](lumascript/classes.md)
- [Memory and lifetimes](lumascript/memory.md)
- [Tasks, states and wait](lumascript/tasks.md)
