---
title: How the game loads a mod
nav_title: Loading
description: What happens to your mod when the game starts - the order of a start, the Mods list rule, start order and needs, binding, what a refusal does, hook order and results, threads, taking a mod out, and the game's two modules.
order: 5
level: advanced
---

This page follows a mod from the moment the game starts to the moment its code runs, and back out again. It is what
you can rely on: the order things happen in, which mod wins when two overlap, and exactly what is left of a mod that
is refused.

## The order of a start

With at least one mod on, the game does this before the first scene:

1. **Nebula's own parts.** The mod importer, the shader compiler, the placeholder files and free space for the mods'
   prepared files must all be there. If one is missing, every mod is off this session, with one line saying which
   part ("`{part} is missing or damaged, so mods are off this time.`"), and the game starts without mods.
2. **Consent.** A mod whose code, or a permission it needs, the player has not allowed is off this session ("Off:
   waiting for your answer"), and its content is not prepared. See [Permissions and consent](reference/consent.md).
3. **The start check.** The validator checks each mod that is on against this game, this device, the player's options
   and the other mods (see [How the validator works](reference/validator.md#at-each-start-and-each-change-of-the-mod-list-or-options)).
   A mod with an Error is off this session, named.
4. **The cook.** The mods' content is prepared ("cooked") for this device.
5. **Cook failures.** If any file of a mod fails to cook (L804, a shader that does not build, a file left out), that
   mod is off this session with each failure named, and the content is cooked again **without it**, so nothing of a
   half-prepared mod is used. The next start with the same mods and the same failure costs one cook, not two.
6. **References.** Names your content uses that are missing get their placeholders.
7. **Code.** The code of every mod still on is bound and started, in the order below. A mod refused here is off; if
   its content was already cooked, everything only it made is dropped at once, and anything it shared with other mods
   (a merged table, a message file several mods patch) is cooked again without it before the first scene.
8. **The title.** If anything went wrong, one notice: "`{count} mod problems: Mods > Log`".

> [!NOTE]
> A mod is either **fully on** (content cooked, code bound and started) or **off**, with its reasons on the Mods page
> and in the mod log. There is no third state: nothing of an off mod is used, and its content is not in the next
> start's cook.

With no mod on, none of this runs, and it costs nothing.

## The Mods list decides

The player's Mods list, top first, settles every overlap with one rule: **the mod higher in the list wins** a file, a
table cell and a function replacement. The game binds code from the top of the list down, so:

| Hook      | Order when two mods hook the same function                                                                                          |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `replace` | The higher mod's replace holds the function. A lower mod's replace of it is refused (L805, naming the higher), and that mod is off. |
| `before`  | The higher mod's runs first.                                                                                                        |
| `after`   | The higher mod's runs **last**, so its changes to the result stand.                                                                 |
| `wrap`    | The higher mod's wrap is outermost: it sees the call first and the result last.                                                     |

Within one mod: `before` hooks run in the order they are declared, `after` hooks in the reverse order, and the first
`wrap` is the outermost.

`load.after` and `load.before` in [luma.json](reference/luma-json.md#load) state the order your mod expects when both
mods are on.

## Start order

Mods with code start one at a time. The next to start is the first mod in list order whose `needs` have all started;
then the game looks again from the top. With no `needs`, this is exactly the list order. A library mod your mod needs
therefore always starts before it, even if it is lower in the list. Start order does not change hook order: hooks
follow the list position.

| Situation                    | What the player sees                                               |
| ---------------------------- | ------------------------------------------------------------------ |
| A needed id is not installed | "`THIS MOD NEEDS: <id>`"; the mod does not start.                  |
| A needed mod did not start   | "`<mod> (<file>) not started: it needs <id>, which did not start`" |
| Mods that need each other    | Each is off with **L800**, naming the cycle ("a -> b -> a").       |

## Binding: whole or not at all

Your code library lists what it imports from the game: functions to call, functions to hook, fields, classes, and
services. Binding happens in three passes on the game thread:

1. every import is resolved;
2. every hook is checked against what would refuse it (a wrap on a constructor, a replace another mod holds...);
3. the import slots are filled and the mod's start runs.

Only when all three pass are the mod's hooks published. A refusal in any pass publishes nothing, so a refused mod
never runs a single hook, not even for a moment on another thread. The first problem found is the one reported:

| Code | Refused because                                                                                                                                                                                                       |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L505 | The game has no such function, field, class, size, hook target or service, or another mod has no such function. The message gives the name and signature, and lists the game's signatures when the name exists.       |
| L506 | A service whose permission the mod does not declare.                                                                                                                                                                  |
| L508 | The library needs a newer LumaCore.                                                                                                                                                                                   |
| L512 | `luma_mod` cannot be used (not built with `luma.h`, unreadable, a malformed import, a wrap or replace on a constructor or destructor, a hook on a result that has no empty value), or the mod's start refused to run. |
| L805 | A function another mod higher in the list already replaces.                                                                                                                                                           |
| L500 | More than 256 mods with code would be on.                                                                                                                                                                             |

An import marked **optional** that does not bind refuses nothing: its slot is empty (`none` in LumaScript), and your
code decides what to do without it.

### What a refusal looks like

The game says a refusal once, as a code and its values, and words it with the validator's own text: the game's log
gets the line in English, and the Mods page and the mod log show it in the player's language. The mod is off; see
[The mod log in depth](reference/mod-log.md).

## Hooks and their results

**Before any hook runs, the result is set to an empty value.** For a function that returns a number, a vector or a
plain struct, the result is zeroed (and default-constructed) first. So a `before` that skips, or a `wrap` or
`replace` that does not proceed, without setting the result, gives the caller zero (a vector of 0, 0, 0), never
garbage.

Two kinds of result have no empty value:

| Result                                                    | What happens                                                                                                                                                                                           |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A reference (such as `const TVec3f &`)                    | If no hook set it and none proceeded, the game runs the function itself and the caller gets its real result. The mod log says so once (`Hook.NoResult`, code 2), naming the hook that did not proceed. |
| A class with no default constructor, or with a destructor | A `wrap` or `replace` on the function is refused at bind (L512). A `before` that skips is not taken: the function runs, and the mod log says so once (`Hook.SkipRefused`, code 3).                     |

A call that is already running keeps the list of hooks it started with: a hook added or removed meanwhile changes
nothing for that call.

## Threads

The game calls every entry of your mod **on the game thread**: start and stop, each frame, service events, and the
constructors, destructors and virtual functions of classes your mod makes. A hook is the one exception: it runs on
whatever thread calls the hooked function (the sound thread calls some).

- A LumaScript hook called off the game thread returns at once without running, and the mod log says so once per
  hook (**S0901**).
- A C hook decides for itself; `core->game_thread()` returns 1 on the game thread.

## Services and permissions

A service your code imports is bound with everything else. If it needs a permission:

- not declared in `luma.json`: the mod is refused (**L506**);
- declared but declined by the player: a required one keeps the mod off before the start check ("Off: you did not
  allow {permission}"); an optional one leaves the slot empty;
- asked for later, at run time, without the player's grant: the call gets nothing, and the mod log says so
  (`Hook.ServiceNotGranted`, code 4).

See [Permissions and consent in depth](reference/consent.md).

## When a mod is taken out

A mod's code is taken out when it is reloaded or switched off while the game runs (see
[Reloading in depth](reference/reload.md)). The steps are always in this order:

1. Its hooks are removed: no new call reaches it.
2. Its `stop` runs (`on stop` in LumaScript), on the game thread. Other threads may still be finishing a call inside
   its hooks, so `stop` must not free anything they read.
3. Library mods it used are told it is gone.
4. A grace period passes, until no thread can still be inside its code.
5. Its C++ global destructors run.
6. Everything it allocated through the game is freed, and the log says how much it still held.
7. Its library is closed.

Mods that need it are taken out first, in the reverse of their start order. Taking out a mod while a mod that uses it
stays on is never allowed.

A mod switched off by [the guard](reference/guard.md) is taken out too, but none of its code runs again: not its
`stop`, and not its destructors (its code just failed).

## The game's two modules

The game itself comes as two builds of the same code, side by side:

| Module           | Used when                                                                 | What it has                                                                                  |
| ---------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| The rows module  | At least one enabled mod has code for this device that the player allowed | Everything a mod's code binds to: the game's function, type and number rows, and its exports |
| The plain module | No mod with code is on                                                    | The game alone, with none of that, so a player without code mods pays nothing for them       |

The choice is made once, before the game loads, and the game's log says which: `game module: plain (no mod with code
on)` or `game module: rows (<reason>)`, naming the first mod with code. Because of this, **turning on a mod with code
takes effect at the next start**, and the Mods screen says so.

If the game crashed last time while mods' code was on, the next start uses the plain module, so no mod's code runs.

## In depth: for mods written in C

These rules come from `luma.h`; `lumalink build` follows them for LumaScript and for C in the same mod. See
[What the compiler emits](lumascript/compiled-form.md).

- **No system imports.** A mod's entry library imports nothing from the system on Windows, Linux and Android.
  `luma.h` gives `memcpy`, `memmove`, `memset`, `memcmp`, the Windows stack probe for frames over 4 KiB, C++
  `new`/`delete` (every form) over the game's allocator, and `atexit`/`__cxa_atexit`.
- **No code at load.** The system's loader must run nothing from the library: global constructors run from `luma.h`'s
  own runner after the game hands the library its core, before `start`. A library the system would run code from at
  load is refused (L509).
- **Build flags.** `-shared -nostdlib -ffreestanding -fno-exceptions -fno-rtti -fno-threadsafe-statics
-fno-stack-protector -fvisibility=hidden`, linked with lld; on Windows `/NOENTRY`; on ELF platforms also
  `-fno-use-init-array -Wl,-T,luma_ctors.ld -Wl,-z,defs -Wl,--version-script=luma_mod.map -Wl,-Bsymbolic` (both files
  ship beside `luma.h`). Apple targets: macOS 12.0 and iOS 15.0.
- **Memory.** `core->alloc(mod, size, align)` and `core->free(mod, p)` work from any thread; `align` is a power of two
  up to 65536. A size of 0, a bad alignment, or freeing a pointer the mod does not hold logs one line naming the mod
  and does nothing. What a mod still holds is freed when it is taken out. A throwing `new` with no memory stops the
  game with a crash report naming the mod (code 1); the nothrow forms return null.
- **Reports.** `core->report(mod, file, line, code, args, count)` puts a line in the mod log, from any thread; repeats
  of one file, line and code are counted, not repeated.
- **Limits.** At most 256 mods with code on at once.

## See also

- [The .luma file format](reference/luma-format.md#code)
- [How the validator works](reference/validator.md)
- [The guard in depth](reference/guard.md)
- [Reloading in depth](reference/reload.md)
- [Hooking the game's functions](lumascript/hooks.md)
- [Permissions and consent in depth](reference/consent.md)
