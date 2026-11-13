---
title: Memory and lifetimes
nav_title: Memory
description: How LumaScript manages memory without a garbage collector - values, shared containers, the per-frame scratch area, module state, views and handles.
order: 11
level: intermediate
---

LumaScript has no garbage collector and no manual freeing, and it never pauses the game to clean up. This page
explains how: what is copied, what is shared, when things are freed, and how long each kind of value lives. You
rarely need to think about it, but it explains several of the compiler's rules.

## Example

```lumascript
var bests: map<text, int> = {}           // module state: lives while the mod is on

fn record(stage: text, frames: int) {
    var copy = bests                      // cheap: shares bests' storage
    copy[stage] = frames                  // now copy gets its own storage; bests is unchanged
    bests = copy                          // the old storage is freed when nothing uses it
}
```

## Values are copied

Every value is copied when it is assigned or passed: numbers, vectors, structs, enums, tuples, and containers too. A
function gets copies of its arguments; changing them never changes the caller's, unless the parameter is `var` (see
[Functions](lumascript/functions.md)).

## Containers share until written

Lists, maps, sets, `text` and `bytes` would be costly to copy byte by byte, so they are **shared underneath until one
copy is written** (copy on write). Copying one is cheap, and you never see the sharing: the copy that is written gets
its own storage first.

Each is freed as soon as its last copy ends. A container holds values and never refers to another container, so
nothing in the language can make a cycle. That is why nothing leaks and nothing waits for a collector.

## Scratch: text for one call

Text made only to hand to the game for one call, or to write one log line, is built in a scratch area that the mod's
run-time support empties again as soon as the text is used. Your script never sees this; it is how the compiler
avoids an allocation per call.

## Text the game may keep

The game may keep a text you give it (a name, a label, a message id), and its description does not say which
functions do. So text you pass to the game lives as long as your mod's code:

- a string literal, or a module `let` the compiler folds to one, is passed as is;
- text made while running (interpolation, a container's or a service's text) is copied once into the mod's text
  store; giving the same text again reuses that copy.

The text store is freed only with the mod's code, so each distinct text you build and pass to the game stays in
memory until then. The build report lists each call that passes made text, so you can see where. Text holding a NUL
byte cannot be passed to the game: the call is not made, and you get a script error naming the function and the
parameter.

Text the game gives you is copied into your own `text` when you read it, so you never hold a pointer into the game's
memory.

## Module state

`var` and `let` at the top of a module live for the mod's whole life: from its start until it is stopped. They are
made when the mod starts, in module order, before every `on start`.

When the mod's code is reloaded, module state starts fresh. To carry values over, use `keep` and `kept` (see
[Lifecycle](lumascript/events.md#keeping-values-across-a-reload)).

## Game objects: views and handles

The game owns its objects; your mod never frees one. You reach them in two ways:

|                      | A view (`Kuribo`, `LiveActor`)                    | A handle (`ref<Kuribo>`)                                   |
| -------------------- | ------------------------------------------------- | ---------------------------------------------------------- |
| Lives                | while the statement or hook that received it runs | as long as you keep it                                     |
| When the object goes | cannot happen while you hold it                   | becomes empty: `get()` gives `none`                        |
| Can be kept in       | locals only                                       | module variables, fields, lists, closures, task parameters |

The compiler refuses a view anywhere it could outlive its statement (error S0103), and across a `wait` (S0104). See
[The game in scope](lumascript/game-objects.md#a-view-lasts-one-statement).

A handle learns that its object is gone when the object is destroyed, and when a whole stage's memory is released at
a stage change. A mod that holds no handle pays nothing for this.

## Where the memory comes from

Your mod's memory comes from the game, counted per mod, and is all freed when the mod is taken out. Small blocks are
kept in pools by the mod's run-time support, so most values cost no call to the game.

If the mod's memory cannot give a block, the line that asked raises a script error (`out of memory: <n> bytes`) and
the mod goes on. See [Errors](lumascript/errors.md).

## See also

- [Types and values](lumascript/types.md)
- [The game in scope](lumascript/game-objects.md)
- [Tasks, states and wait](lumascript/tasks.md)
- [What the compiler emits](lumascript/compiled-form.md)
- [Reloading](reference/reload.md)
