---
title: Saving data
nav_title: save
description: Keep your mod's values in the player's save files, keep values across all files, and export or offer whole game saves.
order: 7
level: intermediate
---

The `save` services let your mod remember things. Values you keep **per file** travel with the player's game file
exactly as their stars do; values you keep **globally** belong to the player across every file; and, with the
player's permission, your mod can read a whole game file or offer one back to replace it.

## Example

This mod counts how often the player has been hit, separately in each save file:

```lumascript source/main.lum
use svc.save

hook after Mario::checkDamage() -> hit {
    if hit {
        let hits = save.get<u32>("hits") ?? 0
        save.set("hits", hits + 1)
    }
}
```

`save.get<u32>("hits")` is `none` the first time (nothing set yet), so `?? 0` starts the count at zero. The new
value is written to disk the next time **the game** saves, at one of its own save points, just like a star.

A setting the player chooses once for all files, such as a name, belongs in `save.global` instead:

```lumascript
use svc.save.global

on start {
    if let name = save.global.get<text>("name") { log "welcome back, {name}" }
}

fn remember(name: text) { save.global.set("name", name) }
```

## The three services

| Service       | What it keeps                                                                                                    | Permission  |
| ------------- | ---------------------------------------------------------------------------------------------------------------- | ----------- |
| `save`        | Your mod's own values inside the game file that is loaded now. They follow that file's saves, copies and erases. | none        |
| `save.global` | Your mod's own values for this player, the same in every file, written at once.                                  | none        |
| `save.game`   | Nothing of its own: it hands you a whole game file (export) or offers one back to replace a file (import).       | `save.game` |

`save` and `save.global` need no permission: they only ever touch your mod's own values. `save.game` reads and may
replace the player's progress, so it needs the `save.game` permission, and every replacement is confirmed by the
player on a screen of the game's own.

## Values in each file

`use svc.save` gives four operations on the file the player has loaded now:

| Operation                      | Description                                                                                                                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `save.get<T>(key) -> T?`       | The value of `key` in the file loaded now, read as a `T`. `none` when it is not set, when no file is loaded (title screen, file select), or when the stored value is not a `T`. |
| `save.set(key, value) -> bool` | Sets the value. `true` when set; `false` when no file is loaded or a limit is reached. Written by the game's next save.                                                         |
| `save.remove(key) -> bool`     | Removes the value. `false` when it was not set.                                                                                                                                 |
| `save.file()`                  | Which file is loaded: its number (1 to 6) and its character (0 Mario, 1 Luigi). `none` when no file is loaded.                                                                  |

`T` and `value` can be any [json data](lumascript/types.md): numbers, `bool`, `text`, vectors, colours, lists,
maps, and your own structs and enums whose fields are json data. The compiler stores them as UTF-8 JSON, so a struct
you save today still loads after you add a field to it (a missing field takes its default). A `bytes` value is stored
as it is, and read back with `save.get<bytes>(key)`.

If a stored value cannot be read as the `T` you ask for, `get` gives `none` and says so once in the
[mod log](reference/mod-log.md).

### Keys

A key is 1 to 64 characters of `a-z`, `0-9`, `_`, `-` and `.`. Keys are your mod's own: two mods using the key
`"hits"` never see each other's values. A key written as a literal is checked when you build, and so is a literal
value that is too large.

### When values reach the disk

