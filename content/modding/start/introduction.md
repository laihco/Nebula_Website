---
title: Introduction to modding Nebula
nav_title: Introduction
description: What a Nebula mod can do, the pieces every mod is made of, and how to find your way around these docs.
order: 1
level: essential
---

This page explains what a Nebula mod is and what the parts of the modding toolkit do. It also shows you which pages to read first. Read it once before you start. After that you'll know where each part of a mod lives and which page covers it.

> [!TIP]
> If you only want to install mods made by others, see the Player guide's Mods page. These docs are for people who want to make mods.

## A mod in a dozen lines

Here's a complete mod. While you hold its "Moon jump" button in the air (A, unless the player rebinds it), it pushes Mario straight up, away from wherever gravity pulls in that spot:

```lumascript source/main.lum
use svc.input

option moon_jump: input.Action        // a key option declared in luma.json

on frame {
    if let p = MarioAccess::getPlayerActor() {      // there may be no player: test it
        if input.read(moon_jump).down == 1 and not MR::isOnGroundPlayer() {
            p.mVelocity = p.mGravity * -12.0        // straight up, against this place's gravity
        }
    }
}
```

`MarioAccess::getPlayerActor` and `MR::isOnGroundPlayer` are the game's own functions, used by their own names. `svc.input` is a _service_, one of the game's ready-made interfaces for mods; the button is an _action_ the player can rebind in Controls ([Moon jump](tutorials/moon-jump.md) shows the `luma.json` part). `on frame` runs once every game frame. Add a short `luma.json` that says what the mod is called, and the toolkit's command-line tool, LumaLink, turns the folder into a `.luma` file that players can install. [Your first mod](start/first-mod.md) takes you through every step.

## What mods can do

Mods can be as small as a single changed number or as big as a new game mode. Some examples, all of them covered in the [tutorials](tutorials/moon-jump.md):

| You want to...                                                    | You use                                                                                      | Example                                                                                              |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Change how the game behaves                                       | **Hooks** on the game's functions: run code before or after them, wrap them, or replace them | [Moon jump](tutorials/moon-jump.md), [hide the HUD](tutorials/hide-the-hud.md), hard mode            |
| Add new gameplay                                                  | **LumaKit** modules: power-ups, actors, items, projectiles, HUD elements, menus, cutscenes   | [A new power-up](tutorials/a-new-power-up.md), [a new NPC](tutorials/a-new-npc.md)                   |
| Replace or add models, textures, sounds, music, screens or stages | **Content** in the mod's `layers/` folder, cooked on the player's device                     | [A new galaxy](tutorials/a-new-galaxy.md), [a video in a galaxy](tutorials/video-in-a-galaxy.md)     |
| Change the game's tables (enemy speeds, stage objects, text)      | **Patches** that change rows by key, never whole files                                       | [Table patches](content/table-patches.md)                                                            |
| Talk to other programs or the internet                            | **Services** such as `net`, with a permission the player allows                              | [LiveSplit link](tutorials/livesplit-link.md), [online leaderboard](tutorials/online-leaderboard.md) |
| Let players adjust your mod                                       | **Options** declared in `luma.json`, shown on the game's Mods screen                         | [Options](lumascript/events.md)                                                                      |

A mod doesn't need code. A mod that only replaces textures or changes a table is a folder of files and a `luma.json`.

## How a mod runs

A few facts about how mods work. Most of these docs build on them:

- **Native code, not a script interpreter.** LumaLink compiles a mod's code to a native library for each platform. Nothing is interpreted inside the game, so a mod runs at the game's own speed.
- **One file for every platform.** A `.luma` holds the mod's content and one built library per platform. Content (models, textures, sounds) is _cooked_, meaning prepared for the player's device and graphics, on the player's own machine.
- **The game by name.** Every function, field, class and global the game describes is in scope in LumaScript by its own name, such as `MR::isOnGroundPlayer` or `Mario::tryJump`. The compiler checks each use against the game's description. If you get a name or its arguments wrong, you see the error when you build, not when you play.
- **Checked the same way everywhere.** LumaLink and the game use the same _validator_. A problem `lumalink check` reports is the same problem, with the same code and words, that a player would see.
- **A failing mod never takes the game down quietly.** Every problem is named on screen and in the mod log, with the mod, the file and the line. A script error stops only the statement that failed. A crash in a mod's native code switches that mod off for the session, and the game goes on. See [Debugging](start/debugging.md).
- **Players stay in control.** Before a mod's code runs, the player is asked to allow it. A mod that wants the internet, the clipboard, the microphone or another sensitive service must declare a permission, and the player can say no. See [Permissions](start/permissions.md).

