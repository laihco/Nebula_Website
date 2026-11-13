---
title: Errors at build time and while the game runs
nav_title: Errors and tests
description: What the compiler reports when building, what a script error does while the game runs, every S-code, and how to write tests in your mod.
order: 10
level: intermediate
---

LumaScript catches as many mistakes as it can when you build, and makes the rest harmless while the game runs. This
page explains both kinds of error, lists the codes you will meet, and shows how to write tests in your mod.

## Example

```lumascript
var balls: list<int> = [1, 2, 3]

hook before Mario::tryJump() {
    let fifth = balls[4]                 // a script error: index 4 is outside a list of 3
    log "never reached"
}
```

This builds: the compiler cannot know how long `balls` will be. When Mario jumps, the statement stops, the hook ends
(it does not skip the jump), and the mod log gets one line naming your mod, `main.lum` and the line, and what
happened: `index 4 is outside a list of 3`. Mario jumps as usual, and your mod keeps running. Write
`balls.get(4)` instead to get `none` rather than an error.

## When building

Every build error names the file, the line and the column, what was found and what was expected, with a code
`S<number>`. Messages are in the language of the person building (any of LumaLink's 14). The first error does not
stop the check: every error is listed, so you can fix them in one go. Run [lumalink check](lumalink/check.md) or
[lumalink build](lumalink/build.md) to see them.

Mistakes in `luma.json`, content and permissions are the validator's, with `L` codes; see
[Error codes](reference/error-codes.md).

### Build codes you will meet

| Code                       | Means                                                                                                 |
| -------------------------- | ----------------------------------------------------------------------------------------------------- |
| S0001 to S0021             | the text does not read as LumaScript (the parser's errors)                                            |
| S0004                      | an interpolation `{...}` does not end on its line                                                     |
| S0013                      | a chained comparison (`a == b == c`)                                                                  |
| S0020                      | a second `start` line in one `states`                                                                 |
| S0022                      | nested more than 512 levels deep                                                                      |
| S0023                      | a name with a letter outside ASCII                                                                    |
| S0024                      | the compiler could not start its thread                                                               |
| S0025                      | type arguments end a line and their call's `(` starts the next                                        |
| S0047                      | a name not known in this game's description                                                           |
| S0050                      | an integer value that does not fit its type (`let x: u8 = 200 + 100` names 300)                       |
| S0058                      | no signature of a game function takes these arguments (lists them)                                    |
| S0059                      | more than one signature fits (names them): choose with backquotes                                     |
| S0060, S0061               | a parameter or result that cannot cross between LumaScript and the game, with the reason              |
| S0062, S0063               | a pointer or non-const reference parameter: pass a `var` argument, or it cannot cross                 |
| S0064                      | a write to something that cannot change, with the reason (a `let`, an option, a const game field...)  |
| S0065, S0066               | an operator's sides do not match, or one side is the wrong type                                       |
| S0067                      | a `T?` put into text: write `{x ?? ...}` or test it with `if let`                                     |
| S0068                      | a `match` misses cases (names them)                                                                   |
| S0069                      | an `as` that is not a conversion LumaScript makes                                                     |
| S0073                      | `==` on views or service handles: use `same(a, b)`                                                    |
| S0080                      | a value that cannot be put into text                                                                  |
| S0083                      | `json` used alone as a value                                                                          |
| S0086                      | `== none` on a value that is never `none`                                                             |
| S0090                      | a game function none of whose forms can be called from LumaScript (for example, a variadic one)       |
| S0093                      | an unknown escape in a string                                                                         |
| S0094                      | a value that is not JSON data where JSON data is needed                                               |
| S0098                      | your copy of a game struct given where the game takes its own object                                  |
| S0100                      | a member function called without an object                                                            |
| S0101                      | a function with a result can reach its closing `}`                                                    |
| S0102                      | a `guard`'s `else` block can reach its end                                                            |
| S0103                      | a view of a game object kept where it could outlive its statement                                     |
| S0104                      | a view made before a `wait` and read after it                                                         |
| S0105                      | `wait` where it is not allowed, or not first in its statement                                         |
| S0106                      | `defer` holding `return`, `stop`, `go`, `skip`, `wait`, or a `break`/`continue` of an outer loop      |
| S0107                      | `on` for an event that goes only to the function given to a request                                   |
| S0108                      | calling a service function that is set by an `on` handler                                             |
| S0109                      | a second `on start`, `on stop`, `on frame`, `on step`, `on load` or `on layers` in the mod            |
| S0110                      | a `wait` of a negative literal amount                                                                 |
| S0111                      | a literal outside the range a service function's parameter takes                                      |
| S0112                      | a hook names a parameter count no overload has                                                        |
| S0113                      | `wrap` or `replace` on a constructor, destructor, or a function the game only reports                 |
| S0114                      | `every override of` on a function that is not virtual                                                 |
| S0115                      | a hook in a class on a function that is not a member of its base                                      |
| S0116                      | `-> name` on a function that returns nothing                                                          |
| S0117                      | `skip` outside a `before` hook                                                                        |
| S0118, S0119               | `skip` with a value on a function that returns nothing, or without one on a function that returns one |
| S0120                      | `result` outside an `after`, `wrap` or `replace` hook's own body                                      |
| S0121                      | `proceed()` outside a `wrap`                                                                          |
| S0122                      | `proceed()` more than once on a path                                                                  |
| S0123                      | a path of a `wrap` or `replace` gives no result                                                       |
| S0124                      | `result` read before `proceed()` or before it is written                                              |
| S0125                      | `stop` outside a task, state machine or waiting handler                                               |
| S0126, S0127, S0130, S0131 | `go` and `is_state` misplaced or naming the wrong state (see [Tasks](lumascript/tasks.md))            |
| S0128                      | `self` in a constructor's `before` or a destructor's `after`                                          |
| S0129                      | `enter`, `update` or `exit` twice in one state                                                        |
| S0132                      | `keep` outside `on stop`, or `kept` outside `on start`                                                |
| S0133                      | a list literal of the wrong length for a fixed-size game parameter                                    |

## While the game runs: script errors

A mistake the compiler cannot rule out is a **script error**: an index outside a list, an empty handle, an integer
overflow, a division by zero, a `!` on `none`. A script error does this, and only this:

1. The statement stops. The hook, task or handler it is in ends: a `before` does not skip, an `after` leaves the
   result as it was, a `wrap` that has not proceeded proceeds, and a `replace` gives the game's own result (see
   [Hooks](lumascript/hooks.md)).
2. The mod log on screen and the game's log get one line: the mod, `file.lum:line`, and what happened.
3. The same line repeated is counted, not repeated.
4. **The mod keeps running.** A script error cannot damage memory, so it is not a fault.

One case is different: a script error in `on start` means the mod does not start. It stays off, and the mod log names
the line.

### Run-time codes

| Code  | Raised when                                                 | Message                                                                                                         |
| ----- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| S0901 | a hooked function was called off the game thread            | `<hook> was called off the game thread, so this hook did not run there`                                         |
| S0902 | `list[i]` out of range                                      | `index <i> is outside a list of <n>`                                                                            |
| S0903 | `h!` or a call through an empty `ref<C>`                    | `the handle to <C> is empty`                                                                                    |
| S0904 | integer overflow                                            | `<type> overflow in <expression>`                                                                               |
| S0905 | `/` or `%` by zero                                          | `division by zero in <expression>`                                                                              |
| S0906 | `!` on `none`                                               | `<expression> is none`                                                                                          |
| S0907 | `map[k]` with no key `k`                                    | `the map has no key <k>`                                                                                        |
| S0908 | an `as` that does not fit (`n as u8`)                       | `<value> does not fit in <type>`                                                                                |
| S0909 | `text.slice` inside a character                             | `byte <n> is inside a character of the text`                                                                    |
| S0910 | `bytes.read_*`/`write_*` out of range                       | `bytes <first> to <end> are outside <n> bytes`                                                                  |
| S0911 | the mod's memory cannot give a block                        | `out of memory: <n> bytes`                                                                                      |
| S0912 | a call that needs something that is `none` now (the player) | `<function> needs <name>, which is none now, so it was not called`                                              |
| S0913 | a call on an ended LumaKit handle                           | `<kind> was ended, so it can no longer be used`                                                                 |
| S0914 | a LumaKit call with an argument out of range                | `<function>: <parameter> is <value>; it must be <condition>`                                                    |
| S0915 | a list of the wrong length for a fixed-size game parameter  | `<function>: parameter <n> takes exactly <k> elements; the list has <m>, so it was not called`                  |
| S0916 | a list longer than its count parameter can hold             | `<function>: parameter <n>'s list has <m> elements, more than its count, a <type>, holds, so it was not called` |

The messages are shown in the player's language. An error raised inside a LumaKit or library mod's function is
reported at **your** line, the one that called it.

### Out of memory

When the mod's memory cannot give a block, the line that asked raises S0911 and the mod goes on. Only if even the
report cannot be made does the mod fault, and then the guard switches it off.

### Faults

Faults are different from script errors. A fault in C code in your mod (see
[C in the same mod](lumascript/compiled-form.md)) can damage memory, so the **guard** takes the mod's hooks out and
switches it off, naming it. LumaScript code itself cannot fault. See [The guard](reference/guard.md).

### Finding the line

The generated code carries markers that point back to your source, so a debugger, a crash report and a profile all
show `file.lum:line`. See [Debugging](start/debugging.md) and [The mod log](reference/mod-log.md).

## Tests in your mod

Write tests beside your code with `test` and `expect`:

```lumascript
fn count_after_throws(n: int) -> int { return min(n, 2) }

test "two balls at most" {
    expect count_after_throws(5) == 2
    expect count_after_throws(1) == 1
}

test game "the player exists in a stage" {
    wait 60 frames
    expect MarioAccess::getPlayerActor() != none
}
```

- A plain `test` is for code that does not touch the game. [lumalink test](lumalink/test.md) compiles it for your own
  computer and runs it without the game. It may not `wait`.
- A `test game "..."` runs with the game, through the test harness. It may `wait`.
- Each failing `expect` names the file, the line, and both sides of the comparison.

See [Writing tests](lumalink/testing.md) for the harness and `log fact`.

## See also

- [Debugging](start/debugging.md)
- [Error codes](reference/error-codes.md)
- [Hooks](lumascript/hooks.md)
- [lumalink test](lumalink/test.md)
- [The guard](reference/guard.md)
