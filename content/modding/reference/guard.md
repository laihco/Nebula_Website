---
title: The guard in depth
nav_title: The guard
description: How Nebula catches a crash in a mod's code, switches that mod off and keeps the game running - which faults it catches, when it cannot, what the player sees, and how it measures each mod's code time.
order: 6
level: advanced
---

The guard stands between the game and your mod's code. When native code in your mod crashes, the guard catches the
fault, switches your mod off for the rest of the session, says so on screen and in the mod log, and lets the game go
on. This page explains exactly when it can do that and what is left afterwards.

## What the player sees

The game keeps running. A notice appears at the bottom left of the screen, and the mod log gets an Error entry from
the guard naming the mod, where its code failed, the kind of fault and the address. The game's log gets one line:

```text
[mod <id>] GUARD: its code failed (<boundary>: <where>): <fault> at <file>+0x<offset>, address 0x<address>.
It is off until the next start; what it was changing may be half done.
```

`<boundary>` and `<where>` say what was running (for example a `BEFORE` hook on `Mario::update`), and
`<file>+0x<offset>` is the place in your library, which you can look up in your build's symbols.

The mod stays off until the game starts again. Nothing else is switched off, except mods that need it.

> [!NOTE]
> A **script error** in LumaScript (an index out of range, an empty handle, a division by zero) is not a crash and
> does not involve the guard: the statement stops, the mod log gets a line, and the mod keeps running. The guard is
> for faults in native code: C in your mod, or a bug that makes compiled code fault. See
> [Errors at build time and while the game runs](lumascript/errors.md).

## Where the guard stands

Every place the game runs a mod's code is a **boundary**:

| Boundary                  | Where                                                                                                            |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| BEFORE, AFTER, WRAP, TELL | A hook on a game function (WRAP covers wraps and replaces), named by the function                                |
| START                     | The mod's start (`begin`, `start`)                                                                               |
| STOP                      | The mod's `stop`, its C++ destructors (`finish`), and a library mod being told a user is gone (`dependent_gone`) |
| EVENT                     | A service event or timer the mod handles (`<service> event <kind>`)                                              |
| CLASS                     | A class the mod makes: its construction and the game functions it overrides                                      |

Boundaries nest: your hook calls the game, the game calls a function another mod hooks, and so on. The innermost
boundary names the mod that failed. With no mod on, none of this runs.

## Which faults are caught

The guard catches a fault and resumes the game only when **all** of these hold:

1. The fault is an access violation (reading or writing memory the code may not), an illegal instruction, or an
   integer division fault (division by zero, or overflow).
2. The thread is inside a boundary, and not already handling an earlier fault.
3. The faulting instruction is inside the mod's own code.
4. Between the fault and the boundary, the mod did not call into the game which then called the mod again: resuming
   would skip those game functions half done.

If any of these does not hold (a stack overflow, a fault in the game's own code, a second fault while handling the
first, or rule 4), the guard does **not** resume. The game ends with a crash report that names the mod and carries the
guard's line (on Linux, macOS and Android, one line on standard error naming the mod). The guard always errs towards
ending the game rather than continuing in a broken state: never a silent crash, never a resume on a damaged stack.

## What happens after a caught fault

| What was running                                             | What the game does instead                                     |
| ------------------------------------------------------------ | -------------------------------------------------------------- |
| A `before` hook                                              | The call goes on as if the hook did nothing: it does not skip. |
| A `wrap`, `replace` or class override that had not proceeded | It proceeds: the game's own function runs.                     |
| The mod's start                                              | The start is refused, and the mod is off.                      |
| A service event                                              | The event's call answers "cancelled".                          |

Then:

- **The mod is off for the session.** None of its code runs again: no hook, no event, not its `stop`, not its C++
  destructors, until the next start.
- **It is taken out at the next frame:** its hooks are removed, and the mods that need it are taken out first.
- **What it was changing may be half done.** The game cannot undo what the code did before it failed: a value it wrote
  halfway, an object it was building. That is why the message says so.

The mod log's entry has source GUARD and a code for the fault: 1 access violation, 2 illegal instruction, 3 integer
division. See [Error codes](reference/error-codes.md#guard-codes).

## Code time

Each boundary also measures how long the mod's code took, using the processor's cheapest clock (never a system call).
Each mod is charged its own time, less the time of other mods' code nested inside it. Once a frame, the game keeps
each mod's time in a ring of its last 120 frames, from which it reads an average and a worst time per mod. A mod
taken out keeps its last values. With no mod, nothing is measured.

The measure is wall time on the thread: if the system pauses a thread while it is inside your code, that time counts
against your mod.

## Limits

- **A service's own code after it calls you.** A service that calls your function and then has more of its own code
  to run (a timer's trampoline, for example) lies above your frames. A fault in your function resumes past that code
  too. Services are written to do nothing after calling a mod, so this skips nothing that matters.
- **Windows on ARM64.** The guard is off there, and the game's log says so.

## See also

- [Debugging](start/debugging.md)
- [The mod log in depth](reference/mod-log.md)
- [How the game loads a mod](reference/loading.md#when-a-mod-is-taken-out)
- [Error codes](reference/error-codes.md)
