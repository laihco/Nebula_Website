---
title: Basics - files, syntax, variables and control flow
nav_title: Basics
description: How a mod's source is laid out in files and modules, how LumaScript reads lines, and the statements every mod uses.
order: 2
level: essential
---

This page covers what you write in every mod: source files and modules, how lines and names are read, variables, and
the control-flow statements (`if`, `while`, `for`, `match`, `guard`, `defer`). Types have their own page,
[Types and values](lumascript/types.md).

## A first look

```lumascript source/main.lum
use ./ball/fly                      // another module of this mod

let max_balls = 3                   // a value that never changes
var thrown = 0                      // a value that does

on start {
    for i in 0..max_balls {
        log "ball {i}"
    }
    if thrown == 0 { log "nothing thrown yet" } else { log "thrown {thrown}" }
}
```

## Files and modules

A source file is UTF-8 text with the extension `.lum`, in the mod's `source/` folder. **One file is one module.** A
module's name is its path inside `source/` without the extension, with `/` between parts: `source/ball/fly.lum` is
the module `ball/fly`.

The mod's entry is the module `main` (`source/main.lum`). Its `on start`, hooks and states are the mod's own. Hooks
written in other modules are the mod's too: a hook is never private.

### use

`use` brings a module into scope. The game itself is always in scope and is never `use`d.

| Form                    | Brings in                                                                                          |
| ----------------------- | -------------------------------------------------------------------------------------------------- |
| `use ./ball/fly`        | another module of the same mod (path from `source/`)                                               |
| `use kit.actor`         | a [LumaKit](lumakit/overview.md) module                                                            |
| `use <mod id>.<module>` | a module of a library mod, which must be in your `luma.json` `needs`                               |
| `use svc.net`           | a [service](services/overview.md): its functions and events                                        |
| `use c "helpers.h"`     | C declarations from the mod's own C sources (see [C in the same mod](lumascript/compiled-form.md)) |

Two extra forms work after any of these:

```lumascript
use svc.draw as d                   // rename: d.Point.Hud
use ./ball/fly.{launch, land}       // take only these names
```

A service the game may not have (an older game, a platform without it) is written `use optional svc.<name>`. It is
then `none` where the game lacks it, instead of the mod refusing to load.

### pub

A name declared `pub` is visible to modules that `use` this one. Anything else is private to its file.

```lumascript source/ball/fly.lum
pub fn launch(speed: f32) { log "launch at {speed}" }
fn helper() { }                     // only this file can call it
```

### What a module may hold

The top level of a module holds only declarations: `use`, `option`, `let`, `var`, `fn`, `struct`, `enum`, `class`,
`task`, hooks, `on` handlers, `states`, `test`, `extern` and `export`. A bare statement at the top level is an error;
put it in `on start { }`.

Module-level `let` and `var` may be any expression. They run when the mod starts, in module order, before every
`on start`. One that reads the game runs after every game name the mod uses has been found.

## Comments and names

```lumascript
// to the end of the line
/* a block comment /* which may nest */ like this */
```

- **Names** start with a letter or `_`, then letters, digits and `_`, in ASCII. A name with a letter outside ASCII
  (`café`) is error S0023.
- **Game names** may hold `::` between parts: `MR::getPlayerPos`, `Kuribo::exeWander`, `Kuribo::~Kuribo`.
- **Backquotes** take any name exactly as the game's description spells it, for overloads and file-local functions:
  `` `MR::isNear(const LiveActor *, const Vec3f &, f32)` ``,
  `` `Game/Enemy/Kuribo.cpp#KuriboParam::KuriboParam` ``.
- After `::` or `.`, any word is a name, even a keyword: `GameScene::start`, `GameScene::update`, `x.frames`, `p.0`.

## Lines and statements

A statement ends at the end of its line, or at `;`. Blocks are `{ ... }`. Indentation means nothing; the formatter
writes four spaces.

A line end does **not** end the statement when:

- it is inside `( )` or `[ ]` (but inside a `{ }` within them it does again);
- the line ends with an operator, `,`, `:`, `->`, `=>` or an open bracket;
- the next line starts with `else` (except `else =>`, which is a match arm).

```lumascript
let total = a +
    b +                             // still one statement: the line ends with +
    c
if ready { go() }
else { wait_more() }                // else on the next line joins the if
```

