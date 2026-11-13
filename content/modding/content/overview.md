---
title: Content overview
nav_title: Overview
description: Where models, sounds, effects, screens and tables go in a mod, what cooking does to them, and how to check them before you pack.
order: 1
level: essential
---

Content is everything in a mod that is not code: models, animations, textures and materials, particle effects,
sounds and music, screens and fonts, stage placement and the game's data tables. This page explains where each kind
lives in your mod folder, what the game does with your source files ("cooking"), how replacing the game's content
differs from adding your own, and how to catch problems before you pack.

## A first look

A mod that adds a ring model, a sound and an effect, and changes one of the game's tables, looks like this:

```text
my-mod/
  luma.json
  source/
    main.lum
  layers/
    base/
      assets/                         your own new content, named by mod path
        ring.glb
        sfx/ding.sound.json
        sfx/ding.wav
        effects.json
      files/                          whole files placed at the game's paths
        ObjectData/Kuribo.arc/Kuribo.glb
      patches/                        rows changed in the game's tables
        StageData/HeavenlyBeachGalaxy.arc/jmp/placement/common/objinfo.json
      textures/                       the game's textures replaced by name
        <model>/<texture>.png
```

Your code names your own content by its path, with the kind in front:

```lumascript source/main.lum
use kit.actor
use svc.audio

hook after GameScene::startStagePlayFirst() {
    actor.attach(MarioAccess::getPlayerActor(), model "ring", joint: "HandR")
    audio.play(sound "sfx/ding")
}
```

You write sources (glTF, PNG, WAV, JSON). The game turns them into its own formats on the player's device. Nothing
in the `.luma` is specific to one machine, so one file works on every platform.

## The content folders

Every layer of a mod (`layers/<layer>/`) may hold four folders. Anything else inside a layer is refused (L306).

| Folder                             | What goes in it                                                                             | How the game knows it                                                  |
| ---------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `files/<game path>`                | A whole file placed at one of the game's paths: a new file, or one that replaces the game's | By the game's own path, for example `ObjectData/Kuribo.arc/Kuribo.bdl` |
| `patches/<game path>.json`         | Rows changed, added or removed in a file that has rows (a table, stage placement)           | By the game path of the table it changes                               |
| `assets/<mod path>`                | New content of your own: models, sounds, effects, fonts, shaders                            | As `<id>:<path>`, where `<id>` is your mod's id                        |
| `textures/<texture>.png` or `.dds` | The game's textures replaced by name, as a texture pack                                     | By the game's texture name                                             |

Which folder a kind of content uses, and what source format it takes:

| Content                                        | Folder                                                       | Source format                            | Page                                      |
| ---------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------- | ----------------------------------------- |
| A new model                                    | `assets/<path>.glb`                                          | glTF 2.0 (`.glb` or `.gltf`)             | [Models](content/models.md)               |
| A replacement for a game model                 | `files/ObjectData/<Arc>.arc/<Name>.glb`                      | glTF 2.0                                 | [Models](content/models.md)               |
| Animation clips                                | inside the model's glTF, or `files/<Arc>.arc/<any>.anim.glb` | glTF 2.0 animations                      | [Animation](content/animation.md)         |
| Clip frame events                              | `files/<Arc>.arc/<clip>.anim.json`                           | JSON                                     | [Animation](content/animation.md)         |
| Materials and textures                         | inside the model's glTF; `textures/` for the game's          | glTF materials, PNG, JPEG, DDS           | [Materials](content/materials.md)         |
| Hand-written material shaders                  | `assets/<name>.hlsl` with `<name>.shader.json`               | HLSL and JSON                            | [Materials](content/materials.md)         |
| Particle effects                               | `assets/effects.json`                                        | JSON, PNG or JPEG textures               | [Effects](content/effects.md)             |
| Sound effects, streams, voice lines, sequences | `assets/<path>.sound.json`                                   | JSON, with WAV, FLAC, Ogg Vorbis or MIDI | [Sound](content/sound.md)                 |
| Screens (layouts)                              | `files/<Arc>.arc/<Name>.layout.json`                         | JSON, PNG textures                       | [Screens and fonts](content/screens.md)   |
| Fonts                                          | `assets/<path>.font.json`                                    | JSON, with TrueType or OpenType          | [Screens and fonts](content/screens.md)   |
| Objects placed in a stage                      | `patches/StageData/...`                                      | JSON patch                               | [Stages](content/stages.md)               |
| Any of the game's tables                       | `patches/<game path>.json`                                   | JSON patch                               | [Table patches](content/table-patches.md) |

