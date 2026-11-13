---
title: Reloading in depth
nav_title: Reloading
description: How lumalink run reloads your mod's code while the game keeps running - the steps of a reload, what is checked, what a reload keeps and what starts fresh, and how to carry state across with keep and kept.
order: 7
level: advanced
---

While you work on a mod, `lumalink run` rebuilds it each time you save and swaps the new code into the running game,
so you see a change without restarting. This page explains each step of that swap, what your mod can rely on across
it, and what it cannot.

## The short version

```sh
lumalink run gold-flower
```

1. LumaLink builds the mod, installs it, and starts the game with your mod in development mode.
2. You save a source file. LumaLink rebuilds about 300 ms after your last change, with the same checks as
   `lumalink pack`. A build that fails changes nothing in the game; LumaLink shows the problems, as `lumalink check`
   does.
3. The game takes your old code out, checks the new build, and starts it.
4. LumaLink's window shows how the reload ended, with any refusal in your language.

> [!NOTE]
> **Code reloads; content does not.** Changes to content (layers, models, effects) are built but not swapped in;
> LumaLink says "Content changes show the next time the game starts."

## Carrying state across a reload

A reload is a new life for your mod: everything in its memory is gone. To carry something across, keep it in
`on stop` and read it back in `on start`:

```lumascript source/main.lum
struct Saved { jumps: int }

var jumps: int = 0

on stop {
    keep(Saved { jumps: jumps })
}

on start {
    let s = kept<Saved>()
    if s != none {
        jumps = s!.jumps
    }
}
```

| Call                  | Where                                         | What it does                                                                                                                                                                                                                                   |
| --------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `keep(value) -> bool` | `on stop`'s own body only                     | Hands the value to the game until the next load. The value must be json data (numbers, text, lists, maps, your structs and enums of those). True when kept; false when it is over 1 MiB encoded (the mod log says so too). The last call wins. |
| `kept<T>() -> T?`     | `on start`'s own body only, before any `wait` | What the previous load kept this session, as a `T`. `none` when nothing was kept, or when the bytes are not a `T` (for example after you changed the struct; the mod log says so).                                                             |

Using either anywhere else is a build error (S0132). Kept bytes go once they are read, or when the mod is removed from
the list. Without a reload, `kept` gives `none`.

In C, the same calls are `core->keep(mod, bytes, size)` (in `stop` only; at most 1 MiB; 0 kept, -1 not in `stop` or
too big, -3 not on the game thread) and `core->kept(mod, &size)` (in `start` only; null when nothing was kept; valid
until `start` returns).

## What starts fresh

Everything else starts from nothing, as at a first start:

- the mod's own memory and module state;
- every service's state for the mod: the `time` service is back at the real rate, with no hold, no timers and no
  handlers; `system` has no requests open;
- its hooks, which are bound again from the new build (each once, never twice).

The mod log keeps what was said before the reload, marked with the reload's number, so you can still read what went
wrong in the old build.

## The steps of a reload

The game does each reload at the start of a frame, on the game thread, never inside a hook.

1. **Take out.** The mod, and every mod that uses it, are taken out: their hooks go, each one's `stop` runs (so
   `keep` is called), and after a grace period their memory is freed and their libraries closed. The game keeps
   running during the grace period, with your mod not running; it never stalls. See
   [How the game loads a mod](reference/loading.md#when-a-mod-is-taken-out).
2. **Check.** The new build is checked as a start checks a mod: its `luma.json` and its code, against this game and the
   other mods. If the check fails, the mod stays out with the reason on its Mods page and in the mod log; the old code
   is already gone. Mods that use it stay out too, each with the reason that a mod it needs is not running.
3. **Consent.** The new code is a new build, but you built it, so the answer for its code carries over. A permission
   it did not declare before is asked as for any mod: the menu opens on the Mods tab, and the reload waits for your
   answer. Declining a permission the mod needs leaves it off ("Off: you did not allow {permission}").
4. **Start.** The new build is loaded at the mod's old place in the list, then the mods that use it, in start order.
   Their `on start` runs, where `kept` returns what step 1 kept.

### Memory a mod still held

When a mod is taken out, the game frees everything it allocated through the game. If it still held any, the game's
log says how much:

```text
[mod <id>] held <n> blocks (<bytes> bytes) when it ended; the game freed them
```

That line is a hint that your `stop` could free more itself. C++ global destructors run in the reverse order of
construction, after `stop`.

## How LumaLink and the game talk

You do not need these files, but knowing them helps when something seems stuck.

- **Development mode.** `lumalink run` starts the game with `--mod-dev <id>`. Only then does the game watch for
  reloads, and it loads your mod from a copy of its installed folder in `<appdata>/luma-dev/<id>/<n>/`, so the
  installed files can be rebuilt in place. Copies are deleted when the game ends, and at the start of the next
  development session (in case the game crashed). Without the flag, none of this happens and it costs nothing.
- **The request.** After installing a build, LumaLink writes `<settings>/mods/<id>/reload.request`. The game looks for
  it once every 30 frames, copies the installed folder whole, deletes the request, then reloads from that copy. While a
  request is waiting, LumaLink installs nothing: a change you make meanwhile is built and held. So the game never
  checks one build and loads another.
- **The result.** The game writes `<settings>/mods/<id>/reload.result`: whether it worked, which mods were taken out
  and started, how many frames it took, and the refusal's code and values if it failed. LumaLink shows it in your
  language and deletes the file.

A request for a mod that is not running (refused, never started, already taken out) does nothing, and the game's log
says so once. On the Mods page, a mod taken out while the game runs reads "Taken out while the game runs."

## See also

- [Check, build, pack and run](start/workflow.md)
- [lumalink run](lumalink/run.md)
- [How the game loads a mod](reference/loading.md)
- [Lifecycle, options and frames](lumascript/events.md)
- [The mod log in depth](reference/mod-log.md)