After a statement that ends with a block's `}`, the next statement may follow on the same line:
`enter { start_spin() } wait 180 frames`. After the `}` of a struct literal, a map, a `match` or a declaration, the
next statement needs a line end or `;`.

Inside the `{ }` of a literal, a struct, an enum or a `match`, entries are separated by `,`, by a line end, or both.
Comma lists in `( )` and `[ ]` (parameters, arguments, lists, tuples) take no comma before the closing bracket.

## Keywords

**Reserved** words can never be a name of your own:

```text
use pub let var fn return if else while for in break continue match struct enum class override hook wrap
replace proceed skip state states go wait task stop on option true false none self result as and or not
extern export defer test expect guard start log ref
```

**Contextual** words are keywords only where the grammar puts them, and ordinary names everywhere else:

```text
before after every override of until frames seconds fact optional enter update exit game c draw layers
stage frame load
model effect sound layout text font movie data nerve
```

The content words (`model`, `sound`, `text`...) are content names only when a string follows: `model "GoldBall"`.

## Literals

| Literal           | Example                                                             |
| ----------------- | ------------------------------------------------------------------- |
| integers          | `12`, `0x1F`, `0b101`, `1_000_000`                                  |
| floats            | `1.5`, `1e3`, `2.0f64`                                              |
| booleans and none | `true`, `false`, `none`                                             |
| text              | `"hello {name}"` (interpolation; `{{` for a brace), `r"raw \ text"` |
| bytes             | `b"\x00\x01"`                                                       |
| colour            | `#FFD700`, `#FFD700CC`                                              |
| list, map, set    | `[1, 2, 3]`, `{"a": 1}`, `{1, 2}`, `{}`                             |
| vectors           | `vec3(0, 1, 0)`                                                     |
| struct            | `Ball { pos: vec3(0, 0, 0), life }`                                 |

Each is explained in [Types and values](lumascript/types.md).

## Variables

`let` binds a name that cannot change. `var` binds one that can.

```lumascript
let speed = 12.0            // f32, inferred
var count = 0               // int, inferred
var name: text? = none      // a type written out
count += 1
```

A local's type is inferred from its value; you may write it after `:`. A `var` written with a type may leave out its
value at the top of a module. `let` can also take a tuple apart: `let (a, b) = pair`.

There is no `const`: a module-level `let` is the way to name a constant, and the compiler folds it when its value is
constant.

### Assignment

`=` and the compound forms `+= -= *= /= %= &= |= ^= <<= >>=`. You can only write to a place that may change: a `var`
local, a field or element of one, a writable game field, or a hook's `result`. Writing to a `let`, an option or a
plain parameter is error S0064, which says why.

## Operators

From loosest to tightest:

| Level | Operators                                              |
| ----- | ------------------------------------------------------ |
| 1     | `??` (right to left)                                   |
| 2     | `or`                                                   |
| 3     | `and`                                                  |
| 4     | `not` (prefix)                                         |
| 5     | `==` `!=` `<` `<=` `>` `>=` (one per expression)       |
| 6     | `..` `..=`                                             |
| 7     | `\|`                                                   |
| 8     | `^`                                                    |
| 9     | `&`                                                    |
| 10    | `<<` `>>`                                              |
| 11    | `+` `-`                                                |
| 12    | `*` `/` `%`                                            |
| 13    | prefix `-`, `wait`, `start`                            |
| 14    | `as`                                                   |
| 15    | postfix: a call `(...)`, `[i]`, `.name`, `?.name`, `!` |

- `as` binds tighter than every binary operator: `a as u32 * b as u32` is `(a as u32) * (b as u32)`.
- One comparison per expression: `a == b == c` is an error.
- `x!` means "the value of `x`, which must not be `none`"; it is a script error when it is.
- There is no `&&`, `||`, prefix `!` or `? :`. The compiler names the word to use instead (`and`, `or`, `not`, an
  `if` expression).

