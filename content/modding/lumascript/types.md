---
title: Types and values
nav_title: Types
description: Every LumaScript type - numbers, vectors, colours, text, bytes, optionals, tuples, lists, maps and sets - with their operators, methods and conversions.
order: 3
level: essential
---

Every value in LumaScript has a type that the compiler knows when it builds your mod. This page lists the types, what
you can do with each, and how values convert. Numbers have a page of their own: [Numbers](lumascript/numbers.md).

## At a glance

```lumascript
let lives = 3                               // int
let speed = 12.5                            // f32
let up = vec3(0, 1, 0)                      // vec3
let gold = #FFD700                          // color
let name = "Mario"                          // text
let scores = [10, 20, 30]                   // list<int>
var best: map<text, int> = {}               // an empty map
var target: ref<Kuribo>? = none             // a handle to a Goomba, or none
let pair = (1, "one")                       // a tuple (int, text)
log "{name} has {lives} lives, moving at {speed} along {up}"
```

## The types

| Type                                     | What it is                                                                                  |
| ---------------------------------------- | ------------------------------------------------------------------------------------------- |
| `bool`                                   | `true` or `false`                                                                           |
| `i8 i16 i32 i64 u8 u16 u32 u64`          | integers; `int` is `i32`                                                                    |
| `f32 f64`                                | floats; `float` is `f32`, the game's                                                        |
| `vec2 vec3 vec4 quat`                    | `f32` components `x y z w`; `vec3` has the game's `TVec3f` layout                           |
| `mat34`                                  | the game's 3x4 matrix (`TPos3f`, `Mtx`)                                                     |
| `color`                                  | RGBA, each channel an `f32` from 0 to 1                                                     |
| `text`                                   | immutable UTF-8 text                                                                        |
| `bytes`                                  | an owned buffer of bytes                                                                    |
| `list<T>`, `map<K, V>`, `set<T>`         | owned containers                                                                            |
| `T?`                                     | a `T` or `none`                                                                             |
| `(A, B, ...)`                            | a tuple: values by position                                                                 |
| `struct S { ... }`                       | your own record with named fields ([Functions, structs, enums](lumascript/functions.md))    |
| `enum E { ... }`                         | your own choice of cases, each with or without data                                         |
| `fn(A, B) -> R`                          | a function or closure                                                                       |
| `ref<C>`                                 | a handle to a game object of class `C`; empty once the object is gone                       |
| game classes (`MarioActor`, `LiveActor`) | a **view** of a live game object ([The game in scope](lumascript/game-objects.md))          |
| game enums, game structs                 | as the game describes them                                                                  |
| `pending<T>`                             | the answer to a call that answers later; read it with `wait` ([Tasks](lumascript/tasks.md)) |

## Inference

You write the types of a function's parameters and result. You never need to write a local's type: `let x = 3` is
an `int`, `let v = vec3(1, 2, 3)` a `vec3`. An integer literal takes the type its place needs if the value fits
(`let small: u8 = 200`); if it does not fit, the build error names the type and the value.

