---
title: Other mods
nav_title: mods
description: See which mods are running, get numbers that never clash with other mods', read your own options, notice mods stopping, and ask the player to install a mod.
order: 12
level: intermediate
---

The `mods` services are how your mod relates to the others: which mods this session runs, numbers in the game's
numbered spaces that no other mod will ever be given, your own options as text, and a way to ask the player to
install a mod. None needs a permission.

## Example

This mod works alongside the Gold Flower mod when it is running, and gets a message number of its own that is the
same in every session and on every machine:

```lumascript source/main.lum
use svc.mods
use svc.mods.ids

var freeze_message: u32 = 0

on start {
    if let flower = mods.find("gold-flower") {
        if flower.state == mods.State.Running { log "Gold Flower {flower.version} is running" }
    }
    freeze_message = mods.ids.get("message", "freeze") ?? 0
}
```

## The services

| Service        | What it does                                                                                          |
| -------------- | ----------------------------------------------------------------------------------------------------- |
| `mods`         | The list of mods in this session; your own options; other mods stopping.                              |
| `mods.ids`     | Numbers for your mod in the game's numbered spaces, unique across mods and the same in every session. |
| `mods.install` | Asks the player to install a `.luma` file, through the game's import screen.                          |

None needs a permission: what you can read of other mods is what the Mods page shows anyone, and nothing installs
without the player's answer on the import screen.

## The list of mods

| Operation                      | Description                                                         |
| ------------------------------ | ------------------------------------------------------------------- |
| `mods.count() -> u32`          | How many mods are in this session's list.                           |
| `mods.at(index) -> mods.Info?` | The mod at `index` (0 is the top of the list). `none` past the end. |
| `mods.find(id) -> mods.Info?`  | The mod with that id. `none` when it is not in the list.            |

A `mods.Info` holds:

| Field      | Meaning                                                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------------------------------------- |
| `id`       | The mod's id.                                                                                                             |
| `name`     | Its name as the Mods page shows it: its `luma.json` name in the player's language, else its `name`, else its folder name. |
| `version`  | Its `luma.json` `version`, or `""` when it has none.                                                                      |
| `order`    | Its place in the list, from 1 at the top.                                                                                 |
| `kind`     | `mods.Kind.Luma` (a `.luma` mod), `.Riivolution`, `.Textures` (a texture pack) or `.Files` (loose files).                 |
| `has_code` | 1 when it has code for this platform, else 0.                                                                             |
| `state`    | See below.                                                                                                                |

| `state`                 | Meaning                                                                                      |
| ----------------------- | -------------------------------------------------------------------------------------------- |
| `mods.State.Running`    | Its code runs (or it has no code and its content is in).                                     |
| `mods.State.Off`        | The player turned it off.                                                                    |
| `mods.State.Refused`    | The check refused it; the reason is on its Mods page.                                        |
| `mods.State.NotStarted` | It is on, but its code did not start (consent is waiting, or a mod it needs is not running). |
| `mods.State.TakenOut`   | It was taken out while the game runs (see [Reloading](reference/reload.md)).                 |

The list is the session's: the mods as this session started them, in list order. It does not change while the game
runs, except `state`, which follows mods being taken out and reloaded. `state` only changes between frames, so every
read within one frame agrees.

You cannot read another mod's options, files, permissions or the player's answers to it: those are the player's
settings, not another mod's business.

## Numbers for the game's numbered spaces

Some of the game's systems identify things by number: the messages actors send each other, and the types of their
sensors. If two mods picked the same number, their actors would misread each other. `mods.ids` gives each mod its own
numbers.

| Operation                                  | Description                                                                                                                            |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `mods.ids.get(space, name) -> u32?`        | Your number for `name` in `space`. The first ask gives it a number; every later ask, in this session or any other, gives the same one. |
| `mods.ids.of(space, mod_id, name) -> u32?` | Another mod's number for its `name`, read only. `none` when that mod never asked for it.                                               |