What each operator takes is in [Types and values](lumascript/types.md#operators).

## Control flow

### if

```lumascript
if count > 3 { log "many" } else if count == 0 { log "none" } else { log "a few" }
```

`if` is an expression when every branch gives a value:

```lumascript
let scale = if big { 2.0 } else { 1.0 }
```

### if let

`if let` runs its block only when a value is not `none`, and binds it. It takes a list of conditions, checked in
order; a plain condition may sit among them:

```lumascript
if let p = MarioAccess::getPlayerActor() {
    log "player at {p.mPosition}"
}

if let r = room, not r.host, let peer = r.peers.get(1) {
    log "first guest: {peer.name}"
}
```

The names bound are in scope in the `if` block only.

### guard

`guard` is the reverse: it checks conditions and leaves early when one fails. Its `else` block must leave the
function, task or loop (`return`, `stop`, `break`, `continue`, `go` or `skip`). After it, the names it bound stay in
scope for the rest of the block.

```lumascript
fn play_back(file: text) {
    guard let data = read_file(file), data.len() > 0 else {     // read_file: a function of your own giving bytes?
        log "nothing to play"
        return
    }
    log "{data.len()} bytes"         // data is in scope here
}
```

An `else` block that can reach its end is error S0102.

### while

```lumascript
while count < 10 { count += 1 }
while true { ... }                  // leave with break
```

### for

```lumascript
for i in 0..10 { }                  // 0 to 9
for i in 0..=10 { }                 // 0 to 10
for item in items { }               // a list or set: each value
for (key, value) in scores { }      // a map: (key, value) pairs, in key order
for (i, item) in items.indexed() { }
```

`break` leaves the loop; `continue` goes round again.

### match

`match` picks the first arm that fits. It must cover every case or end with `else =>`; a missing case is a build
error naming it.

```lumascript
match shape {
    Shape.Circle(r) => area = 3.14159 * r * r
    Shape.Box { w, h } => area = w * h
    else => area = 0.0
}
```

An arm's pattern may be:

- an integer, text or bool literal, or a negative number: `0 =>`, `"luigi" =>`, `-1 =>`;
- an enum case written **with its enum**: `Shape.Circle(r)`, `Shape.Box { w, h }`;
- a tuple of patterns: `(Shape.Dot, 0) =>`;
- `else =>` for the rest.

Inside a case's fields a bare name binds the field (`r` above). A bare name as a whole arm is an error, because it
would match everything and hide a misspelt case. `_` is not a name anywhere: write `else =>`. A game enum's values
are written dotted in a pattern (`Mode.Walk`), though `Mode::Walk` in an expression.

An arm's body is one statement or a block. `match` is an expression when every arm gives a value:

```lumascript
let label = match phase {
    Phase.Idle => "idle"
    Phase.Flying(speed) => "flying"
    Phase.Done => "done"
}
```

### defer

`defer` runs a statement when the block ends, however it ends:

```lumascript
fn save_all() {
    log "saving"
    defer log "saved"               // runs last, even after an early return
    ...
}
```

What `defer` runs must finish where it started: it may not hold `return`, `stop`, `go`, `skip`, `wait`, or a
`break` or `continue` of a loop outside it (error S0106).

### return

`return value` leaves a function with its result; `return` alone leaves one with none. A function with a result must
not reach its closing `}`: see [Functions](lumascript/functions.md).

## log

```lumascript
log "ready, speed {speed}"          // a line in the mod log and the game's log
log fact "balls" balls.len()        // a fact for the test harness
```

`log fact "key" value` writes a fact the [test harness](lumalink/testing.md) can check. `fact` is that keyword only
when a value follows it directly; `log fact + 1` logs a variable named `fact`.

## Edge cases

- **A struct literal in a condition.** `if Point { x: 1 } == p` would read `{` as the block. Put the literal in
  parentheses: `if (Point { x: 1 }) == p`. The same holds for `while`, `match`, `guard` and `for ... in`.
- **Generic types at a line end.** A type ending in `>` or `>>` ends its line (`items: list<int>`). As operators,
  `>` and `>>` at a line end continue onto the next line.
- **Type arguments and their call** must be on one line: `json.decode<list<int>>` with `(data)` on the next line is
  error S0025.
- **`>=` after a type.** `var l: list<int>= []` reads as `list<int>` then `= []`.
- **Nesting** is limited to 512 levels (brackets, blocks, operators, and so on); deeper is error S0022.
- **Files** may start with one UTF-8 byte-order mark, which is skipped, and may end lines with CR LF or CR.
- An interpolation must end on its line; one that does not is error S0004.

## See also

- [Types and values](lumascript/types.md)
- [Functions, structs, enums and closures](lumascript/functions.md)
- [Lifecycle, options and frames](lumascript/events.md)
- [Errors](lumascript/errors.md)
- [Anatomy of a mod](start/mod-anatomy.md)
