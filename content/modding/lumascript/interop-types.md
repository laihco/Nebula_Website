---
title: Types across the boundary
nav_title: Interop types
description: Exactly how the game's C++ types appear in LumaScript - numbers, vectors, text, objects, structs, pointers, references, bit-fields and globals - and how services' C tables become LumaScript functions.
order: 14
level: advanced
---

When your mod calls the game, hooks it, or reads its fields, values cross between LumaScript and the game's C++. This
page says exactly how each kind of C++ type appears, which ones cannot cross, and why the compiler refuses some calls.
Read it when a build error says a parameter or result "does not cross".

## Example

```lumascript
hook before MarioActor::control() {
    var front = vec3(0, 0, 0)
    MR::getPlayerFrontVec(var front)                  // Vec3f* marked "out": a var argument
    let name = MR::getCurrentStageName()              // const char* never null: text
    if let p = MarioAccess::getPlayerActor() {        // MarioActor*: a view, may be none
        self.mVelocity = p.mGravity * -12.0           // TVec3f fields: vec3
    }
    initModelManagerWithAnm("Crumble", none, false)   // a pointer parameter the game tests: none allowed
}
```

## The map

| Game type                                                             | In LumaScript                                                                                |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `bool`, integer and float types (`s32`, `u16`, `f32`...)              | the same                                                                                     |
| game enums                                                            | the enum, by its values' names                                                               |
| `TVec3f`, `Vec3f`, `TVec2f`, `TPos3f`, `Mtx` by value or `const &`    | `vec3`, `vec2`, `mat34`, copied in and out                                                   |
| a result `Vec3f *` or `const TVec3f &`                                | a `vec3` copy, taken when the call returns                                                   |
| `T &` to a number, vector or enum, written by the game                | a `var` argument: `MR::calcGravityVector(self, var g)`                                       |
| `T *` to a number, vector or enum                                     | only when the game marks what the function does with it (below)                              |
| `const char *`                                                        | `text` (a result or field: `text?` unless marked never null)                                 |
| a pointer or reference to a game class                                | a view; a result or field is `T?` unless marked never null                                   |
| a game struct by value                                                | your own copy, when it can be copied safely                                                  |
| anything else (a raw buffer, a function pointer, `void *`, `va_list`) | not callable from LumaScript; reach it from [C in the same mod](lumascript/compiled-form.md) |

## Numbers, vectors and matrices

Numbers cross as themselves; `bool` is one byte on every platform. Vectors and matrices are copied: a script value
given to a `const T &` parameter is copied into a temporary for the call, and a vector the game returns by pointer
is copied when the call returns, so you never hold a pointer into the game.

A parameter declared as an array (`T p[]`, `T p[N]`) is received as a pointer to its element, as C does. The game's
signature keeps it as written: `ParticleEmitter::setGlobalSRTMatrix` reads `void(const Mtx)`, where `Mtx` is
`f32[3][4]`, so it takes a pointer to rows of four floats.

## References and pointers as parameters

| C++ parameter                     | Called with                          | In a hook                                      |
| --------------------------------- | ------------------------------------ | ---------------------------------------------- |
| `const T &`                       | a value (copied for the call)        | read only; writing it is a build error         |
| `T &`                             | `var x`: the game's writes reach `x` | writing it changes the caller's object         |
| `T &&`                            | a value (no `var` needed)            | may be read and written as the caller's object |
| `T *` to a game object            | a view                               | a view, or `T?`                                |
| `T *` to a number, vector or enum | only when marked (below)             | `T?`: the place it points at, `none` for null  |

Writing to a value parameter in a hook changes the copy the function receives.

### Marked pointer parameters

A pointer to a number, vector or enum says nothing in C++ about what the function does with it: it might read one
value, fill an array, or keep the address. So LumaScript refuses such a call unless the game's headers **mark** the
parameter. The marks are read from each function's body, never guessed:

| Mark                  | The function                                                | In LumaScript                                                 |
| --------------------- | ----------------------------------------------------------- | ------------------------------------------------------------- |
| `in`                  | reads one value, never writes it, does not keep it          | a value: `MR::f(v)`                                           |
| `out`                 | may write one value, never reads it first, does not keep it | `var x` of the pointed type                                   |
| `inout`               | reads one value and may write it, does not keep it          | `var x`                                                       |
| `count(n)` with a way | an array whose length is the parameter `n`                  | a `list<T>` (`var xs` for out and inout); you do not pass `n` |
| `fixed(n)` with a way | an array of exactly `n` elements (1 to 4096)                | a `list<T>` of exactly `n`                                    |
| `nullable` with a way | accepts null                                                | `none` is also allowed                                        |
| `kept`                | keeps the address                                           | never callable from LumaScript (a fact for C)                 |

```lumascript
var front = vec3(0, 0, 0)
MR::getPlayerFrontVec(var front)                      // out

var at = vec2(0, 0)
if MR::calcScreenPosition(var at, here) { }           // out
```

How each is passed:

- `out`: the game writes into a zero-filled local, which is copied into your variable after the call. A function
  that writes on some paths only leaves zero.
- `inout`: the local is filled from your variable first, and copied back after.
- `count`: the list's storage and its length. `out` writes up to the list's current length, so size the list first;
  its length never changes. A list longer than the count's type can hold is a script error (S0916) and the call is
  not made.
- `fixed`: for `out`, your list is set to `n` zero elements before the call, whatever its length. For `in` and
  `inout`, a list of another length is a script error (S0915) and the call is not made; a list literal of another
  length is a build error (S0133).
- Nothing of yours is kept: every address is valid only during the call.

A hidden count parameter makes the call take one argument fewer, but error messages number parameters by their place
in the game's signature, so the number matches what the build report lists.

## Text