A number belongs to the key `<your mod id>/<name>`. `name` is 1 to 64 characters of `a-z`, `0-9`, `_`, `-` and `.`.
A space or name written as a literal is checked when you build.

### The spaces

| Space     | Game's own numbers        | Mods' numbers            | What a number is for                                                                                                                                                                                                                                              |
| --------- | ------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `message` | 0x00 to 0xF3 (`ACTMES_*`) | 0x01000000 to 0x01FFFFFF | A message one mod's actors send and another's receive. Above every attack range, so it reaches a receiver's `receiveOtherMsg` and never its player-attack or enemy-attack receivers: the game's own actors ignore it.                                             |
| `sensor`  | 0x00 to 0x84 (`ATYPE_*`)  | 0x01000000 to 0x01FFFFFF | A sensor type that none of the game's checks (`isSensorPlayer`, `isSensorEnemy`, ...) takes for its own. The game puts such a sensor in the character group, so it meets the player, rides, eyes, map objects and other characters, as a character's sensor does. |

A new kind of attack that the game's enemies react to is not a number: hook their receivers instead (see
[Hooks](lumascript/hooks.md) and [Classes](lumascript/classes.md)).

Other things are deliberately not spaces. The game's global stage switches are game data you reach by name. Event
flags and save-flag names are named, not numbered: keep your own flags as [per-file values](services/save.md). Effect
and sound names are content, a state is an object, and collision codes are part of a stage's collision data.

### The same number everywhere

A key's first-choice number is worked out from the space and the key themselves, so every machine with the same mods
gives the same numbers, whatever order they asked in. The spaces are 16 million numbers wide, so two keys rarely want
the same one. When they do, the second key to ask on that machine gets the next free number, and the mod log says so
once (`Mods.IdMoved`, naming both keys).

> [!WARNING]
> After such a clash, which key moved depends on which asked first on that machine. So never send a raw number to
> another machine (in co-op, for example): send the key, and let each side ask `mods.ids.get` or `mods.ids.of`.

### Numbers are never reused

Every number given is kept in a record beside the game's settings (`mod-ids.json`), even after its mod is removed,
and is never given to another key. A save that names such a number keeps working when the mod comes back. If the
record cannot be read, it is kept aside as `mod-ids.json.bad`, the mod log has an Error, and a new record starts;
numbers are still worked out the same way, so they usually stay the same.

An unknown space, a name outside the rule, or a space with no free number left is a mistake: `get` gives `none`
and the mod log says what was wrong.

## Asking to install a mod

`mods.install.request(path)` asks the player to install a `.luma` file from your mod's
[data folder](services/files.md), for example one your mod downloaded:

```lumascript
use svc.mods.install

task offer_addon() {
    let answer = wait mods.install.request("addons/extra-stars.luma")
    if answer != none { log "installed: it starts the next time Nebula starts" }
}
```

### What the player sees

The game pauses as if Start were pressed and opens the Mods menu with the same import screen a dropped file gets,
with the line "{mod} asks to install this." The player has three choices: install, **Not now**, and **DON'T ASK
AGAIN**. Installing copies the file; yours stays where it is. A mod installed this way **starts the next time Nebula
starts**: this session's list does not change, and the screen says so.

If the same mod is already installed in an older version, the button reads **UPDATE** and the screen names both
versions.

DON'T ASK AGAIN is kept as the player's answer for your mod (shown on its page as "May ask to install mods"); after
it, every request is refused at once with no screen. The mod log notes each request, naming the file's name but
never its path.

### Answers

| Answer     | Meaning                                                                                                                                                                                                                         |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| success    | Installed, on or off as the player chose.                                                                                                                                                                                       |
| `Denied`   | The player said Not now, pressed B or Escape, or closed the menu; or they chose DON'T ASK AGAIN earlier.                                                                                                                        |
| `Format`   | The check refused the file (the screen showed why), or the file changed or went while it was read.                                                                                                                              |
| `Exists`   | That mod is installed already, at the same or a newer version.                                                                                                                                                                  |
| `Busy`     | You have a request open; it is less than 60 seconds since the player last said no; another screen is waiting on the player (a consent question, an import); or the game is held by a mod or in a cutscene it marks unskippable. |
| `NotFound` | No file at `path`.                                                                                                                                                                                                              |

