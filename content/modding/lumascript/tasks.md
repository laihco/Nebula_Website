---
title: Tasks, states and wait
nav_title: Tasks and states
description: Write code that runs over many frames - tasks that wait for frames, seconds, conditions or answers, and state machines for your own objects - without ever stopping the game.
order: 9
level: intermediate
---

Much of what a mod does takes time: blink an actor for half a second, wait for a web request, walk an enemy through
its phases. LumaScript lets you write that as straight-line code that `wait`s. The game never stops: a waiting task
simply goes on at a later frame. This page covers tasks, `wait` in all its forms, and state machines.

## Example

```lumascript
task blink(h: ref<LiveActor>) {
    for i in 0..6 {
        if let a = h.get() { a.hide() } else { stop }
        wait 5 frames
        if let a = h.get() { a.show() } else { stop }
        wait 5 frames
    }
}

hook after Kuribo::exeWander() {
    if just_hit { start blink(ref(self)) }       // runs from the next frame
}
```

## Tasks

```lumascript
task countdown(from: int) {
    var n = from
    while n > 0 {
        log "{n}"
        n -= 1
        wait 1 seconds
    }
    log "go!"
}

on start {
    let t = start countdown(3)                   // a handle to the running task
}
```

- `task name(params) { ... }` declares a task. `start name(args)` starts it and gives a handle to it.
- A task runs on the game thread, at a frame's start (after `on frame`), in the order tasks were started, until it
  reaches a `wait`, `stop`, or its end. It first runs on the frame after `start`.
- `stop` ends the task from inside. `t.stop()` ends it from outside. `wait t` waits until task `t` ends.
- A task's parameters cannot be views of game objects (error S0103): a task runs on later frames, when the object may
  be gone. Pass a `ref<C>` and test it each time, as `blink` does.
- A task whose handle argument becomes empty is **not** stopped by itself. Check the handle, as above.

## wait

| Form                                 | Waits until                                               |
| ------------------------------------ | --------------------------------------------------------- |
| `wait 5 frames`                      | 5 frames have been shown                                  |
| `wait 2 seconds`, `wait 0.5 seconds` | that much game time has passed (paused while the game is) |
| `wait until <condition>`             | the condition is true (checked once per frame)            |
| `wait t`                             | task `t` has ended                                        |
| `wait <pending>`                     | a call that answers later has answered; gives the answer  |

```lumascript
wait 30 frames
wait 1.5 seconds
wait until not GameSequenceFunction::isActiveSaveDataHandleSequence()
let choice = wait screen.choose(text "Pick.Title", [text "Pick.Red", text "Pick.Blue"])
```

### Frames and seconds, exactly

- `wait N frames` counts frames presented. It goes on counting while the world is held (paused).
  `wait 0 frames` resumes at the next frame.
- `wait N seconds` counts world steps, 60 to a second: the nearest whole number of steps to N x 60 (a half rounds
  up), and at least 1 when N is more than 0. N is an `int` or `f32` of at least 0. It follows the world's speed and
  stops while the world is held. `wait 0 seconds` resumes at the next step.
- A literal below 0 (`wait -5 frames`) is error S0110. A computed amount below 0 waits 0, and the mod log gets a line
  once for that `wait`.
- A real-time wait, which ignores pauses and speed, is `wait until` on the time service's clock:
  `wait until time.monotonic_ns() >= end`.

There is no `every` or `after`: write a task with a loop.

```lumascript
task every_second() {
    while true {
        log "tick"
        wait 1 seconds
    }
}
```

### Waiting for an answer

A call that answers later (a web request, the player typing text, a choice on a screen, a cutscene) returns
`pending<T>`. Only `wait` reads one, and its value is the answer:

```lumascript
use kit.talk

task chat(k: ref<LiveActor>) {
    let answer = wait talk.ask(k, text "Keeper.Hello", [text "Keeper.Yes", text "Keeper.No"])
    match answer {
        0 => wait talk.say(k, text "Keeper.Thanks")
        else => wait talk.say(k, text "Keeper.Bye")
    }
}
```

A `pending` result dropped without `wait` is a warning. Which calls answer later is on each
[service's](services/overview.md) and [LumaKit module's](lumakit/overview.md) page.

### Where wait may be

`wait` may be in:

- a `task`;
- a state's body or its `enter` (below);
- `on start`, `on stage`, `on option` and `on <service>.<event>` handlers, which the compiler makes into tasks when
  they wait;
- a `test game` (see [Errors and tests](lumascript/errors.md)).

It may **not** be in a `fn`, a hook, a closure, a state's `update` or `exit`, `on stop`, `on frame`, `on step`,
`on load`, `on draw`, `on layers` or a plain `test`. That is error S0105. To wait from a function or hook, make the
waiting part a task and `start` it:

```lumascript
hook after TalkMessageCtrl::startTalk() -> started {
    if started { start chat(keeper) }                      // keeper: a ref<LiveActor> you kept; the hook returns at once
}
```

### Where in a statement

A `wait` must be the first thing its statement reads, so nothing of the statement is held across it. It may be the
whole of an expression statement, of a `let` or `var` value, of an assignment's value, or of a condition of `if` or
`guard`, or the first thing those read:

With `p` a pending answer:

```lumascript
let name = wait p ?? ""                          // allowed: wait comes first
let n = (wait p).name                            // allowed
if not wait p { return }                         // allowed

let total = 1 + wait p                           // S0105: wait inside
show(wait p)                                     // S0105: give it a let of its own
```

### Views across a wait

A view of a game object made before a `wait` and read after it is error S0104, naming the local and the wait's line:
the object may be gone after the wait. Take a handle before waiting and `get()` it again after:

```lumascript
task bounce(h: ref<LiveActor>) {
    if let a = h.get() { a.mVelocity = vec3(0, 20, 0) }
    wait 10 frames
    if let a = h.get() { a.mVelocity = vec3(0, 0, 0) }     // a fresh view after the wait
}
```

These count as "read after the wait": a read on the next round of a loop that waits; `wait until`'s condition (read
every frame); a read inside a `filter`/`map`/... closure after the wait; the list a `for` goes through when its body
waits; and the object an assignment writes through (`a.x = wait p`).

## State machines

A state machine gives each object of one of your [classes](lumascript/classes.md) a current state, with code that
runs on entering it, each frame while in it, and on leaving it.

```lumascript
states Phases for GoldBall {                     // one machine per GoldBall, stored with its fields
    state Fly {
        enter { MR::startAction(self, "Fly") }
        update { if MR::isBindedWall(self) { go Burst } }
    }
    state Burst {
        enter { MR::emitEffect(self, "Burst") }
        wait 30 frames                           // a state's body may wait like a task
        kill()
    }
    start Fly
}
```

- `states M for Class { ... }` declares machine `M` for objects of `Class`. It runs from the class's `control` by
  default.
- `state S { ... }` holds an optional `enter`, `update` and `exit` block (each at most once, S0129), and any other
  statements: the state's body, which runs like a task once the state is entered and may `wait`.
- `enter` runs when the state is entered and may wait. `update` runs each frame while in the state. `exit` runs when
  the state is left. Neither `update` nor `exit` may wait.
- `go S` jumps to state `S` of the same machine. `go M.S` names the machine, and works in the machine and in the
  class's functions and hooks.
- `start S` (exactly one per machine; a second is S0020) is the state each object begins in.
- `self` in a machine is the object, which the machine lives with, so it may be read after a wait.
- A local of a state's body cannot be read in its `update` or `exit` when it is a view (S0103).

### is_state

`is_state(S)` or `is_state(M.S)` is `true` while the object's machine is in that state. It is placed like `go`:

```lumascript
class OrbKing : LiveActor {
    var health: int = 3
    override fn receiveMsgPlayerAttack(msg: u32, other: HitSensor, mine: HitSensor) -> bool {
        if not MR::isMsgPlayerHipDrop(msg) or not is_state(OrbKingStates.Dizzy) { return false }
        health -= 1
        go OrbKingStates.Hurt
        return true
    }
}

states OrbKingStates for OrbKing {
    state Attack {
        enter { MR::startAction(self, "Slam") }
        wait 90 frames
        go Dizzy
    }
    state Dizzy { enter { MR::startAction(self, "Dizzy") } wait 180 frames; go Attack }
    state Hurt {
        enter { MR::startAction(self, "Hurt") }
        wait 60 frames
        if self.health <= 0 { kill() } else { go Attack }
    }
    start Attack
}
```

The game's own steps (its nerves) are not `states`: reach them as functions, hooks and
[nerve names](lumascript/game-objects.md#nerves-by-name).

### Codes for stop and go

| Code  | When                                                                                              |
| ----- | ------------------------------------------------------------------------------------------------- |
| S0020 | a second `start` line in one `states`                                                             |
| S0125 | `stop` outside a task, a state machine, or a handler that may wait                                |
| S0126 | `go` or `is_state` outside the machine, or (for `go M.S`) outside the class's functions and hooks |
| S0127 | a state that is not the machine's                                                                 |
| S0129 | `enter`, `update` or `exit` given twice in one state                                              |
| S0130 | `go S` from the class without naming the machine; it lists the class's machines                   |
| S0131 | `is_state` given a value rather than a state's name                                               |

## Timers

The [time service](services/time.md) also offers timers: `time.timer(...)` takes a closure that runs at a frame's
start each time the timer comes due, and the closure's event record's `value` says how many times it came due since
its last event. Like every closure that runs later, it cannot keep a view. A timer's events go only to its closure:
`on time.timer` is error S0107. For most "do this later" code, a task with `wait` is simpler.

## How it works

The compiler turns a task into a record holding its arguments, the locals that live across a `wait`, and a step
number, plus a function that runs from that step to the next `wait`. Nothing keeps a stack between frames, and there
are no threads: the same code runs on every platform. Your mod's run-time support calls each live task from the
mod's own frame pass. A machine is the same generated code, with `go` jumping to a state's start.

No timer is opened for a `wait`, so the time service's timers are all yours. A mod whose code waits uses the time
service automatically; that needs no permission.

## See also

- [Lifecycle, options and frames](lumascript/events.md)
- [Classes derived from the game's](lumascript/classes.md)
- [Memory and lifetimes](lumascript/memory.md)
- [Time](services/time.md)
- [LumaKit: actor](lumakit/actor.md)
