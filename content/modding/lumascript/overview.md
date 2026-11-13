---
title: LumaScript at a glance
nav_title: At a glance
description: A five-minute tour of LumaScript, the language mods are written in - enough to read any mod.
order: 1
level: essential
---

LumaScript is the language you write a mod's code in. This page is a quick tour: one short mod with notes, then the
handful of ideas that make LumaScript different from other languages. After it you can read any mod; the other pages
of this section go deep on one topic each.

## A short mod, explained

```lumascript source/main.lum
option multiplier: int                    // a setting the player changes on the Mods screen

var picked = 0                            // module state: lives as long as the mod is on

on start {                                // runs once, when the mod starts
    log "star bits count x{multiplier}"   // {...} puts a value into text
}

// Run around the game's own MR::addStarPiece: change its argument, then let it go on.
wrap MR::addStarPiece(num) {
    num *= multiplier
    picked += num
    proceed()                             // the game's own code runs here
}

// Before Mario jumps, write a line to the mod log.
hook before Mario::tryJump() {
    if let p = MarioAccess::getPlayerActor() {      // the player may not exist: test it
        log "jump at {p.mPosition}; {picked} star bits so far"
    }
}

// When the Egg Star Galaxy is ready, wait two seconds, then greet the player.
on stage "EggStarGalaxy" {
    wait 2 seconds
    log "welcome to the Egg Star Galaxy"
}
```

Line by line:

| Line                           | What it does                                                                                                                             |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `option multiplier: int`       | Reads the option `multiplier` that `luma.json` declares. The compiler checks the name and type.                                          |
| `var picked = 0`               | A variable at the top of a module. It keeps its value for the mod's whole life. Its type (`int`) is inferred.                            |
| `on start { ... }`             | An event handler. `on start` runs once, after every game name the mod uses has been found.                                               |
| `log "..."`                    | Writes a line to the mod log. `{multiplier}` is interpolation: the value is put into the text.                                           |
| `wrap MR::addStarPiece(num)`   | A hook on one of the game's functions, named exactly as the game names it. `num` is the function's argument, and the hook may change it. |
| `proceed()`                    | Inside a `wrap`: run the game's own function (and any other mod's hooks) now.                                                            |
| `hook before Mario::tryJump()` | Runs your code each time the game is about to call `Mario::tryJump`.                                                                     |
| `if let p = ...`               | `MarioAccess::getPlayerActor()` may give no player (`none`). `if let` runs the block only when there is one, with `p` bound to it.       |
| `p.mPosition`                  | A field of the game's object, read by its own name.                                                                                      |
| `wait 2 seconds`               | Pauses this handler for two seconds of game time without stopping the game.                                                              |

## The ideas that matter

### Native and safe

A mod's LumaScript is compiled by [LumaLink](lumalink/overview.md) to C and then to machine code, inside the mod's
own library. There is no interpreter and no bytecode: your code runs as fast as the game's own. Every construct has
a fixed translation, so nothing surprising happens at run time.

It is also safe by construction. There are no raw pointers and no manual freeing, and you can never read a game
object after it is gone. Mistakes the compiler cannot rule out are checked while the game runs (next section).

### Script errors never crash the game

An index outside a list, an empty handle, a division by zero or an integer overflow is a **script error**. When one
happens:

- the statement stops, and the hook, task or handler it is in ends;
- one line goes to the mod log: the mod, `file.lum:line`, and what happened (`index 7 is outside a list of 5`);
- the game goes on with its own behaviour, and your mod keeps running.

A `before` hook that hits a script error does not skip the game's function; a `wrap` that had not yet proceeded
proceeds. So a bug in your mod makes it do less, never break the game. See [Errors](lumascript/errors.md).

### The game is in scope by name

Every function, field, class, enum and global the game describes is available by its own name, with nothing to
import: `MR::getPlayerPos()`, `Kuribo::exeWander`, `self.mVelocity`, `MarioStatus_Swim`. The compiler checks each
use against the installed game's [description of itself](lumascript/game-description.md), so a misspelt name is a
build error, not a crash. See [The game in scope](lumascript/game-objects.md).

### Hooks

A hook runs your code when the game calls one of its functions. There are four kinds:

| Kind            | Runs                       | Can                                                      |
| --------------- | -------------------------- | -------------------------------------------------------- |
| `hook before F` | before the game's function | `skip` it, giving a result                               |
| `hook after F`  | after it                   | read and change its `result`                             |
| `wrap F`        | around it                  | change arguments, `proceed()` once, change the result    |
| `replace F`     | instead of it              | give its own result; only one mod may replace a function |

See [Hooks](lumascript/hooks.md).

### Views and handles

A value of a game class, such as `p` above, is a **view** of a live game object. It is valid only while the code
that received it runs. To keep an object for later (in a module variable, a task, a list), take a **handle** with
`ref(p)`. A handle becomes empty when the object is gone, so `h.get()` gives the object or `none`:

```lumascript
var target: ref<Kuribo>? = none

hook after Kuribo::exeWander() {
    target = ref(self)                       // keep a handle, not the view
}

on frame {
    if let k = target?.get() {               // none once the Goomba is gone
        k.mVelocity = vec3(0, 10, 0)
    }
}
```

### No garbage collector

Values are copied when you assign or pass them. Lists, maps, text and bytes share their storage until one copy is
written, so copying is cheap, and they are freed as soon as the last copy ends. Nothing can make a cycle, so nothing
leaks and nothing pauses the game to collect. See [Memory and lifetimes](lumascript/memory.md).

### Waiting without stopping the game

A `task` (and an `on start` or `on stage` handler) may `wait`: for frames, seconds, a condition, or an answer from
the outside world such as a web request. The game keeps running while it waits:

```lumascript
task blink(h: ref<LiveActor>) {
    for i in 0..6 {
        if let a = h.get() { a.hide() } else { stop }
        wait 5 frames
        if let a = h.get() { a.show() } else { stop }
        wait 5 frames
    }
}
```

See [Tasks, states and wait](lumascript/tasks.md).

## Reading the syntax

A few rules make any mod readable:

- A statement ends at the end of the line (or at `;`). Blocks are `{ ... }`. Indentation has no meaning.
- `let` makes a name that cannot change; `var` one that can.
- Words, not symbols: `and`, `or`, `not` (there is no `&&`, `||` or `!x`).
- `T?` is "a `T` or `none`". `x?.y` reads `y` only when `x` is not `none`; `x ?? y` gives `y` when `x` is `none`.
- `"text {expression}"` puts a value into text.
- Names with `::` (`MR::getPlayerPos`) are the game's. Names with `.` after `use` (`kit.actor`, `svc.time`) are
  [LumaKit](lumakit/overview.md) modules and [services](services/overview.md).

## Where to go next

- [Basics](lumascript/basics.md): files, modules, syntax, variables and control flow.
- [Types and values](lumascript/types.md) and [Functions, structs, enums and closures](lumascript/functions.md).
- [Hooks](lumascript/hooks.md) and [Lifecycle, options and frames](lumascript/events.md).
- [Your first mod](start/first-mod.md) if you have not built one yet.

## See also

- [Basics](lumascript/basics.md)
- [Hooks](lumascript/hooks.md)
- [The game in scope](lumascript/game-objects.md)
- [Errors](lumascript/errors.md)
- [LumaKit overview](lumakit/overview.md)
- [Services overview](services/overview.md)