`mods.install.cancel(request)` closes the screen as Not now; no answer comes after it. Your mod stopping, or the
game ending, ends the request the same way.

## Your mod's own options

In LumaScript you declare options with `option name: type` and react to changes with `on option name` (see
[Lifecycle, options and frames](lumascript/events.md)). The `mods` service also gives your options as text:

| Operation                   | Description                                                                                                                                              |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mods.option(key) -> text?` | The current value of your option `key`, as text.                                                                                                         |
| `mods.watch_options(fn)`    | Calls `fn` with an OPTION event each time the player changes one of your options; its value is the option's place in `luma.json`. `none` stops watching. |

| Option type | Text given                                                           |
| ----------- | -------------------------------------------------------------------- |
| choice      | The chosen value's id.                                               |
| number      | The number, in the shortest decimal form, as the Mods page lists it. |
| toggle      | `"1"` or `"0"`.                                                      |
| text        | The text as the player typed it (UTF-8).                             |
| key         | The name of the control it is bound to.                              |

- You read only your own options. A key with a `/` in it names another mod's option and is refused
  (`Mods.OptionNotOwn`); an unknown key is `Mods.OptionUnknown`.
- A text option's value is at most its `max_length` characters; a stored value that is longer, or not valid UTF-8,
  gives the default and one Note.
- OPTION comes at the start of the next frame after the player applies the change on the Mods page. Layers your
  mod picks with `when.options` still change only at the next start: the event says the value changed, not that
  content moved.

## When other mods stop

```lumascript
on mods.stopped(gone) {
    // undo everything you made on behalf of the mod `gone`
}
```

`on mods.stopped` runs at a frame's start each time another mod stops while yours runs: switched off, removed,
reloaded, or stopped by the guard. It comes after that mod's stop and before its code is unloaded, so you can let go
of anything you hold for it. Several mods stopped in one frame come one event each, in order.

This matters most for a library mod that makes things for other mods: never keep a closure, a view or a handle of a
stopped mod past this event. LumaKit's modules all work this way.

## Calling another mod's functions

That is not part of this service. A mod's functions for other mods are **exports**, reached through the loader's
imports (optionally, for "if that mod is there"). Going through the loader records who uses whom, so a mod being
taken out goes after the mods calling it. See [How the game loads a mod](reference/loading.md).

## What is kept when a mod is removed

A removed mod's numbers stay in the record, together with its saved values and data folder, until the player presses
**FORGET** on its REMOVED MODS line on the Mods page ("{mod}: kept for when it returns", with how many numbers and how
much saved data). See [Saving data](services/save.md#what-is-kept-when-a-mod-is-off-or-removed). A mod renamed with
`takes_over` keeps its old id's numbers as `<new id>/<name>`.

## Messages in the mod log

| Row                      | Level | Says                                                                                                  |
| ------------------------ | ----- | ----------------------------------------------------------------------------------------------------- |
| `Mods.IdMoved`           | Note  | {key} was given {number} in {space}; {other} already held its first choice.                           |
| `Mods.IdsUnreadable`     | Error | The record of mods' numbers could not be read; it was kept as mod-ids.json.bad and a new one started. |
| `Mods.Forgotten`         | Note  | {mod}'s kept data was forgotten.                                                                      |
| `Mods.InstallAsked`      | Note  | {mod} asked to install {file}.                                                                        |
| `Mods.TookOver`          | Note  | {mod} took over what {old} kept.                                                                      |
| `Mods.OptionUnknown`     | Error | {mod} asked for an option it does not have: {key}.                                                    |
| `Mods.OptionNotOwn`      | Error | {mod} asked for {key}, another mod's option; a mod reads only its own.                                |
| `Mods.OptionBufferShort` | Error | {mod} gave {size} bytes for its option {key}, which needs {needed}.                                   |

## From C

The header is `luma_mods.h`, with the tables `LumaModsService` (`"mods"`), `LumaModsIdsService` (`"mods.ids"`) and
`LumaModsInstallService` (`"mods.install"`). All functions run on the game thread.

```c
typedef struct LumaModsInfo {
    uint32_t size;       /* sizeof(LumaModsInfo) as the mod was built */
    uint32_t order;      /* its place in the list from the top, from 1 */
    LumaModsKind kind;   /* LUMA_MODS_LUMA, _RIIVOLUTION, _TEXTURES, _FILES */
    LumaModsState state; /* LUMA_MODS_RUNNING, _OFF, _REFUSED, _NOT_STARTED, _TAKEN_OUT */
    uint32_t has_code;   /* 1: code for this platform, 0: none */
    uint32_t reserved;   /* 0 */
    char id[68];         /* NUL-terminated UTF-8 */
    char name[132];
    char version[36];    /* "" when it has none */
} LumaModsInfo;          /* 1.0: 260 bytes */

