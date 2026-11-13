---
title: Reading the game's files
nav_title: assets
description: Read any of the game's files, or another mod's assets, exactly as the game reads them, with no copy and no waiting.
order: 11
level: advanced
---

The `assets` service reads the game's own files: a level's object list, a model to copy from, a table of values. It
gives you the very bytes the game uses, including what mods have replaced, so your mod needs no copy of the game's
data in its own package and no loader of its own.

## Example

```lumascript source/main.lum
use svc.assets

on start {
    if let info = assets.find("ObjectData/Kuribo.arc", 0) {
        log "Kuribo.arc: {info.entries} entries, from a mod: {info.from_mod}"
    }
}
```

`assets` needs no permission: every mod may read the game.

## Operations

| Operation                          | Description                                                                                                                                                                                                   |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `assets.find(path, flags)`         | What is at `path`: a file or a folder, whether it is an archive, its kind, whether it comes from a mod (`from_mod`), how many entries a folder has, and a file's size in bytes. `none` when nothing is there. |
| `assets.bytes(path, flags)`        | The file's bytes, as the game reads them. A folder gives `Format`.                                                                                                                                            |
| `assets.entry(path, index, flags)` | The entry at `index` (from 0) in the folder at `path`: its name and what `find` would say of it. Past the end: `none`.                                                                                        |

Every call answers at once. Nothing at a path is an ordinary answer (`NotFound`), not a mistake.

## Paths

Paths are the game's, from the root of its files, in any letter case; `.` and `..` steps work. At most 1,023 bytes.

- **Disc paths work.** Name files as the disc and every Wii tool does: `"ObjectData/Kuribo.arc"` is read as the
  folder `ObjectData/Kuribo`, and `"StageData/S/SScenario.arc"` as `StageData/SScenario` (`.szs` likewise). The
  store's own form of the path works too.
- **A mod's own assets** are `"<mod id>:<path>"`: the file `layers/<layer>/assets/<path>` of that mod. Any mod's
  assets may be read this way, so mods can share them. Your own are `"<your id>:<path>"`.

## The game's files, or the original ones

By default you read what the game reads at that path: a mod's file over the game's, and, where a mod adds a language,
the game's own as a fallback. `from_mod` tells you which you got.

Pass the flag `assets.GAME_ONLY` to read **the game's own** file under any mod's. That is for a mod that changes a
file and still wants the original, for example to patch a copy of it.

## Folders and entries

`assets.entry` walks a folder by index:

- a folder of the game's lists its own entries first (in the order the game stores them), then the ones mods add;
- a mod's folder, or an archive a mod replaced, lists only its own entries.

Each entry's information is what the game reads at that path. Asking for the bytes of a folder, or the entries of a
file, gives `Format`.

## What the bytes are

The bytes are the game's as the game reads them: for kinds of file the game's importer cooks, the cooked form, and
the file's kind says which. They come straight from the game's mapped files: nothing is copied, and they never change
or go away while the game runs. The game's files open before the first mod starts and mods' files are attached before
the game starts, so every answer holds for the whole session.

Nothing waits: each call is a lookup. The first touch of a file that has not been read yet reads it from the drive,
just as the game's own first read would.

> [!PLANNED]
> Later versions of `assets` let a mod give the game bytes for a path while it runs (a provider), and make new
> content at run time through the game's cooker and checks. Playing a mod's own movie (`assets.movie`, used in the
> [video in a galaxy](tutorials/video-in-a-galaxy.md) tutorial) is not part of `assets` 1.0.

## From C

The header is `luma_assets.h`.

- `bytes` gives a pointer into the mapped files and the length: read only, valid until the game ends, and usable
  from any thread (the call itself is made on the game thread).
- `find` and `entry` fill a `LumaAssetInfo`, which starts with its `size`: set it to `sizeof(LumaAssetInfo)` as you
  built; the service writes only the fields both sides know, so newer games keep working with older mods.
- `entry` copies the name into your buffer. A buffer too short is `LUMA_E_TOO_LARGE` with the size needed; a null
  name with size 0 asks only for that size.
- `LUMA_ASSETS_GAME_ONLY` is the one flag; any other flag value, a null or over-long path, a null out or a wrong
  `size` is `LUMA_E_ARGUMENT`, reported.

## See also

- [Content overview](content/overview.md): how a mod's own assets are laid out and cooked
- [Table patches](content/table-patches.md): changing the game's tables without code
- [The game in scope](lumascript/game-objects.md)
- [Services overview](services/overview.md)
