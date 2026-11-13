---
title: The game's description of itself
nav_title: Game description
description: The file in which the game lists every function, type, global, constant, nerve, message and table name a mod can use - what it holds and how LumaLink and the compiler use it.
order: 17
level: advanced
---

Every name a mod can use from the game comes from one place: the game's **description of itself**. It is generated
from the game's source each time the game is built, never written by hand. LumaLink and the LumaScript compiler read
it to check your code; nothing else is a source of names. This page shows what it holds, so you can look a name up
and understand the messages that come from it.

## Where it is

The file is `smg_game.luma-self.json`, beside the game module, one per platform build. The same data is compiled
into the game (the loader binds names by it), and the game writes it out on request with `--luma-describe <file>`.
The game's build compares the two, so the shipped file and the running game always agree. LumaLink carries the
description of each released game version, and reads the one for each version in your `luma.json` `nebula` range.

It is compact UTF-8 JSON, about 21 MB (about 1.2 MB compressed).

**Stable names.** Once a name and signature are in a released description, they keep their meaning in every later
one.

## What it holds

```json
{
  "self": 1,
  "module": {
    "game": "RMG",
    "platform": "windows-x64",
    "abi": "msvc-x64",
    "luma_api": 1,
    "hooks": true
  },
  "functions": [
    {
      "name": "Kuribo::exeWander",
      "signature": "void()",
      "owner": "Kuribo",
      "kind": "method",
      "virtual": true,
      "const": false,
      "static": false,
      "returns": "void",
      "params": [],
      "hooks": ["before", "after", "wrap", "replace"],
      "file": "Game/Enemy/Kuribo.cpp",
      "line": 212
    }
  ],
  "types": [
    {
      "name": "Kuribo",
      "kind": "class",
      "size": 412,
      "align": 4,
      "polymorphic": true,
      "bases": [{ "name": "LiveActor", "offset": 0, "virtual": false }],
      "fields": [
        {
          "name": "mVelocity",
          "type": "TVec3f",
          "offset": 36,
          "count": 1,
          "bits": null,
          "access": "protected"
        }
      ]
    }
  ],
  "globals": [{ "name": "MR::sDefaultGravity", "type": "f32" }],
  "names": {
    "nerves": [
      { "name": "NrvKuribo::KuriboNrvWander", "owner": "Kuribo", "exe": "Kuribo::exeWander" }
    ]
  }
}
```

(A shortened illustration of the shape; the real file has every entry.)

| Part        | Holds                                                                                                                                                                                  |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `module`    | which game (`RMG`), platform (`windows-x64`, `android-arm64`...), ABI and API level the file describes                                                                                 |
| `functions` | every function with a row: name, signature, class, kind, `virtual`/`const`/`static`, result, parameters, which hooks it takes, source file and line, and its pointer parameters' marks |
| `types`     | every class, struct, union, enum and alias: size, alignment, bases, fields (type, offset, count, bit-field width), enum values                                                         |
| `globals`   | every global and static data member a mod can bind, with its type and whether it is `const`                                                                                            |
| `left_out`  | everything without a row, each with its reason                                                                                                                                         |
| `data`      | constant game data in code (numbers and tables), such as `Mario::kReactionDecay`                                                                                                       |
| `names`     | the game's data names: nerves, messages and keyed tables                                                                                                                               |

### Functions

`name` plus `signature` is exactly what a mod binds. Type text is written as the game's source writes it after its
own typedefs (`TVec3f`, `f32`, `const char *`), so a script reads the same words as the source. When you need to name
an overload exactly, write its signature in backquotes as it appears here: `` `MR::isNear(const LiveActor *, const Vec3f &, f32)` ``.

Each function's `marks` say what it does with its pointer parameters (`in`, `out`, `inout`, `count`, `fixed`,
`nullable`, `kept`); see [Types across the boundary](lumascript/interop-types.md#marked-pointer-parameters).

### Types and fields

Every field of every class, struct and union the game defines is listed, not only those of game objects, with
bit-fields and arrays. A field reached through a base is found by C++'s rules: a derived class's field hides a base's
of the same name. A name found in two bases is "ambiguous", and one through a virtual base has no fixed offset; both
are left out with that reason, and an error naming such a field says which.

A template instance used by the game (`JGeometry::TVec3<f32>`) has a row of its own; every other spelling of it
(`TVec3f`, `JGeometry::TVec3<float>`) is an alias of that row, so any of them names the same field.

### Names: nerves, messages and tables

- **nerves**: every nerve of every class, with the class that owns it and the `exe` function it runs (when that is
  exactly one function). This is the list `nerve "Class.Step"` is checked against.
- **messages**: every `ACTMES_*` message with its value.
- **keys**: for tables whose rows each start with a plain string, the strings in order (the event flags, the event
  values, the object factory's names and more).

### What is left out

Each function or type without a row is listed with a fixed reason, for example:

- "the kernel's own" (the mod interface itself);
- "internal linkage: no name a mod can bind";
- "thread-local: one per thread, no one address";
- "no name a mod can write";
- "no size (incomplete or dependent)";
- "ambiguous: A::x, B::x";
- "through the virtual base V";
- "a type with no name a mod can write";
- "a template not used with these arguments";
- templates and allocation functions (see [Varargs](lumascript/varargs.md)).

## Platforms

Names are the same on every platform; offsets and sizes may differ between ABIs. A value that differs by platform is
given once, with per-platform values only where it differs. LumaLink building for several platforms reads one
description per platform, and a mod built for several platforms that uses a per-platform constant is a build error
naming the constant and its values.

## Placement facts

A second file, `smg_game.luma-placement.json`, beside the first, tells the content cooker how the game places
objects:

- **factory**: every name the object factory makes, in its order, with the class it makes;
- **placement_args**: for each class, which placement arguments (`Obj_arg0` to `Obj_arg7`, or a column by name) it
  reads, with their types and the field they set, its own and its bases';
- **left**: reads no class's method reaches.

This is what lets your stages give placement arguments by name. See [Stages](content/stages.md).

## How it is used

- **LumaLink's check and build** read it to check every game name, signature, field and type in your code, for each
  game version in range. A name missing in any is an error naming the version.
- **The validator** reads it to check a mod's import list when the mod is installed and at each start.
- **The game** binds the mod's names by the same data when it loads the mod: the whole list or nothing.
- [lumalink list](lumalink/list.md) `--game` takes it with `--self` to name the columns of the game's tables.

## See also

- [The game in scope](lumascript/game-objects.md)
- [Types across the boundary](lumascript/interop-types.md)
- [Loading a mod](reference/loading.md)
- [The validator](reference/validator.md)
- [lumalink list](lumalink/list.md)
