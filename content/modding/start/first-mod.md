---
title: Your first mod
nav_title: First mod
description: Make a mod that counts Mario's jumps - one folder, two files, three commands.
order: 3
level: essential
---

In this page you make a small but complete mod. It counts Mario's jumps and writes each one to the log. It's one folder with two files, built with three commands. Along the way you'll meet the main parts of every mod: the manifest, a LumaScript module, a hook on a game function, and the check-build-pack loop.

Before you start, [install the tools](start/install.md). In the commands below, `<names>` is your names folder and `<game.pak>` is your imported game.

## 1. Make the folder

Make a folder called `hello`. Everything the mod is lives inside it:

```text
hello/
  luma.json          the manifest: what the mod is
  source/
    main.lum         the mod's code
```

> [!TIP]
> `lumalink new` can start the folder for you. It makes the folder with a `luma.json` from your answers and an empty base layer (`layers/base/`):
>
> ```sh
> lumalink new --author you --id you.hello --name Hello --summary "Counts Mario's jumps." hello
> ```
>
> The folder must not exist yet. Compare its `luma.json` with the one below.

## 2. Write luma.json

`luma.json` tells the game and LumaLink what the mod is:

```json luma.json
{
  "format": "1.0",
  "id": "you.hello",
  "version": "1.0.0",
  "name": "Hello",
  "summary": "Counts Mario's jumps.",
  "authors": ["you"],
  "game": { "id": "RMG", "regions": ["RMGE01", "RMGP01", "RMGJ01"] }
}
```

| Field     | What it is                                                                                                                                                                                                                          |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `format`  | The version of the `.luma` format the mod is written for: `"1.0"`.                                                                                                                                                                  |
| `id`      | The mod's name for programs. 3 to 64 lowercase letters, digits, `-` and `.`, starting with a letter. Saves, options and other mods' `needs` are all keyed by it, so pick it once and keep it. A common style is `yourname.modname`. |
| `version` | Three numbers, `major.minor.patch`. See [Versions and sharing](start/sharing.md).                                                                                                                                                   |
| `name`    | What players see on the Mods screen. 1 to 64 characters.                                                                                                                                                                            |
| `summary` | One line on what the mod does, at most 200 characters.                                                                                                                                                                              |
| `authors` | Who made it: 1 to 16 names.                                                                                                                                                                                                         |
| `game`    | `id` is always `"RMG"` (Super Mario Galaxy). `regions` lists the game releases the mod works with: `RMGE01` (North America), `RMGP01` (Europe) and `RMGJ01` (Japan). Leave `regions` out to mean all three.                         |

These seven fields are all required. Everything else in `luma.json` is optional. The file is strict: a key that isn't part of the format is an error that names it, never silently ignored. [Anatomy of a mod](start/mod-anatomy.md) covers the common optional keys, and [the luma.json reference](reference/luma-json.md) covers every one.

## 3. Write the code

Make the folder `source/` and in it the file `main.lum`:

```lumascript source/main.lum
var jumps: int = 0

on start {
    log "hello"
}

hook before Mario::tryJump() {
    jumps = jumps + 1
    log "jump {jumps}"
}
```

Line by line:

| Code                               | What it does                                                                                     |
| ---------------------------------- | ------------------------------------------------------------------------------------------------ |
| `var jumps: int = 0`               | A variable at the top of a module is the mod's state. It lives as long as the mod is on.         |
| `on start { }`                     | Runs once when the mod is switched on, or when the game starts with it on.                       |
| `log "hello"`                      | Writes a line to the game's log, tagged with your mod. `{name}` inside the text puts a value in. |
| `hook before Mario::tryJump() { }` | Runs your code each time the game calls its own `Mario::tryJump`, just before the game's code.   |

`source/main.lum` is the module `main`, your mod's entry. The game's functions, such as `Mario::tryJump`, are in scope by their own names: you never import them. When you build, LumaLink checks that the game has a function with that name and signature.

