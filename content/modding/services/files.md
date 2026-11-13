---
title: Files and folders
nav_title: fs
description: Read and write files in your mod's own data folder, read its installed files, and share files through the Exchange folder.
order: 8
level: intermediate
---

The `fs` services give your mod files: a **data folder** of its own to read and write, read-only access to its
**installed files**, and, with the player's permission, the **Exchange folder** that the player and other mods can
open too. Use files for anything too big or too free-form for [saved values](services/save.md): recorded runs,
exported pictures, logs, a tool's output.

## Example

This keeps a table of best times in `bests.json`, read when the mod starts and written whenever it changes. It is
taken from the [ghost time trial](tutorials/ghost-time-trial.md):

```lumascript source/main.lum
use svc.fs

struct Best { frames: u32, file: text }

var bests: map<text, Best> = {}          // "<stage>/<scenario>" -> best

on start {
    if let data = wait fs.read("bests.json") {
        bests = json.decode<map<text, Best>>(data) ?? {}
    }
}

task save_bests() {
    wait fs.write("bests.json", json.encode(bests).bytes())
}
```

Every file call is a **request**: it never blocks the game, and its answer arrives at the start of a later frame.
Write `wait` in a task (or in `on start`) to get the answer as a value. A file that is not there is simply `none`.

## The three folders

| Folder   | Where                                          | Access         | Service       | Permission    |
| -------- | ---------------------------------------------- | -------------- | ------------- | ------------- |
| Data     | `mod-data/<mod id>` in Nebula's data folder    | read and write | `fs`          | none          |
| Package  | your mod's installed folder in the Mods folder | read only      | `fs`          | none          |
| Exchange | `Exchange` in Nebula's data folder, shared     | read and write | `fs.exchange` | `fs.exchange` |

- **Data** is your mod's own. No other mod can see it. It is made at your first write.
- **Package** is the mod as the player installed it: read your own shipped files with `read_package` and
  `list_package`, without copying them anywhere.
- **Exchange** is shared by the player and every mod granted `fs.exchange`. Use it for files the player should be
  able to pick up or drop in by hand (an exported ghost, a level to share). A file there may change or go between two
  of your requests, because someone else can touch it.

Nebula's data folder is the one given by the game's `--data` option, otherwise the system's usual place for an app's
data (LOCALAPPDATA on Windows, Library on Apple systems, the XDG data folder on Linux).

## Operations