- **Giving text to the game** (`const char *`): a string literal is passed as is; text made while running is copied
  once into your mod's text store, which lasts as long as your mod's code, because the game may keep the pointer.
  See [Memory](lumascript/memory.md#text-the-game-may-keep).
- Text holding a NUL byte cannot cross: a script error naming the function and parameter, and the call is not made.
- **Text the game gives you** (a result, field or global) is copied into a `text` when you read it. A `const char *`
  result is `text?` unless the game marks it never null (`MR::getCurrentStageName()` is plain `text`).

## Game objects and null

A pointer or reference to a game class is a **view**. Whether it may be `none` depends on evidence in the game's
code:

- **Results and pointer fields** are `T?`, unless marked never null (a C++ reference `T &` is never null).
- **Pointer parameters** take `T`, unless marked may-be-null: the function tests it for null, or only passes it on
  to such a parameter, or a hand-kept list gives the reason. Passing `none` or a `T?` there is a build error: "test it
  first (`if let`) or give a value".
- A function marked as **needing** another (the player functions need `MarioAccess::getPlayerActor`) tests that one
  first: a `T?` result gives `none`, and otherwise the call is not made (S0912). See
  [The game in scope](lumascript/game-objects.md#functions-that-need-the-player).

## Game structs by value

A plain game struct (no virtual functions) read through a view is your **copy**. The compiler takes a game record by
value only when a plain byte copy is a correct C++ copy and dropping it frees nothing (it is trivially copyable,
trivially destructible, and its copy is not deleted). Other records stay views.

A game function that takes a record by pointer or reference is given the game's own object, never your copy:
`MR::useBox(a.mBox)` passes the game's `mBox`; passing a `let b = a.mBox` copy is error S0098.

A game struct is not JSON data; copy the fields you need into a struct of your own.

## Fields

Fields are found by name through the class and its bases, as C++ finds them: a derived class's field hides a base's
of the same name. A name that is ambiguous (found in two bases) or reached through a virtual base cannot be used, and
the error says which of those it is.

**Bit-fields** (at most 32 bits wide) read as their declared type, zero- or sign-extended. A write must fit, or it is
a script error; use `low_bits<T>(...)` to keep the low bits on purpose. A bit-field cannot be a `var` argument. A
bit-field of a plain struct is reached through a view like any field (`mario.mMovementStates.onGround`).

## Globals

A game global is read and written by its qualified name (`GameSystem::sInstance`). A `const` global is read only;
writing it is a build error.

## What does not cross

| Error        | Means                                                                                                                       |
| ------------ | --------------------------------------------------------------------------------------------------------------------------- |
| S0060        | a parameter cannot cross; the message gives the reason (an unmarked or `kept` pointer, a raw buffer, a function pointer...) |
| S0061        | a result cannot cross, with the reason                                                                                      |
| S0062, S0063 | a pointer or non-const reference parameter: it needs `var`, or it cannot be passed                                          |
| S0090        | no form of the function can be called (for example, it is variadic)                                                         |

Each names the function and the parameter by its place in the signature. Anything refused here can be reached from C
in the same mod.

## Services across the boundary

Services are C tables in the game. `use svc.<name>` reads the service's header and gives you LumaScript functions with
one fixed set of rules, the same for every service:

- **Names.** A function `<name>.<member>`; your mod is passed for you. A struct `Luma<Name><T>` is `<name>.<T>`; an
  enum's cases drop their common prefix and become CamelCase (`LUMA_TIME_FRAMES` is `time.Clock.Frames`). A
  whole-number `#define` is a constant `<name>.<C>` (`time.TIMERS_MOST`). A handle kind is `<name>.<Kind>`.
- **Structs** are passed by value; the compiler sets their `size` field and zeroes their reserved fields.
- **Text and bytes**: `const char *` is `text`; a pointer followed by a length is one `text` or `bytes` argument.
- **Outs**: non-const pointers to numbers, enums or structs are not arguments but part of the result (one is `T`,
  several a tuple); an out buffer gives `text` or `bytes`.
- **Results.** Your own mistakes (a bad argument, the wrong thread, a bad handle, a limit) are reported by the service
  to the mod log and are never values you see. A function's other answers make its result `T?` (`none` for any
  answer), or `bool` when it has no outs (true for OK).
- **Requests** that answer later are called one of two ways: with a closure `f(args, fn(e: <name>.<Kind>Event) { })`,
  returning the request's handle (`none` when refused), with the closure run for each event at a frame's start; or,
  for a request that closes after its one event, without a closure as `wait f(args)`, which gives `R?`.
- An event record has `status` (`svc.Answer?`: `none` for OK), `value` and `flags`, and `data` for text or bytes
  that come with it.
- `svc.Answer` is one enum for every service: `Denied`, `Absent`, `NotFound`, `Exists`, `Io`, `Timeout`, `Closed`,
  `Memory`, `Busy`, `Format`, `TooLarge`, `Unreachable`.
- A member the service says is set by an `on` handler (`time.on_frame` is `on frame`) cannot be called (S0108); an
  event that goes to a request's own closure cannot be an `on` handler (S0107). A literal outside a parameter's
  stated range is S0111.

Each service's page lists its functions in this form; see [Services overview](services/overview.md).

## Platforms

Names never differ between platforms; offsets and sizes may, and the compiler never writes one into your mod (each is
bound by name when the mod loads). A constant whose value differs by platform is a build error when you build for
several platforms at once, naming the constant and its values, since one source cannot hold two values.

## See also

- [The game in scope](lumascript/game-objects.md)
- [Varargs](lumascript/varargs.md)
- [What the compiler emits](lumascript/compiled-form.md)
- [The game's description of itself](lumascript/game-description.md)
- [Services overview](services/overview.md)