`before` is one of four kinds of hook. `after` runs after the game's function and can change its result. `wrap` surrounds it, and `replace` takes its place. See [Hooking the game's functions](lumascript/hooks.md).

## 4. Check, build and pack

Run these in the folder that holds `hello`:

```sh
lumalink check --names <names> --game <game.pak> hello
lumalink build --names <names> hello
lumalink pack --names <names> --game <game.pak> hello
```

| Command | What it does                                                                                                                                    |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `check` | Reads the folder the way the game will and prints every problem with its file and line. It never stops at the first one.                        |
| `build` | Compiles `source/` to a native library for each platform, in `code/<platform>/`.                                                                |
| `pack`  | Checks again with every rule and writes the mod as a `.luma` file beside the folder, named `<id>-<version>.luma` (here `you.hello-1.0.0.luma`). |

If `check` reports a problem, each finding has a code, such as `L204` for a `luma.json` value that isn't allowed, or an `S` code for a mistake in your LumaScript. `lumalink explain L204` says what an L code means. See [Debugging](start/debugging.md).

## 5. Install it and play

1. Drop the `.luma` file on the game's window, or copy it into the game's `mods` folder.
2. Open the game's Mods screen and switch the mod on.
3. Because the mod has code, the game asks whether to allow it. The focus starts on **Not now**, so choose **Allow** for your own mod. See [Permissions](start/permissions.md).
4. Play and jump. Each jump writes a line, `jump 1`, `jump 2`..., to the game's log.

If something is wrong with the mod, the game says so: a line at the bottom-left of the screen while you play, and the full entry on the Mods > Log page. [Debugging](start/debugging.md) shows how to read them.

## 6. Make it yours: an option

Players can change a mod through options shown on the Mods screen. Add an option that turns the jump lines on and off.

In `luma.json`, add an `options` list:

```json luma.json
{
  "format": "1.0",
  "id": "you.hello",
  "version": "1.1.0",
  "name": "Hello",
  "summary": "Counts Mario's jumps.",
  "authors": ["you"],
  "game": { "id": "RMG", "regions": ["RMGE01", "RMGP01", "RMGJ01"] },
  "options": [{ "key": "announce", "kind": "toggle", "default": true, "name": "Log each jump" }]
}
```

In `source/main.lum`, declare the option and read it by its key:

```lumascript source/main.lum
option announce: bool

var jumps: int = 0

on start {
    log "hello"
}

hook before Mario::tryJump() {
    jumps = jumps + 1
    if announce {
        log "jump {jumps}"
    }
}
```

A `toggle` option is a `bool` in LumaScript. The compiler checks that the option's name and type match `luma.json`. Check, build and pack again, and the option appears on the mod's page on the Mods screen. Options can also be numbers, choices, text and bindable keys. See [Lifecycle, options and frames](lumascript/events.md).

The version went from `1.0.0` to `1.1.0`: a new feature that changes nothing existing is a minor version.

## 7. A faster loop

Packing and installing by hand after every change gets slow. `lumalink run` starts the game with your mod, watches its `source/` folder, rebuilds when you save, and reloads the mod's code while the game keeps running:

```sh
lumalink run hello
```

See [Check, build, pack and run](start/workflow.md) for how reloading works and what it keeps.

## What you've learned

- A mod is a folder with a `luma.json` and, if it has code, LumaScript modules in `source/`. `main.lum` is the entry.
- The game's functions are in scope by name. A `hook` runs your code when the game calls one.
- `lumalink check` finds problems, `build` compiles, and `pack` makes the `.luma` players install.
- Every problem has a code and is named with its file and line, in LumaLink and in the game.

## Next steps

- [Anatomy of a mod](start/mod-anatomy.md): every folder a mod can have, and the rest of `luma.json`.
- [Moon jump](tutorials/moon-jump.md): a small tweak that reads the controller through a service.
- [LumaScript at a glance](lumascript/overview.md): the language in one page.
- [Recipes](tutorials/recipes.md): short ideas you can build on.