The folders, `luma.json` and layers as a whole are described in [Anatomy of a mod](start/mod-anatomy.md), and
every rule of the container in [The .luma file format](reference/luma-format.md).

### Game paths and mod paths

- **Game paths** are the disc's paths. A file inside an archive is written through the archive:
  `ObjectData/Kuribo.arc/Kuribo.bdl`. Game paths are matched to the player's game without regard to case.
- **Mod paths** under `assets/` are your mod's own namespace. The game knows `assets/sfx/ding.sound.json` as
  `<id>:sfx/ding`, so nothing another mod or the game has can collide with it.

To see the game's paths and file names, extract them from your imported game with
[`lumalink extract --game`](lumalink/extract.md).

## Naming content from code

In LumaScript you name your mod's content with a kind word and a literal name. The compiler checks each name
against your mod's files when you build, so a typo is a build error rather than a surprise in the game:

| Kind     | Example                                 | Page                                    |
| -------- | --------------------------------------- | --------------------------------------- |
| `model`  | `model "ring"`                          | [Models](content/models.md)             |
| `effect` | `effect "aura"`                         | [Effects](content/effects.md)           |
| `sound`  | `sound "sfx/ding"`                      | [Sound](content/sound.md)               |
| `layout` | `layout "Counter"`                      | [Screens and fonts](content/screens.md) |
| `font`   | `font "Lyrics"`                         | [Screens and fonts](content/screens.md) |
| `text`   | `text "Keeper.Hello"`                   |                                         |
| `movie`  | `movie "Trailer"`                       |                                         |
| `data`   | `data "lyrics.json"` (the file's bytes) |                                         |

When a name is only known while the game runs, use the lookup functions such as `sound_named(name)` and
`model_named(name)`. They give `none` when the mod has no such content. The build cannot check these names, so it
lists each use in its report. See [Referring to game content by name](lumascript/references.md).

## Cooking

**Cooking** is turning your source files into the formats the game itself reads: a glTF becomes the game's model
block and clip files, a `.sound.json` and its WAV become a sound the mixer plays, a `.layout.json` becomes the
game's layout file, `effects.json` becomes the game's particle data. Your content is then drawn and played by the
same code that draws and plays the game's own, so it costs what the game's content costs and looks the same on every
renderer.

Cooking happens in two places, with the same code:

- **On the player's device, when the game starts.** The game cooks the content of every mod that is on, and keeps
  the result for later starts with the same mods.
- **On your machine, in [`lumalink check`](lumalink/check.md) and [`lumalink pack`](lumalink/pack.md)** with
  `--game <game.pak>`. LumaLink cooks each source file against your imported game, so you see the same findings, with
  the same codes and words, that a player would see.

A source the cook cannot turn into the game's form is refused with **L804**, naming the file and the reason (for
example `Cook.Model.MissingJoint`) in the player's language. The cook never writes half a model or half an effect
file.

> [!WARNING]
> If any of a mod's files fails to cook when the game starts, **that whole mod is off for the session**. The Mods
> screen says "Off: its files could not be prepared (see Mods > Log)", and the mod log names each failure. The game
> cooks the content again without that mod, so nothing of a half-cooked mod is used. Run `lumalink check --game`
> before you share a mod.

## Replacing and adding

There are three ways content reaches the game. Pick the one that matches what you want:

| You want to                                  | Do this                                       | Example                                                              |
| -------------------------------------------- | --------------------------------------------- | -------------------------------------------------------------------- |
| Change one of the game's files completely    | Put a whole file at its game path in `files/` | `files/ObjectData/Kuribo.arc/Kuribo.glb` replaces the Goomba's model |
| Change some rows of one of the game's tables | Write a patch in `patches/`                   | `patches/StageData/.../objinfo.json` adds an object to a stage       |
| Add something new of your own                | Put it in `assets/` and name it from code     | `assets/ring.glb`, used as `model "ring"`                            |

The rules that keep mods working together:

- **Whole files replace the game's.** A source may stand at the game path with its own ending
  (`files/ObjectData/Mario.arc/Mario.glb`); each content page says what each source can stand in for. A source at a
  path it cannot stand in for is L304.
