---
title: What the compiler emits; C in the same mod
nav_title: Compiled form and C
description: How LumaLink turns LumaScript into a native library for each platform, what that library does at run time, how to add C or C++ to a mod, and how library mods export functions.
order: 16
level: advanced
---

LumaScript is compiled, not interpreted. LumaLink turns your mod's source into C, compiles it with its own pinned
clang into one native library per platform, and packs those libraries in the `.luma`. This page describes that
output, the small run-time support every mod carries, how to put C or C++ in the same mod, and how a library mod's
functions are offered to other mods. You do not need any of it to write a mod; it helps when you debug, profile or
mix languages.

## Example: C in the same mod

```c source/fastmath.h
float fast_noise(float x, float y);
```

```lumascript source/main.lum
use c "fastmath.h"                         // declarations from the mod's own C or C++ files
extern c fn fast_noise(x: f32, y: f32) -> f32

var balls: list<int> = []
export c fn ball_count() -> i32 { return balls.len() as i32 }   // callable from the mod's C

on frame {
    let n = fast_noise(1.0, 2.0)
}
```

## The build

1. **Check**: parse and check types and names against the game's description of every game version in your
   `luma.json` `nebula` range. Every error is listed (see [Errors](lumascript/errors.md)).
2. **Generate C**: one C file per module, with `#line` markers pointing back to your `.lum` files; one `imports.c`
   holding every game name the mod uses; and the mod's entry with its `start` and `stop`.
3. **Compile and link** each platform in `luma.json`'s `code.platforms` with LumaLink's own clang and lld (one pinned
   LLVM version per LumaLink release), together with the run-time support and your C sources, into
   `code/<platform>/mod.<ending>`.
4. **Validate**: the validator checks the result before packing, as for any mod. A finding stops the pack.

| Platform                       | Target                                  |
| ------------------------------ | --------------------------------------- |
| `windows-x64`, `windows-arm64` | `x86_64-` / `aarch64-pc-windows-msvc`   |
| `linux-x64`, `linux-arm64`     | `x86_64-` / `aarch64-unknown-linux-gnu` |
| `android-arm64`, `android-x64` | `aarch64-` / `x86_64-linux-android31`   |
| `macos-arm64`, `macos-x64`     | `arm64-` / `x86_64-apple-macos`         |
| `ios-arm64`                    | `arm64-apple-ios`                       |

> [!NOTE]
> The Apple deployment targets are not settled yet; until they are, LumaLink refuses the macOS and iOS platforms and
> says why.

The library exports exactly one symbol, `luma_mod`; everything else is hidden. It imports nothing but what the game's
`luma.h` provides: no C library, no operating-system call. That is why the same source behaves the same on every
platform.

### Reproducible builds

The same sources, the same LumaLink release and the same game descriptions give byte-identical libraries on every
host system: the flags are fixed, and no time, path, UUID or build id is written. Generated C is in a fixed order
(modules by name, functions in source order, imports sorted).

## The import list

The compiler writes the mod's import list from what your code uses; you never write it. Each game name is one row,
bound when the mod loads:

| Your code                             | Imports                                                      |
| ------------------------------------- | ------------------------------------------------------------ |
| a call `MR::getPlayerPos()`           | the function, by name and the exact signature the call chose |
| a field `self.mVelocity`              | the field, by `"LiveActor.mVelocity"` and its type text      |
| a global `GameSystem::sInstance`      | the global, by name and type                                 |
| `ref<C>`, `class X : C`               | the class                                                    |
| `class X : C`, a game struct by value | the size                                                     |
| `hook` / `wrap` / `replace`           | a hook of that kind                                          |
| `optional MR::foo`                    | an optional row: `none` when the game lacks it               |
| `use svc.net`                         | the service                                                  |

The compiler never writes an offset, a size or an address taken from the game's description: every place is reached
through a row the loader binds. So a mod built against one build of the game loads on another with the same names and
types. A name whose type changed refuses the mod with the validator's `L505`, naming it.

## Hooks in the output

- All of one mod's hooks of one kind on one function become a single hook that runs your bodies in the order written.
  Several `wrap`s become one wrap whose `proceed()` runs the next body.