Mods run on all nine platforms the game supports: `windows-x64`, `windows-arm64`, `linux-x64`, `linux-arm64`, `macos-arm64`, `macos-x64`, `android-arm64`, `android-x64` and `ios-arm64`. By default LumaLink builds for all of them from one machine.

## The pieces

| Piece             | What it is                                                                                                                                                                               | Read                                                                                          |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **`.luma` file**  | The packaged mod: one zip file holding everything a mod brings. Players install this.                                                                                                    | [Anatomy of a mod](start/mod-anatomy.md), [the .luma format](reference/luma-format.md)        |
| **`luma.json`**   | The mod's manifest: its id, version, name, the game regions it supports, its options, permissions, needs and layers.                                                                     | [luma.json essentials](start/mod-anatomy.md#luma-json), [every field](reference/luma-json.md) |
| **LumaScript**    | The language mods are written in. It's safe (no raw pointers, no manual freeing) and compiled to native code, with the game in scope by name. Files end in `.lum` and live in `source/`. | [LumaScript at a glance](lumascript/overview.md)                                              |
| **LumaKit**       | A library mod of ready-made gameplay building blocks: player forms, items, actors, HUD, cameras, menus, cutscenes, stages and more. Your mod uses it with `use kit.<module>`.            | [LumaKit overview](lumakit/overview.md)                                                       |
| **Services**      | Interfaces the game gives every mod for input, saves, files, network, audio, time, drawing and UI. Your mod uses them with `use svc.<name>`.                                             | [Services overview](services/overview.md)                                                     |
| **Content**       | Models, animations, materials, effects, sound, screens, fonts and stages. Each comes in an ordinary source format (glTF, PNG, WAV...) or the game's own, placed in the mod's `layers/`.  | [Content overview](content/overview.md)                                                       |
| **LumaLink**      | The command-line tool. It creates, checks, builds, packs, runs and tests mods, and lists or extracts what's in the game.                                                                 | [Install the tools](start/install.md), [LumaLink overview](lumalink/overview.md)              |
| **The validator** | The rule checker that LumaLink and the game share. Each rule has a code (`L203`) and a message in each of the game's 14 languages.                                                       | [Error codes](reference/error-codes.md)                                                       |
| **The mod log**   | The in-game record of everything said about each mod this session, on screen and on the Mods > Log page.                                                                                 | [Debugging](start/debugging.md)                                                               |

### Already have a mod for the original game?

LumaLink can convert many published mods (Riivolution patches, texture packs, Gecko code lists) into a `.luma`. Table files become patches by key, and a texture pack becomes texture replacements. See [`lumalink convert`](lumalink/convert.md).

## How these docs are organised

The docs are in eight sections. Each one starts with an overview page.

| Section                            | What it covers                                                                             | Start with                                                                                       |
| ---------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| **Getting started** (this section) | Concepts, tools, your first mod, the edit-build-test loop, debugging, permissions, sharing | Read it in order                                                                                 |
| **Tutorials**                      | Complete mods, explained step by step, from a one-screen tweak to a whole galaxy           | [Moon jump](tutorials/moon-jump.md), then [Recipes](tutorials/recipes.md)                        |
| **LumaScript**                     | The language: a guide first, then the advanced corners                                     | [Overview](lumascript/overview.md), [Basics](lumascript/basics.md), [Hooks](lumascript/hooks.md) |
| **LumaKit**                        | The gameplay library, one page per module                                                  | [Overview](lumakit/overview.md)                                                                  |
| **Services**                       | `svc.*`, one page per service                                                              | [Overview](services/overview.md)                                                                 |
| **Content**                        | Each kind of content a mod can bring                                                       | [Overview](content/overview.md)                                                                  |
| **LumaLink CLI**                   | One page per command, with every option                                                    | [Overview](lumalink/overview.md)                                                                 |
| **Reference**                      | Complete formats, every error code, and how the game loads, guards and reloads mods        | [luma.json](reference/luma-json.md), [Error codes](reference/error-codes.md)                     |

### Which pages to read first

1. This page, then [Install the tools](start/install.md).
2. [Your first mod](start/first-mod.md). Build it and see it run.
3. [Anatomy of a mod](start/mod-anatomy.md) and [Check, build, pack and run](start/workflow.md). These cover the folder and the loop you'll use every day.
4. [Debugging](start/debugging.md), before you need it.
5. [LumaScript at a glance](lumascript/overview.md) and [Hooking the game's functions](lumascript/hooks.md).
6. A [tutorial](tutorials/moon-jump.md) close to what you want to make.

Pages are marked **essential**, **intermediate** or **advanced**. Essential pages are what most modders need. Advanced pages explain internals you can skip until you're curious or stuck. [The glossary](start/glossary.md) explains every term these docs use.

## See also

- [Install the tools](start/install.md)
- [Your first mod](start/first-mod.md)
- [Glossary](start/glossary.md)