- **Files with rows are patched, never replaced.** A whole file at the path of a table, stage placement, scenario
  data or message file is refused (L303) with "change it with a patch by key instead". Patches from several mods
  combine row by row. See [Table patches](content/table-patches.md).
- **A new file at a game path** is allowed only for kinds the game finds by name, such as an archive, a stream or a
  movie. Another kind at a path the game does not have is L302.
- **Two mods replacing one file**: the mod higher in the Mods list is used, and the Mods screen names both (L305, a
  Note). Nothing is replaced silently.
- **Layers** apply in the order `luma.json` lists them, and only when their `when` conditions hold. That is how a
  mod offers a "matte" look as an option, or different text for one region. Patches apply in layer order.

## When content is missing

A name that does not resolve never stops the game and never draws nothing. The thing is replaced by a visible
**placeholder** of its kind, and the mod log gets one entry naming the mod, the file and the name:

| Missing                       | What you see instead                                                  |
| ----------------------------- | --------------------------------------------------------------------- |
| A new model                   | A 100-unit cube with a magenta and black checker and a white "?"      |
| A replacing model that failed | The game's own model                                                  |
| A texture                     | A 64 x 64 magenta and black checker                                   |
| An effect                     | A slow ring of 8 white and magenta sparks                             |
| A joint                       | The model's root joint                                                |
| An animation                  | The bind pose (a new actor), or the game's own animation of that name |
| A sound                       | A soft 120 ms two-note chime                                          |
| A text                        | `[<mod>:<id>]` in the game's message font                             |
| A placed object's class       | The placeholder model at its place, with no behaviour                 |

The run-time entries have codes in the 620-699 range, for example `Content.MissingModel` (621) and
`Content.MissingEffect` (623). [Debugging](start/debugging.md) shows how to read the mod log.

## Checks before a pack

Run the check with your imported game before every pack:

```sh
lumalink check my-mod --game path/to/game.pak
lumalink pack my-mod --game path/to/game.pak
```

With `--game`, LumaLink cooks every source file under `files/` of a kind the game cooks, and every asset:

- glTF: `.glb`, `.gltf`, and their `.anim.`, `.kcl.` and `.canm.` forms;
- `.png` textures;
- `.wav` and `.ogg` streams;
- tables: `.bcsv.json`, `.bcam.json` and `.arc/jmp/**.json`;
- `.anim.json` frame events and `.layout.json` screens;
- assets: `effects.json`, `.sound.json`, and hand-written shaders (compiled when a compiler is found).

Without `--game`, LumaLink cannot know the game's models, joints, sounds or tables. Checks that need them are
reported as **not checked** rather than passed, and some cooks refuse outright (an animation file, for example,
needs the game's skeleton). A few checks need your mod folder rather than a packed `.luma` (a layout's textures, for
example); the game's start makes them anyway.

The codes you will meet for content:

| Code       | Level        | Meaning                                                                                            |
| ---------- | ------------ | -------------------------------------------------------------------------------------------------- |
| L300, L301 | Error        | A layer listed without its folder, a folder not listed, or a `when` that can never hold            |
| L302       | Error        | A game path that matches nothing, for a kind of file that cannot be new                            |
| L303       | Error        | A whole file where the game's file has rows: write a patch instead                                 |
| L304       | Error        | A source at a game path it cannot stand in for                                                     |
| L305       | Note         | Two mods replace the same file; the higher one in the list is used                                 |
| L306       | Error        | An entry in a layer outside `files/`, `patches/`, `assets/`, or not a `.png`/`.dds` in `textures/` |
| L400-L407  | Error / Note | Table patches: see [Table patches](content/table-patches.md)                                       |
| L804       | Error        | A file failed to cook; the text says which check and where                                         |

Every code, with its words and fixes, is in [Error codes](reference/error-codes.md). To read one in your language,
use [`lumalink explain`](lumalink/explain.md).

## See also

- [Anatomy of a mod](start/mod-anatomy.md)
- [Check, build, pack and run](start/workflow.md)
- [Models](content/models.md), [Animation](content/animation.md), [Materials](content/materials.md),
  [Effects](content/effects.md), [Sound](content/sound.md), [Screens and fonts](content/screens.md),
  [Stages](content/stages.md), [Table patches](content/table-patches.md)
- [The .luma file format](reference/luma-format.md)
- [Error codes](reference/error-codes.md)