There are **no implicit conversions** between integers and floats, or between sizes. Only literals adapt. Write a
conversion with `as`: see [Conversions](lumascript/types.md#conversions-with-as).

## Booleans

`bool` takes `and`, `or` and `not`, and `==`/`!=`. Conditions (`if`, `while`, `guard`) must be `bool`; there is no
"truthy" number or text.

## Vectors, quaternions and matrices

```lumascript
let up = vec3(0, 1, 0)
var v = vec3(1, 2, 3)
v.y += 1.0                              // components are places: v.x, v.y, v.z
let fast = v * 2.0                      // a vector times an f32
let mid = lerp(a, b, 0.5)
let dir = normal(target - here)
let dist = length(target - here)
let side = cross(front, up)
```

- `vec2`, `vec3`, `vec4` and `quat` are made from 2, 3, 4 and 4 `f32`s. Integer literals adapt: `vec3(0, 1, 0)`.
- `+` and `-` take two vectors of one size; `*` and `/` take a vector and an `f32` (`2.0 * v` works too).
- `dot(a, b)` and `length(v)` give `f32`; `cross(a, b)` takes two `vec3`; `normal(v)` gives a vector of length 1.
- `mat34` is the game's 3x4 matrix, `float[3][4]`, for passing to and from the game.

## Colours

```lumascript
let gold = #FFD700                      // opaque
let glass = #FFFFFF80                   // with alpha
let dim = gold * 0.5                    // each channel times 0.5
let mix = color(0.2, 0.4, 1.0) + color(0.1, 0.0, 0.0, 0.0)
```

- `#RRGGBB` and `#RRGGBBAA` are colour literals; `color(r, g, b)` and `color(r, g, b, a)` take `f32`s from 0 to 1.
- `color * f32` and `color + color` work on each channel and keep it within 0 to 1.
- `lerp(a, b, t)` blends two colours.

## Text

`text` is immutable UTF-8. Put values into it with interpolation:

```lumascript
let who = "Luigi"
log "hello {who}, you have {lives * 2} lives"       // any expression inside { }
log "a brace: {{"                                    // {{ is a literal {
let path = r"C:\no\escapes\here"                     // raw text
```

Text is joined by interpolation (`"{a}{b}"`), not by `+`.

**What can go into text:** numbers, `bool`, `text`, `json.Value`, vectors, `quat`, `color`, `mat34`, enums (yours or
the game's), and lists, sets, maps or tuples of those. A `T?` cannot: it is error S0067 ("`x` may be none: write
`{x ?? ...}` or test it with `if let`"). Anything else is error S0080.

**Escapes:** `\n \t \r \0 \\ \" \' \{ \}`, `\xHH` (two hex digits; below 80 in text, any byte in `b"..."`), and
`\u{H}` to `\u{HHHHHH}` (a Unicode scalar value, not a surrogate). Any other escape is error S0093. A raw string
`r"..."` has no escapes and no interpolation.

| Method                           | Gives                                                                             |
| -------------------------------- | --------------------------------------------------------------------------------- |
| `len()`                          | the length in **bytes**                                                           |
| `chars()`                        | the text by code point                                                            |
| `split(sep)`                     | `list<text>`                                                                      |
| `starts_with(t)`, `ends_with(t)` | `bool`                                                                            |
| `find(t)`                        | `int?`: the byte offset, or `none`                                                |
| `slice(from, to)`                | the text between two byte offsets; an offset inside a character is a script error |
| `lower()`, `upper()`             | Unicode simple case mapping                                                       |
| `parse_int()`                    | `i64?`                                                                            |
| `parse_float()`                  | `f64?`                                                                            |
| `bytes()`                        | the text's UTF-8 as `bytes`                                                       |

`<` and the other comparisons order text by its bytes.

> [!NOTE]
> `text "Key"` (with a string after it) is not a text value you wrote: it is a row of your mod's translated text,
> in the player's language. See [Content by name](lumascript/events.md#content-by-name).

## Bytes

`bytes` is a buffer you own, for files, network data and binary formats. `b"\x00\x01"` is a literal.

| Method                                                              | Does                                                       |
| ------------------------------------------------------------------- | ---------------------------------------------------------- |
| `len()`                                                             | the length                                                 |
| `b[i]`                                                              | one byte, read or written                                  |
| `slice(from, to)`                                                   | a part                                                     |
| `push(u8)`                                                          | add a byte at the end                                      |
| `read_u16(at, big)`, `read_u32`, `read_u64`, `read_f32`, `read_f64` | read a number at a byte offset; `big: true` for big-endian |
| `write_u16(at, value, big)`, `write_u32`...                         | write one                                                  |

A read or write past the end is a script error naming the range.

## Optional values

`T?` holds a `T` or `none`. Game results that may be null are optional (see
[Null game pointers](lumascript/game-objects.md#when-the-game-may-give-nothing)).

```lumascript
var name: text? = none
let shown = name ?? "nobody"            // a default
let k = target?.get()                   // none when target is none
if let n = name { log "hi {n}" }        // test and bind
if name == none { log "no name yet" }   // any T? compares with none
let sure = name!                        // the value; a script error if it is none
```

| Form                              | Means                                          |
| --------------------------------- | ---------------------------------------------- |
| `x ?? y`                          | `x`'s value, or `y` when `x` is `none`         |
| `x?.y`, `x?.f()`                  | `none` when `x` is `none`, else `x.y`          |
| `x!`                              | `x`'s value; a script error when `x` is `none` |
| `x == none`, `x != none`          | test any `T?`, even when `T` has no `==`       |
| `if let v = x`, `guard let v = x` | bind the value when there is one               |

`== none` on a value that can never be `none` is error S0086. A `T?` given where a `T` is needed is a build error:
test it first.

## Tuples

```lumascript
let pair = (3, "three")
log "{pair.0} is {pair.1}"
let (n, word) = pair
for (i, item) in items.indexed() { }    // indexed() gives (int, T) tuples
```

## Lists, maps and sets

All three are owned containers: copying one is cheap, and it is freed when its last copy ends (see
[Memory](lumascript/memory.md)).

```lumascript
var balls: list<int> = []
balls.push(4)
let first = balls[0]                    // out of range: a script error
let maybe = balls.get(9)                // out of range: none

var bests: map<text, int> = {}
bests["Egg"] = 120                      // adds or replaces
let egg = bests.get("Egg") ?? 0         // a missing key: none
let must = bests["Egg"]                 // a missing key: a script error

var seen: set<text> = {}
if seen.add("Egg") { log "new" }        // true when it was not there
```

**Literals:** `[a, b]` is a list; `{k: v, ...}` a map; `{a, b}` a set; `{}` an empty map or set, chosen by its
place.

**Keys** of a map (`K`) and values of a set may be an integer, `text`, `bool` or an enum without data. `keys()`,
`values()` and `for` go in key order: integers and enums by value, text by bytes, so the order is the same on every
platform.

### list<T>

| Method              | Gives                                                |
| ------------------- | ---------------------------------------------------- |
| `len()`             | `int`                                                |
| `push(x)`           | adds at the end                                      |
| `pop()`             | `T?`: the last, removed                              |
| `insert(i, x)`      | adds at `i`                                          |
| `remove(i)`         | `T`; out of range is a script error                  |
| `get(i)`            | `T?`                                                 |
| `l[i]`              | `T`, read or written; out of range is a script error |
| `contains(x)`       | `bool` (`T` must compare)                            |
| `indexed()`         | `list<(int, T)>`                                     |
| `map(f)`            | `list<U>` from `fn(T) -> U`                          |
| `filter(f)`         | `list<T>` of those where `fn(T) -> bool` is true     |
| `any(f)`, `all(f)`  | `bool`                                               |
| `sum(f)`            | a number, from `fn(T) -> N`                          |
| `sort()`            | sorts in place (`T` must have `<`)                   |
| `sort_by(f)`        | sorts with `fn(T, T) -> bool`                        |
| `first()`, `last()` | `T?`                                                 |

There is one way to do each thing: keep some elements with `balls = balls.filter(...)`, and find the last match
with `filter(...).last()`.

```lumascript
balls = balls.filter(fn(b: ref<LiveActor>) -> bool { return b.get() != none })
let total = scores.sum(fn(s: int) -> int { return s })
```

### map<K, V>

| Method        | Gives                                                                  |
| ------------- | ---------------------------------------------------------------------- |
| `len()`       | `int`                                                                  |
| `get(k)`      | `V?`                                                                   |
| `m[k]`        | `V`; reading a missing key is a script error; writing adds or replaces |
| `contains(k)` | `bool`                                                                 |
| `remove(k)`   | `V?`                                                                   |
| `keys()`      | `list<K>` in key order                                                 |
| `values()`    | `list<V>` in key order                                                 |

### set<T>

| Method        | Gives                          |
| ------------- | ------------------------------ |
| `len()`       | `int`                          |
| `add(x)`      | `bool`: true when it was new   |
| `remove(x)`   | `bool`: true when it was there |
| `contains(x)` | `bool`                         |
| `values()`    | `list<T>` in order             |

Each of these is a build error on the wrong type, never a lookup while the game runs.

## Operators

| Operator     | Takes                                          | Gives                |
| ------------ | ---------------------------------------------- | -------------------- |
| `+ - * / %`  | two numbers of one type                        | that type            |
| `+ -`        | two vectors of one size                        | that vector          |
| `* /`        | a vector and an `f32` (`f32 * v` too, for `*`) | the vector           |
| `+`          | two colours                                    | `color`              |
| `*`          | a `color` and an `f32`                         | `color`              |
| `& \| ^`     | two integers of one type                       | that type            |
| `<< >>`      | an integer, shifted by any integer             | the left side's type |
| `== !=`      | two values of one type that compares           | `bool`               |
| `< <= > >=`  | two numbers of one type, or two texts          | `bool`               |
| `..` `..=`   | two integers of one type                       | a range              |
| `and or not` | `bool`                                         | `bool`               |
| `??`         | a `T?` and a `T` (or a `T?`)                   | `T` (or `T?`)        |

A literal on one side takes the other side's type: with `x: u8`, `x + 1` is a `u8`; `1.5 * v` is `f32 * vec3`. A
mismatch is error S0065 (or S0066 when one side is wrong). Integer overflow and division by zero are script errors;
floats follow IEEE. See [Numbers](lumascript/numbers.md).

## Equality

`==` and `!=` (and a list's `contains`) work on every type except functions, views of game objects, game arrays,
service handles, classes, tasks, pending results and content names. Lists, sets, optionals, maps and tuples compare
when what they hold compares; your structs and enums compare when every field does.

Views and service handles are compared with `same(a, b)`: true when both are the same object or the same stream.
Using `==` on them is error S0073, which says so.

```lumascript
if same(a, MarioAccess::getPlayerActor()) { log "that's the player" }
```

## Conversions with as

`as` converts:

- a number to another number type: `x as f32`, `n as u8`;
- a game enum to an integer, and an integer to a game enum;
- an enum of your own **without data** to an integer.

Nothing else (error S0069). A number that does not fit its new type (`300 as u8`) is a script error. To keep only the
low bits on purpose, use `low_bits<T>(n)`: `low_bits<u8>(300)` is `44`. Each integer type has its limits:
`u32.max`, `i16.min`.

## Built-in functions

These are always in scope, with no `use`. They take positional arguments only.

| Call                                         | Takes                                               | Gives           |
| -------------------------------------------- | --------------------------------------------------- | --------------- |
| `min(a, b)`, `max(a, b)`, `clamp(x, lo, hi)` | numbers of one type                                 | that type       |
| `abs(x)`                                     | a signed integer or a float                         | that type       |
| `sqrt(x)`, `sin(x)`, `cos(x)`, `atan2(y, x)` | floats of one type (literals are `f32`)             | that type       |
| `lerp(a, b, t)`                              | two floats, vectors or colours of one type, and `t` | the type of `a` |
| `dot(a, b)`, `length(v)`                     | vectors of one size                                 | `f32`           |
| `cross(a, b)`                                | two `vec3`                                          | `vec3`          |
| `normal(v)`                                  | a vector                                            | that vector     |
| `hash32(t)`                                  | `text`                                              | `u32`           |
| `low_bits<T>(n)`                             | an integer type `T`, any integer `n`                | `T`             |
| `vec2 vec3 vec4 quat`                        | 2, 3, 4, 4 `f32`                                    | the value       |
| `color(r, g, b)`, `color(r, g, b, a)`        | `f32` 0 to 1                                        | `color`         |
| `same(a, b)`                                 | two views, handles or nerves (each may be `T?`)     | `bool`          |
| `ref(view)`                                  | a view of a game object                             | `ref<C>`        |

Other standard names: `json` (below), `is_state` ([Tasks](lumascript/tasks.md)), `keep` and `kept`
([Lifecycle](lumascript/events.md)). A function of your own with one of these names hides the standard one.

## json

The standard module `json` turns values into JSON text and back.

```lumascript
struct Best { frames: u32, file: text }

var bests: map<text, Best> = {}
let saved = json.encode(bests)                               // text
bests = json.decode<map<text, Best>>(saved) ?? {}            // none if it does not read as that type
```

- `json.encode(x)` takes JSON data and gives `text`.
- `json.decode<T>(data)` takes `text` or `bytes` and gives `T?`: `none` when the data does not read as a `T`. Extra
  keys in an object are skipped; a missing field takes its default, else the whole decode is `none`.
- **JSON data** is `bool`, numbers, `text`, `json.Value`, vectors, `quat`, `color`, `mat34`, game enums; lists,
  sets, optionals and tuples of JSON data; maps with `text`, integer, `bool` or enum keys; and your structs and enums
  whose fields are JSON data. Views, handles, functions, `bytes`, tasks, pending results, classes, service handles and
  game structs are not (error S0094; copy what you need into a struct of your own).

How values are written:

| Value                       | JSON                                                                                     |
| --------------------------- | ---------------------------------------------------------------------------------------- |
| `bool`, a number, `text`    | `true`/`false`, a number (integers exactly, even past 2^53), a string                    |
| `none`                      | `null`                                                                                   |
| `vec2 vec3 vec4 quat`       | `[x, y]`, `[x, y, z]`, `[x, y, z, w]`                                                    |
| `color`                     | `[r, g, b, a]`, each 0 to 1                                                              |
| `mat34`                     | three rows of four: `[[...], [...], [...]]`                                              |
| a list, set or tuple        | an array                                                                                 |
| a map                       | an object; integer keys in decimal, `bool` keys as `"true"`/`"false"`, enum keys by name |
| a struct                    | an object of its fields by name                                                          |
| an enum case without fields | its name as a string (`"Walk"`)                                                          |
| an enum case with fields    | `{"Case": {fields by name}}`                                                             |
| a game enum                 | its value's name                                                                         |

A float that is NaN or infinite is a script error when written: JSON has neither.

### json.Value

For JSON whose shape you do not know in advance, use `json.Value`. A literal (list, map, text, number, bool, `none`)
in a place that takes a `json.Value` becomes one, so you can write JSON directly:

```lumascript
let body = json.encode({ "star": star, "frames": frames })
guard let packets = json.decode<list<map<text, json.Value>>>(msg) else { return }
for p in packets {
    if let cmd = p.get("cmd")?.text(), cmd == "ReceivedItems" { log "items!" }
}
```

A `json.Value` has `.text()`, `.int()`, `.float()`, `.bool()`, `.list()`, `.map()` (each `T?`), and `.get(key)` and
`.at(index)` (each `Value?`). `.int()` is an `i32`, and is `none` for a fraction or a number too large; `.float()` is
an `f32`. `json` alone is not a value (error S0083).

## See also

- [Numbers](lumascript/numbers.md)
- [Functions, structs, enums and closures](lumascript/functions.md)
- [The game in scope](lumascript/game-objects.md)
- [Memory and lifetimes](lumascript/memory.md)
- [Types across the boundary](lumascript/interop-types.md)