Per-file values live **inside the game file** (each file's game data gains a small block for mods). That gives them
exactly the life the player's progress has:

- **Written** when the game saves, at its own save points. Your mod never saves the game by itself.
- **Lost** when the player quits without saving, as an unsaved star would be.
- **Copied** when the player copies the file on the file-select screen.
- **Cleared** when the file is erased or started new.
- Mario's and Luigi's game data in the same file each keep their own values.

That makes `save` the right place for anything that is part of the player's progress in one file: flags, counters,
an inventory, unlocks. For ready-made per-file flags and counters, see [LumaKit's progress module](lumakit/progress.md),
which is built on this service.

### Limits

| Limit                               | Value                                 |
| ----------------------------------- | ------------------------------------- |
| A key                               | 1 to 64 characters of `a-z 0-9 _ - .` |
| One value                           | 0 to 64 KiB                           |
| All of one mod's values in one file | 256 KiB                               |
| All mods' values in one file        | 1 MiB                                 |

Past a limit, `set` gives `false`, nothing changes, and the mod log names the limit and the file. The total keeps the
save file a few megabytes even with many mods, since the game writes all its files at each save.

## Values across all files

`save.global` has the same three operations as `save`, with the same keys, types and json encoding:

| Operation                             | Description                                                                    |
| ------------------------------------- | ------------------------------------------------------------------------------ |
| `save.global.get<T>(key) -> T?`       | The value, or `none` when not set or not a `T`. Works at the title screen too. |
| `save.global.set(key, value) -> bool` | Sets the value; written to disk at the end of this frame.                      |
| `save.global.remove(key) -> bool`     | Removes the value; `false` when it was not set.                                |

The difference is when the values reach the disk. Global values do not wait for the game to save: they are written
at the end of the frame you set them, at most once a frame per mod, whole and then renamed into place, so a crash
mid-write never leaves half a file. They are read once, at your mod's first `get`.

They are stored beside the game's own save file, in `luma/<mod id>.bin` in the save folder, so a player who backs up
their saves backs these up too. One mod's global values are at most **1 MiB** in all.

Use `save.global` for things that are the player's rather than one file's: a name for a leaderboard, a best time
across all files, a "seen the intro" flag.

## The game's save files

`save.game` works with whole game files, for mods such as a cloud backup or a save-sharing tool. It needs the
`save.game` permission, declared in `luma.json`:

```json
{
  "permissions": [{ "name": "save.game", "why": "Backs up your save files and can restore one." }]
}
```

The player sees **Game saves** on the consent screen: "Reads your save files and may offer one to replace; you
confirm each replacement." See [Permissions](start/permissions.md) for how players are asked.

### Example: back up and restore a file

```lumascript source/main.lum
use svc.save.game
use svc.fs

task back_up() {
    guard let bytes = wait save.game.export_file(1) else { return }   // none: file 1 is empty
    wait fs.write("backup/file1.nsav", bytes)
}

task restore() {
    if let file = wait save.game.offer("backup/file1.nsav") {
        log "the player replaced file {file}"
    }                                                                 // none: the player said no
}
```

### Operations

| Operation                     | Description                                                                                                                                                                                              |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `save.game.export_file(file)` | Asks for user file `file` (1 to 6) as the game would write it now. Waited, it gives the file's `bytes`, or `none` when that file was never created.                                                      |
| `save.game.offer(path)`       | Offers the file at `path` in your mod's [data folder](services/files.md) to replace one of the player's files. Waited, it gives the number of the file the player replaced, or `none` when they said no. |
| `save.game.cancel(request)`   | Ends an export or offer request. No answer comes for it after this; an open offer screen closes as "no".                                                                                                 |

Each is a request: it never blocks, and its answer arrives at the start of a later frame. Write `wait` in a
[task](lumascript/tasks.md) as above, or pass a function that receives the answer.

### Exporting a file

An export gives one file holding the whole user file: Mario's game data, Luigi's game data and the file's settings.
The loaded file's own parts are made as the game's next save would write them, so you get the player's current
progress, not only what is on disk. Each export writes a Note to the mod log ("{mod} read your file {file}."), so
the player can see which mod read their saves.

A mod may have at most 4 export or offer requests open at once.

### What the player sees when you offer a file

The file is checked before anything is shown: one that is not a game file of this form gives `none` (the answer is
`Format`) and the player never sees a screen.

Otherwise the game pauses as if Start were pressed and opens the offer screen over the game:

1. At the top, "{mod} offers this file", with the offered file's character, stars and when it was last saved.
2. Below, the player's six files. The file being played is shown **In play** and cannot be picked.
3. The player picks a file, then answers "Replace file {n}? Its progress goes." with **REPLACE** or **KEEP**.

KEEP, B, Escape or closing the menu is a "no". On REPLACE, the old file is first copied into the save folder as
`luma/replaced/<date and time>-file<n>.bin` (the screen tells the player it is kept there), then the new file is
written and saved. The mod log gets "{mod} offered a file to replace file {file}." and "File {file} was replaced
with the one {mod} offered."

### When an offer is refused

| Answer     | Why                                                                                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Busy`     | Another offer is open (from any mod), another screen is waiting on the player, a mod holds the game's time, or a cutscene is playing. Try again later. |
| `NotFound` | No file at `path`.                                                                                                                                     |
| `Format`   | Not a game file (or larger than 4 MiB). No screen was shown.                                                                                           |
| `Io`       | The file could not be read, the old file could not be kept, or saving is off (no-save mode, a damaged save). Nothing was replaced.                     |
| `Denied`   | The player said no, or loaded the chosen file before the replacement could happen.                                                                     |

## What is kept when a mod is off or removed

Turning a mod **off** changes nothing in the saves: its values wait for it.

When a mod is **removed** (its folder is gone), its per-file values stay inside each game file, untouched. Every save
carries them along, and they are never given to another mod. Install the same mod again (the same id) and it finds
its values where it left them. Its global file stays in the save folder too.

The player decides when that data goes. The Mods page lists each removed mod under **REMOVED MODS** as "{mod}: kept
for when it returns", with how much it keeps, and one **FORGET** button (behind a confirm) that drops it all. The
global file is deleted at once; each game file loses the values at its next save.

> [!TIP]
> If you rename your mod (give it a new id), list the old id in `luma.json`'s `takes_over`. When the player
> installs the new mod and the old one is gone, the import screen says "Takes over what {old} kept"; installing it
> moves the old id's per-file values, global file and [numbers](services/mods.md#numbers-for-the-game-s-numbered-spaces)
> to the new id. See [luma.json](reference/luma-json.md).

A mod can never claim another mod's values at run time: only the player installing a mod with that id (or a
`takes_over` they accept) does that.

## Save-data safety

The service is built so that mods' data can never cost the player their progress:

- **Never corrupted by size.** If mods' data would not fit when the game saves, the file is saved **without** the
  mods' data and the mod log has an Error; the player's progress is saved as normal.
- **A broken block is skipped.** If mods' data in a file cannot be read, it is dropped with one Error in the mod
  log, and the file's own game data loads as usual.
- **Older and newer games.** An older version of Nebula without mod saves skips the block and drops it at its next
  save. A block from a newer version is kept byte for byte and written back unchanged; the services answer as if no
  file were loaded for that file.
- **Global files.** A global file that cannot be read is first copied aside as `luma/<id>.bin.broken`, and only then
  written over. A refused write is retried, waiting longer each time, and your mod's stop writes at once.
- **No mods, no cost.** With no mod using it, mods' data is 16 bytes per file. Nebula's own save file holds it; the
  Wii's save and its tools never see it.

## Messages in the mod log

| Row                      | Level | What it says                                                                                    |
| ------------------------ | ----- | ----------------------------------------------------------------------------------------------- |
| `Save.ChunkBroken`       | Error | Mods' data in file {file} could not be read; the file's game data loaded.                       |
| `Save.ChunkTooBig`       | Error | Mods' data did not fit in file {file}; the file was saved without it.                           |
| `Save.GlobalBroken`      | Error | Your global file could not be read; names the place its copy was kept (`luma/<id>.bin.broken`). |
| `Save.GlobalWriteFailed` | Error | Your global file could not be written; said once for each run of refusals while it is retried.  |
| `Save.Exported`          | Note  | {mod} read your file {file}.                                                                    |
| `Save.Offered`           | Note  | {mod} offered a file to replace file {file}.                                                    |
| `Save.Replaced`          | Note  | File {file} was replaced with the one {mod} offered.                                            |

A value over a limit is reported as the general `Service.Limit` ("reached its limit"), naming the file.

> [!PLANNED]
> **Save sets**: a mod switching the game's save files to a folder of its own (for example one per co-op room), so
> a session's progress is kept apart from the player's own files. Not part of `save` 1.0.

## From C

The header is `luma_save.h`, with three tables: `LumaSaveService` (`"save"`), `LumaSaveGlobalService`
(`"save.global"`) and `LumaSaveGameService` (`"save.game"`). Values are plain bytes at this level; LumaScript's
typed `get<T>` and `set` add the JSON encoding on top, so a C mod sharing a key with a LumaScript mod reads JSON text.

```c
/* save and save.global */
int64_t (*get)(const LumaMod* mod, const char* key, void* buf, uint64_t size);
int32_t (*set)(const LumaMod* mod, const char* key, const void* value, uint64_t bytes);
int32_t (*remove)(const LumaMod* mod, const char* key);
/* save only */
int32_t (*file)(const LumaMod* mod, uint32_t* number, uint32_t* character);

/* save.game */
int32_t (*export_file)(const LumaMod* mod, uint32_t file, LumaEventFn fn, void* user, LumaHandle* out);
int64_t (*take)(const LumaMod* mod, LumaHandle handle, void* buf, uint64_t size);
int32_t (*offer)(const LumaMod* mod, const char* path, LumaEventFn fn, void* user, LumaHandle* out);
int32_t (*cancel)(const LumaMod* mod, LumaHandle handle);
```

- All functions run on the game thread.
- `get` copies up to `size` bytes and returns the value's **whole** length, even when it is larger than `size`, so
  you can ask again with room; pass a null `buf` with `size` 0 to ask only the length. It returns `LUMA_E_NOT_FOUND`
  when the key is not set and `LUMA_E_ABSENT` when no file is loaded. A bad key, or a null buffer with a size, is
  `LUMA_E_ARGUMENT`, reported.
- `set` returns `LUMA_OK`, `LUMA_E_ABSENT` with no file loaded, or `LUMA_E_LIMIT` past a limit (reported).
- `file` writes the number (1-6) and character (0 Mario, 1 Luigi) to its two outs, or returns `LUMA_E_ABSENT`.
- `export_file` returns `LUMA_PENDING` and the request in `*out`. The answer is a `LUMA_SAVE_GAME_EVENT_EXPORT`
  event at the next frame's start: status `LUMA_OK` with `value` the length, `LUMA_E_NOT_FOUND` for a file never
  created, or `LUMA_E_MEMORY`. Call `take` **inside that event's call**, once, to copy the bytes; the request is
  closed after the call either way. A file outside 1-6, or a fifth open request, is reported.
- `offer` returns `LUMA_PENDING`, or answers at once with `LUMA_E_BUSY`, `LUMA_E_NOT_FOUND`, `LUMA_E_IO` or `LUMA_E_ABSENT` (a host without the
  offer screen); a path outside your data folder is `LUMA_E_ARGUMENT`, reported. The
  answer is a `LUMA_SAVE_GAME_EVENT_OFFER` event: `LUMA_OK` with `value` the file replaced (1-6), `LUMA_E_DENIED`,
  `LUMA_E_FORMAT` or `LUMA_E_IO`. There is no "cancelled" answer: `cancel`, your mod's stop and the game's end send
  nothing. A replacement the player already accepted still goes through after a `cancel`, without an event.

### The exported file's form

An exported file is one framed file: the text `NSAV`, a `u16` version (1), a `u16` part count (3), then Mario's game
data, Luigi's game data and the file's settings, each as a `u32` length and its bytes. The frame's numbers are
little-endian; each part is exactly as the game's save file holds it. A part with no stored bytes has length 0.
`offer` reads this same form.

## See also

- [Files](services/files.md): your mod's own folders, where offered files come from
- [Other mods](services/mods.md): stable numbers, and the REMOVED MODS line
- [LumaKit: progress](lumakit/progress.md): per-file flags and counters built on `save`
- [Types and values](lumascript/types.md): what counts as json data
- [Permissions](start/permissions.md) and [consent in depth](reference/consent.md)
- [Services overview](services/overview.md)