- Each function your mod hooks has a flag that stops your mod's hooks running again for a call your own hook makes
  (see [Hooks](lumascript/hooks.md#a-hook-that-calls-the-function-it-hooks)). The flag is cleared while the game's own
  code runs inside `proceed()`, so the game's calls run every mod's hooks.
- A hook in a `class` starts by testing that the object is one of the class's.
- Every hook, task step and handler first tests that it is on the game thread.

## Script errors in the output

Every generated function that can fail returns a status, and each caller passes a failure straight up to the
boundary (the hook, handler or task step), which then ends as [Errors](lumascript/errors.md) describes. There is no
`longjmp` and no exception: nothing unwinds past the game's frames. Overflow is checked with the compiler's checked
arithmetic.

## The run-time support

Every LumaScript mod carries its own copy of a small run-time support library, compiled with it for each platform,
so a mod never depends on another mod's. It holds:

- **Memory**: pools for small blocks (16 to 512 bytes) taken in 64 KiB pages from the game's per-mod allocator, and
  larger blocks straight from it. Text, bytes and containers carry a count and are copied on write.
- **Scratch**: chunks for text handed to the game for one call, kept until the mod stops and reused as a stack.
- **Handles**: a table of slots, each with a generation number. A `ref` names a slot and a generation, so an object
  that is gone (its slot cleared, its generation bumped) is seen at once. The table watches destructors only while it
  holds a handle.
- **Tasks**: each task is a record of its locals and a step number, and a function that runs from one `wait` to the
  next. The support runs live tasks from the mod's frame pass, in the order started.

## Start and stop

At **start** the library stores what the game gives it, opens each service the script uses (a missing service stops
the start, naming it), then makes the module-level values and runs every `on start` in module order. A script error
there leaves the mod off, naming the line.

At **stop** it stops every task, removes every hook it added, and releases every value. The game then frees whatever
memory the mod had.

## C and C++ in the same mod

Put `.c`, `.cpp` and `.h` files in `source/` next to your `.lum` files. They are compiled with the same flags into
the same library (C++ as C++20 without exceptions, RTTI or the standard library).

| You write                        | Means                                                                      |
| -------------------------------- | -------------------------------------------------------------------------- |
| `use c "fastmath.h"`             | read C declarations from the mod's own header                              |
| `extern c fn f(x: f32) -> f32`   | declare a C function your script calls                                     |
| `export c fn f() -> i32 { ... }` | a LumaScript function your C may call; the compiler writes a header for it |
| `c struct S { ... }`             | a struct laid out as C lays it out, so it can cross                        |

What crosses between LumaScript and your C:

- integers, floats, `bool`, vectors, `mat34`, `color`, and `c struct`s;
- `text` and `bytes` as a pointer and a length, valid for the call;
- `ref<C>` as an opaque handle, with `lumart_ref_get` in C to get the object;
- **no container**.

Your C sees `luma.h` and `lumart.h` (text and bytes as `(const char*, uint64_t)`, `lumart_ref_get`, `lumart_alloc`),
and may hook, call and read the game by name itself. It may not call the C library (`malloc`, `printf`): it has the
run-time support's functions and `luma.h` instead.

> [!WARNING]
> C code is not checked like LumaScript. A fault in your C (a bad pointer, say) is caught by the **guard**, which
> takes your mod's hooks out and switches it off. See [The guard](reference/guard.md).

`export c fn` functions are hidden: your own C can call them, the game cannot.

## Functions for other mods

A mod with LumaScript code can be a **library** for other mods. Every `pub fn` at a module's top level, and every
`pub fn` of a `pub` type, is exported. Another mod uses them with `use <mod id>.<module>`, with your mod in its
`needs`.

- **Names** are paths inside the mod: `hud.meter`, `player.form.define`, `item.ItemId.spawn`.
- **Signatures** are checked by a hash of the function's types (`lumi1:` and 16 hex digits). The hash names types; it
  does not lay them out, so adding a struct field with a default, or a case to an open enum, keeps every hash, and
  older callers still bind. A changed signature refuses the caller at load with `L505`.
- **The interface file** `<mod id>.lumi` is written next to the libraries and packed in the `.luma`: the module
  tree and every exported declaration (types with their fields, defaults and cases; functions with parameter names
  and defaults), with no bodies. A caller's compiler reads it from the needed mod's `.luma`.
- **Compatibility is checked.** Building a new version of a library compares its interface with the previous
  version's. Anything other than added functions, fields added at the end and cases in open enums stops the build
  with "a new major version is needed".
- **Errors** a library raises are reported at the **caller's** line. A closure a caller gives the library reports its
  own errors for its own mod, and is dropped when that mod stops.

See [Versions, dependencies and sharing](start/sharing.md).

## See also

- [Types across the boundary](lumascript/interop-types.md)
- [Memory and lifetimes](lumascript/memory.md)
- [lumalink build](lumalink/build.md)
- [The .luma format](reference/luma-format.md)
- [Loading a mod](reference/loading.md)
- [The guard](reference/guard.md)
