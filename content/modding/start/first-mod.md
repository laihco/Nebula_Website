---
title: Quickstart for Nebula mods
nav_title: First mod
description: Build and install a small LumaScript mod, then verify that it writes to the mod log.
order: 3
level: essential
---

## Prerequisites

[Install the modding tools](start/install.md) and locate the names folder for your Nebula build and the `game.pak` created when you imported your copy of the game. You need a Nebula build with the Luma mod loader to try the finished mod.

> [!NOTE]
> This quickstart describes the Nebula v2 modding toolkit preview. LumaLink and the SDK download links will be published with the toolkit.

## Create the mod folder

Create a folder named `hello` with this structure.

```text
hello/
  luma.json
  source/
    main.lum
```

In `hello/luma.json`, add the manifest that identifies the mod and lists its compatible game regions.

```json luma.json
{
  "format": "1.0",
  "id": "you.hello",
  "version": "1.0.0",
  "name": "Hello",
  "summary": "Logs Mario's jump attempts.",
  "authors": ["you"],
  "game": { "id": "RMG", "regions": ["RMGE01", "RMGP01", "RMGJ01"] }
}
```

In `hello/source/main.lum`, add this code.

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

The mod logs `hello` when it starts. Its `before` hook logs each call to `Mario::tryJump()` before the game processes the attempt.

## Check, build, and package the mod

From the directory containing `hello`, run the following commands. Replace `PATH_TO_NAMES` with the path to your names folder and `PATH_TO_GAME_PAK` with the path to your imported game file. Keep the quotes if a path contains spaces.

```sh
lumalink check --names "PATH_TO_NAMES" --game "PATH_TO_GAME_PAK" hello
lumalink build --names "PATH_TO_NAMES" hello
lumalink pack --names "PATH_TO_NAMES" --game "PATH_TO_GAME_PAK" hello
```

`check` reports validation findings, `build` compiles the code, and `pack` writes `you.hello-1.0.0.luma` beside the `hello` folder. If a command reports an error, see [Debugging a mod](start/debugging.md).

## Install and verify the mod

1. Drop `you.hello-1.0.0.luma` onto the game window or copy it into the game's `mods` folder.
1. Open **Mods** and enable **Hello**. Choose **Allow** when Nebula asks whether to run your mod's code.
1. Jump in-game and open **Mods > Log**. Look for `hello` and a line such as `jump 1` from your mod.

## Next steps

- [Add a mod option](tutorials/add-a-mod-option.md) so players can toggle the jump messages.
- [Run and reload your mod](start/workflow.md) while you edit its code.
- [Explore the mod folder and manifest](start/mod-anatomy.md) before adding more files.