uint32_t (*count)(const LumaMod* mod);
int32_t  (*at)(const LumaMod* mod, uint32_t index, LumaModsInfo* out);
int32_t  (*find)(const LumaMod* mod, const char* id, LumaModsInfo* out);

int32_t  (*get)(const LumaMod* mod, const char* space, const char* name, uint32_t* out);              /* mods.ids */
int32_t  (*of)(const LumaMod* mod, const char* space, const char* mod_id, const char* name, uint32_t* out);

int32_t  (*request)(const LumaMod* mod, const char* path, LumaEventFn fn, void* user, LumaHandle* out); /* mods.install */
int32_t  (*cancel)(const LumaMod* mod, LumaHandle handle);
```

- `at` and `find` return `LUMA_E_NOT_FOUND` past the end or for an id not in the list. A null out, or a `size` below
  1.0's 260 bytes, is `LUMA_E_ARGUMENT`, reported.
- The spaces are `LUMA_MODS_SPACE_MESSAGE` (`"message"`) and `LUMA_MODS_SPACE_SENSOR` (`"sensor"`). A key's first
  choice is `lo + (fnv1a32(space + "\0" + key) mod (hi - lo + 1))`, then the next free number upward, wrapping.
- `request` returns `LUMA_PENDING` and the handle; the answer is never given inside the call. `LUMA_E_BUSY`,
  `LUMA_E_NOT_FOUND` and `LUMA_E_DENIED` (don't ask again) are answers at once, not reported; `LUMA_E_ABSENT` means
  the host has no Mods menu. A path outside your data folder or not ending in `.luma` is `LUMA_E_ARGUMENT`, reported.
  The answer is a `LUMA_MODS_INSTALL_EVENT_DONE` event with status `LUMA_OK`, `LUMA_E_DENIED`, `LUMA_E_FORMAT` or
  `LUMA_E_EXISTS`. There is no "cancelled" status.
- `option(mod, key, buf, size)` copies the option's text; a short buffer is `LUMA_E_TOO_LARGE` and the length is
  returned, so a null buffer with size 0 asks the length. `watch_options(mod, fn, user)` replaces any earlier
  watcher; a null `fn` ends it.
- `watch_mods(mod, fn, user)` gives `LUMA_MODS_EVENT_STOPPED` (kind 2) events whose `data` is the stopped mod's id
  (UTF-8, NUL-ended, valid during the call) and `data_size` its length. A later call replaces the watcher; a null
  `fn` ends it; your own stop ends it.

## See also

- [Saving data](services/save.md): per-file values, and what a removed mod keeps
- [Files](services/files.md): the data folder an install request reads from
- [LumaKit overview](lumakit/overview.md): how LumaKit gives things to many mods at once
- [Lifecycle, options and frames](lumascript/events.md)
- [Versions, dependencies and sharing](start/sharing.md)
- [Services overview](services/overview.md)