| Operation                          | Description                                                                                                                |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `fs.read(path)`                    | The whole file, as `bytes`. `none` when it is not there or cannot be read.                                                 |
| `fs.write(path, data)`             | Writes the whole file, replacing it, creating folders on the way.                                                          |
| `fs.remove(path)`                  | Removes a file, or a folder with everything in it. Its result counts the files removed.                                    |
| `fs.move(from, to)`                | Moves or renames a file or folder.                                                                                         |
| `fs.list(path, recursive)`         | The folder's contents as `text`, one line per file or folder (see [Listing a folder](services/files.md#listing-a-folder)). |
| `fs.read_package(path)`            | A file from your installed mod, as `bytes`.                                                                                |
| `fs.list_package(path, recursive)` | Your installed mod's files, as `fs.list` gives them.                                                                       |
| `fs.cancel(request)`               | Ends a request: no answer comes for it after this (see [Cancelling](services/files.md#cancelling)).                        |

`use svc.fs.exchange` gives the same `read`, `write`, `remove`, `move` and `list` over the Exchange folder, as
`fs.exchange.read(path)` and so on.

Waited, each request gives its result, or `none` for any answer that is not success. The answers you may meet are
`NotFound` (no such file or folder), `Exists` (a move onto a folder), `Denied` (a link in the path), `TooLarge` (a file or listing over the limits), `Absent` (see below) and `Io`.

### Paths

Paths are the same on every platform, so a mod that works on one works on all:

- Relative to the folder, with `/` between parts; 1 to 255 bytes; at most 16 parts.
- Each part 1 to 64 characters of ASCII letters, digits, space, `-`, `_` and `.`, never starting or ending with a
  space or a `.` (so no `.`, `..` or hidden names).
- No Windows device names (`CON`, `PRN`, `AUX`, `NUL`, `COM1`-`COM9`, `LPT1`-`LPT9`, in any case, alone or before a
  dot).
- Not ending in `.tmp.` followed by digits and dots (those are half-written files of the game's own).

`""` names the folder itself, for `list` and `remove`: `fs.remove("")` empties your data folder, while removing
the Exchange folder itself is refused. A path that breaks a rule is a mistake: the call does nothing
and the [mod log](reference/mod-log.md) says which argument was wrong.

**Letter case never makes two names**, on any system. `Runs/Best.bin` and `runs/best.bin` are the same file
everywhere. Writing onto an existing file keeps the case it already has; a move that changes only the case renames
it.

**Links are never followed.** A part of a path that is a symbolic link, a junction or any other special file gives
`Denied`. (The data and Exchange folders themselves may be links, for a player who moved them.)

### Listing a folder

`fs.list` gives text, one line per entry, each ending in `\n`:

- a folder's line ends in `/`;
- paths are relative to the folder you asked for;
- lines are sorted by their bytes, so a folder's line comes before its contents;
- names outside the path rule, and links, are left out (links are not entered).

```text
runs/
runs/EggStarGalaxy-1.bin
runs/EggStarGalaxy-2.bin
settings.json
```

## How requests behave

- **In order.** Requests are checked on the game thread (mistakes are reported at once) and done one after another
  on a worker thread, in the order you made them. A write is copied before the call returns, so a write and then a
  read of the same file in one frame reads what you wrote.
- **Whole and safe writes.** A write goes to a temporary file beside the target, which then replaces it, so a crash
  never leaves half a file. There is no append: write the whole file each time.
- **Nothing runs until used.** The worker thread starts at your mod's first request.

### Cancelling

After `cancel`, no answer comes for that request. A read or list that has not begun is skipped. A write, remove or
move keeps its place in the order and still happens, so a later read never sees a half-applied sequence.

### When your mod stops

Nothing more is delivered to a stopped mod, but its queued writes, removes and moves still land, in order.

## Limits

| Limit                                          | Value                  | What happens past it                                                       |
| ---------------------------------------------- | ---------------------- | -------------------------------------------------------------------------- |
| Open requests, `fs` and `fs.exchange` together | 32 per mod             | The call does nothing; reported.                                           |
| One file                                       | 64 MiB                 | `TooLarge` at once for a write; a larger file on disk reads as `TooLarge`. |
| Your data folder                               | 256 MiB                | The write fails; the Mods page says so once a session.                     |
| The Exchange folder                            | 1 GiB (for everyone)   | The write fails; the Mods page says so once a session.                     |
| A listing                                      | 65,536 lines and 1 MiB | `TooLarge`.                                                                |

Folder sizes are measured at each write, not counting the bytes of the file being replaced.

`Absent` means the folder does not exist here: no data folder on this platform, or no installed folder for a
package request.

## The Exchange folder: permission and what the player sees

Declare the permission in `luma.json`:

```json
{
  "permissions": [
    { "name": "fs.exchange", "why": "Saves your recorded runs where you can share them." }
  ]
}
```

On the consent screen the player sees **Exchange folder**: "Reads and writes files in the Exchange folder, which you
and other mods can open." See [Permissions](start/permissions.md).

On Android the data folder is the app's private folder, so the player cannot open the Exchange folder there yet;
mods can still share files through it with each other.

## What is kept when a mod is off or removed

Your data folder stays when the player turns the mod off, and also when they remove it. A removed mod's data
folder is counted on the Mods page under **REMOVED MODS** ("{mod}: kept for when it returns"), and the player's
**FORGET** there deletes it along with the mod's other kept data (see
[Saving data](services/save.md#what-is-kept-when-a-mod-is-off-or-removed)). Install the mod again and its folder is
there.

Files in the Exchange folder belong to the player: they stay whatever happens to the mod that wrote them.

## Other services that read your data folder

- [`save.game.offer`](services/save.md#the-game-s-save-files) offers a game file from your data folder.
- [`mods.install.request`](services/mods.md#asking-to-install-a-mod) asks the player to install a `.luma` file
  from your data folder.

> [!PLANNED]
>
> - An **Open Exchange folder** button on the Mods page.
> - The Exchange folder visible to the player on Android, through the system's document picker.
> - File names outside ASCII, in a later minor version.

## From C

The header is `luma_fs.h`; one provider serves the two tables `"fs"` and `"fs.exchange"`. In C:

- Every operation returns `LUMA_PENDING` with a request handle, and its answer is an event at a frame's start. The
  request is closed after its event.
- A read's or list's data is copied with the table's `take`, **inside the READ or LIST event's call**. `take`
  follows the length-first rule: a null buffer with size 0 gives the length. A second `take`, or one outside the
  call, is `LUMA_E_HANDLE`, reported.
- `list`'s `recursive` is a `uint32_t` (0 or 1).
- A write over 64 MiB returns `LUMA_E_TOO_LARGE` at the call; the 33rd open request returns `LUMA_E_LIMIT`; both
  are reported. A full folder is an event with `LUMA_E_LIMIT`.
- If memory runs out, a request answers `LUMA_E_MEMORY` (through its event when it could not be queued). No
  exception ever reaches a mod.

## See also

- [Saving data](services/save.md): small values that follow the player's saves
- [Tutorial: ghost time trial](tutorials/ghost-time-trial.md): recording runs to files
- [Tasks and `wait`](lumascript/tasks.md)
- [Permissions](start/permissions.md)
- [Services overview](services/overview.md)
