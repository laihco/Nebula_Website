---
title: lumalink run
nav_title: lumalink run
description: Start the game with your mod, and rebuild and reload its code while the game runs as you edit.
order: 7
level: essential
---

`lumalink run` starts the game with your mod. While the game runs, it watches your source folder and reloads the
mod's code each time you save, so you can try a change without restarting the game.

## Usage

```text
lumalink run [OPTIONS] <FOLDER>
```

## Example

```sh
lumalink run hello
```

LumaLink builds the mod, installs it into the game's mods folder for you, and starts the game in a development mode
for that mod. Then edit `source/main.lum` and save: LumaLink rebuilds, and the game swaps in the new code at the
start of a frame. LumaLink's window tells you how each reload went.

## Arguments

| Argument   | Description     |
| ---------- | --------------- |
| `<FOLDER>` | The mod folder. |

## Options

| Option                  | Default     | Description                                                                                                                        |
| ----------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `-h, --help`            |             | Print this help.                                                                                                                   |
| `--language <LANGUAGE>` | `UsEnglish` | The language LumaLink and the validator speak: one of the game's 14, by its name in the game (UsEnglish, EuGerman, JpJapanese...). |

## Notes

### What happens when you save

1. LumaLink waits until you stop saving (it builds 300 ms after the last change), then builds the mod with the same
   check as `pack`.
2. A build that fails changes nothing in the game: LumaLink shows the findings in its window, as `lumalink check`
   does. Fix them and save again.
3. A build that passes is installed, and LumaLink asks the game to reload the mod.
4. At the start of a frame, the game takes the mod out (its `on stop` runs, its hooks go), checks the new build as a
   start would, and loads it again (its `on start` runs). Mods that need yours are taken out first and started again
   after it.
5. LumaLink shows the result: the reload worked, or the code or message that refused it, in your language.

If you save again while a reload is still going on, LumaLink builds the change and holds it until the game has
taken the previous one.

### Content changes

Only code is reloaded while the game runs. A change to content (layers, models, effects) is built, but not sent to
the running game; LumaLink's window says "Content changes show the next time the game starts."

### Keeping state across a reload

A reload is a new life for the mod: its variables start again from their first values. To carry something across,
keep it in `on stop` and read it back in `on start`:

```lumascript source/main.lum
struct Saved {
    jumps: int
}

var jumps: int = 0

on stop {
    keep(Saved { jumps: jumps })
}

on start {
    if let s = kept<Saved>() {
        jumps = s.jumps
    }
    log "jumps so far: {jumps}"
}
```

- `keep(value)` may only be used in `on stop`, and `kept<T>()` only in `on start` (before any `wait`); elsewhere it
  is a build error.
- The value must be JSON data, at most 1 MiB once encoded. `keep` gives `false` when it is too big, and writes that
  to the mod log. The last `keep` wins.
- `kept<T>()` gives `none` when nothing was kept, or when what was kept is not a `T` any more (for example after you
  changed the struct); the second case is also written to the mod log.

### Permissions during development

You built the code yourself, so the game does not ask again whether to run it after each reload. If a new build
asks for a permission it did not ask for before, the game asks you for that one, as it would a player, and the
reload waits for your answer. See [Permissions](start/permissions.md).

### A reload that fails

If the new build fails the start's check, the old code is already gone: the mod stays not running, with the reason
on its Mods page and in the mod log, and mods that need it stay out too. Fix the problem and save again.

The command speaks one of the game's 14 languages (`--language`); its findings are the validator's, with the same
codes the game shows.

## See also

- [Check, build, pack and run](start/workflow.md)
- [Lifecycle, options and frames](lumascript/events.md)
- [Reloading in depth](reference/reload.md)
- [The mod log in depth](reference/mod-log.md)
- [How the game loads a mod](reference/loading.md)
- [lumalink build](lumalink/build.md)

## Full help text

```text
Start the game with a mod.

Usage: lumalink run [OPTIONS] <FOLDER>

Arguments:
  <FOLDER>  The mod folder.

Options:
  -h, --help                 Print this help.
      --language <LANGUAGE>  The language LumaLink and the validator speak: one of the game's 14, by its name in the game (UsEnglish, EuGerman, JpJapanese...). Default: UsEnglish.
```
