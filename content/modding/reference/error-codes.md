---
title: Error codes
description: Every code a modder can meet - the validator's L codes, LumaScript's build and run-time S codes, the codes services and content report while the game runs, and the guard's - with what each means and how to fix it.
order: 3
level: intermediate
---

Every problem Nebula finds with a mod has a code, and the same code means the same thing in LumaLink, on the game's
import screen, on the Mods page and in the mod log. Look a code up here to learn what went wrong and how to fix it.

## Reading a finding

A finding is one problem, found at one place. `lumalink check` prints one per problem, in your language:

```text
you.hello: luma.json line 3: "summary" is missing.
```

Every finding has these parts:

| Part            | What it is                                                                                                                |
| --------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Code            | `L203` here. The letter says which family it is from (below).                                                             |
| Level           | **Error**: the mod is refused, or off, or something it meant does not happen. **Note**: shown to you, nothing is refused. |
| Mod             | The mod's `id`, or the `.luma` file's name when `luma.json` cannot be read.                                               |
| File            | The entry inside the mod: `luma.json`, `layers/base/patches/...`, a script file such as `source/main.lum`.                |
| Line and column | Where in a text file, when there is one.                                                                                  |
| Message         | What was found and what was expected, in the language you chose.                                                          |

`lumalink check --json` prints the same report as JSON, with a JSON pointer such as `/options/2/default` for a
problem inside `luma.json`.

Every check runs to the end: one run lists every problem it can find, not just the first. Fix them from the top.

### lumalink explain

To read about a validator code in your terminal, in any of the game's 14 languages:

```sh
lumalink explain L203
lumalink explain 203 --language EuGerman
```

See [lumalink explain](lumalink/explain.md).

## Code families

| Codes          | Family                                                                                    | Found                                                          | Where you see it                                                |
| -------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------- |
| L100 to L899   | The validator: the container, `luma.json`, layers, patches, code, module data, other mods | when you check or pack, when the player imports, at each start | `lumalink check`, the import screen, the Mods page, the mod log |
| S0001 to S0899 | LumaScript, when building                                                                 | `lumalink build` and `check`                                   | LumaLink's output, with file, line and column                   |
| S0901 and up   | LumaScript, while the game runs                                                           | a script error in your code                                    | the mod log, `file.lum:line`                                    |
| 1 to 99        | The kernel, while the game runs                                                           | a hook or memory problem                                       | the mod log                                                     |
| 100 to 619     | Services, while the game runs                                                             | a service call your mod made                                   | the mod log, with the service and function                      |
| 620 to 699     | Content, while the game runs                                                              | a name or file the game could not find or show                 | the mod log                                                     |
| Guard 1 to 3   | The guard                                                                                 | your C code crashed                                            | the mod log and an on-screen notice                             |

Some messages have no number at all; they are listed under [Messages without a number](reference/error-codes.md#messages-without-a-number).

Codes are never reused for another meaning, and a message's code and values never change between versions (only its
wording may be improved).

## L100: the container

The `.luma` file itself. Packing with `lumalink pack` avoids all of these.

| Code | Meaning                                                                                                                                                                                   | How to fix                                                                                                                                   |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| L100 | The file cannot be opened as a zip, so it is not a `.luma`.                                                                                                                               | Pack it again with `lumalink pack`. A download cut short gives this too.                                                                     |
| L101 | The zip uses something a `.luma` may not: compression other than stored or deflate, encryption, or several disks.                                                                         | Pack with `lumalink pack`, or with a zip tool set to deflate and no password.                                                                |
| L102 | An entry has a name that is not allowed; the message says why (a `..` part, a reserved Windows name, a forbidden character, a name over 240 bytes, a layer or path starting with `@`...). | Rename the file or folder. See [the container rules](reference/luma-format.md#the-container).                                                |
| L103 | Two entries clash: they differ only in case, an entry is there twice, or a file stands where a folder is.                                                                                 | Rename one so the names differ by more than case.                                                                                            |
| L104 | An entry is a link or a device, not a file or folder.                                                                                                                                     | Put the real file in its place.                                                                                                              |
| L105 | A limit is passed: more than 200,000 entries, a file over 4 GiB, or more than 64 GiB in all.                                                                                              | Make the files smaller, or split the mod.                                                                                                    |
| L106 | An entry is damaged: its data does not match its stated size or checksum, or two entries share data.                                                                                      | Download the mod again, or pack it again.                                                                                                    |
| L107 | A top-level entry that is not part of a `.luma`.                                                                                                                                          | Move it into a layer, or remove it. The top level holds `luma.json`, `layers/`, `code/`, `media/`, `saves/`, `certs/`, `kit/` and `source/`. |
| L108 | Note: the archive uses `\` between folders; it is read as if it used `/`.                                                                                                                 | Nothing to do. `lumalink pack` writes the standard form.                                                                                     |

## L200: luma.json

The manifest. Every key is described on [luma.json: every field](reference/luma-json.md).

| Code | Meaning                                                                                                                   | How to fix                                                                                                                            |
| ---- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| L200 | The `.luma` has no `luma.json`.                                                                                           | Put `luma.json` at the top level of the mod, not in a subfolder.                                                                      |
| L201 | `luma.json` is not valid UTF-8 JSON, has a comment or a key twice, or is over 1 MiB.                                      | Fix the line named. JSON allows no comments.                                                                                          |
| L202 | A key that cannot be here.                                                                                                | Check the spelling, or remove it. Unknown keys are never ignored.                                                                     |
| L203 | A required key is missing.                                                                                                | Add it. The seven required keys are `format`, `id`, `version`, `name`, `summary`, `authors` and `game`.                               |
| L204 | A value of the wrong type or out of range; the message says what it must be.                                              | Write the value as the message says.                                                                                                  |
| L205 | The mod was made for a newer format than this Nebula reads.                                                               | Players: update Nebula. Authors: write the lowest `format` that has the keys you use.                                                 |
| L206 | The `id` is malformed.                                                                                                    | Lowercase letters, digits, `-` and `.`; start with a letter; 3 to 64 long; the part before the first `.` not a reserved Windows name. |
| L207 | The mod is for another game.                                                                                              | It cannot run in Super Mario Galaxy.                                                                                                  |
| L208 | Note: the mod is not made for the player's region, so it is off.                                                          | Authors: add the region to `game.regions` once the mod works there.                                                                   |
| L209 | `icon` or `pictures` names a file that is missing, not a PNG (or JPEG for pictures), or of a wrong size.                  | Icon: a square PNG of 64 to 1024 pixels. Pictures: PNG or JPEG, at most 4096 pixels a side.                                           |
| L210 | An option is malformed; the message says how.                                                                             | See [options](reference/luma-json.md#options).                                                                                        |
| L211 | A permission is malformed; the message says how.                                                                          | See [permissions](reference/luma-json.md#permissions).                                                                                |
| L212 | `load.after` and `load.before` make a cycle.                                                                              | Remove one of the orders named.                                                                                                       |
| L213 | `takes_over` names this mod's own id, or a mod that is installed and on.                                                  | Name only earlier ids of this mod. Players: remove the old mod first.                                                                 |
| L214 | `text` names a language the game does not have.                                                                           | Use the game's language names (`UsEnglish`, `JpJapanese`...).                                                                         |
| L215 | A file in `media/` that `luma.json` does not name.                                                                        | Name it in `icon` or `pictures`, or remove it.                                                                                        |
| L216 | A `saves` entry is malformed, its file is missing or is not a save of its region, or its region is not in `game.regions`. | Fix the entry the message names.                                                                                                      |
| L217 | A file in `saves/` that `luma.json` does not name.                                                                        | Name it in `saves`, or remove it.                                                                                                     |
| L218 | Note: the mod asks for a permission, but none of its code imports a service that needs it.                                | Remove the permission if you do not use it. (C code that asks for a service by name at run time may still need it.)                   |
| L219 | Note: a test permission; only a test run provides it.                                                                     | Nothing, in a test mod.                                                                                                               |
| L220 | A key of the previous mod engine; the message says what to write.                                                         | See [Keys from the previous engine](reference/luma-json.md#keys-from-the-previous-engine).                                            |
| L221 | Note: a key under `pre_standard`, which only the previous engine reads.                                                   | Move to the current form when you can.                                                                                                |

## L300: layers and files

The content in `layers/`. See [Layers](reference/luma-format.md#layers).

| Code | Meaning                                                                                                                                                                       | How to fix                                                                                              |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| L300 | A layer listed in `luma.json` has no folder, or a folder under `layers/` is not listed.                                                                                       | List every layer folder, and create every listed one.                                                   |
| L301 | A layer's `when` can never hold: an option value that is not one of its values, an unknown region, language or platform, or a `text` or `key` option (those choose no layer). | Fix the condition the message names.                                                                    |
| L302 | A file at a game path the game does not have, of a kind that cannot be new.                                                                                                   | Check the path's spelling. Only kinds the game finds by name (archives, streams, movies...) may be new. |
| L303 | A whole file replaces a game file that has rows.                                                                                                                              | Change it with a patch by key instead. `lumalink convert` makes the patch from your modified file.      |
| L304 | A source file stands at a game path it cannot stand in for.                                                                                                                   | Use the source kind that content kind takes. See [Content](content/overview.md).                        |
| L305 | Note: two mods replace the same file; the one higher in the Mods list is used.                                                                                                | Nothing, if that is what the player wants: they choose the order.                                       |
| L306 | An entry in a layer that is not in `files/`, `patches/`, `assets/`, nor a `.png` or `.dds` in `textures/`.                                                                    | Move it into one of those.                                                                              |
| L307 | A layer chosen by the mod's code, on a platform the code does not run on.                                                                                                     | Build the code for that platform, or choose the layer another way.                                      |

## L400: table patches

Patches in `layers/<layer>/patches/`. See [Table patches](content/table-patches.md).

| Code | Meaning                                                                                                    | How to fix                                                                           |
| ---- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| L400 | A patch file is not valid JSON or has an unknown key.                                                      | Fix the line named.                                                                  |
| L401 | `key` is not the key this kind of file uses; the message gives the right one.                              | Write the columns the message names.                                                 |
| L402 | A `where` or `remove` finds no row, or an `add` adds a key that exists.                                    | Check the key's values against the game's file; use `set` to change an existing row. |
| L403 | A value does not fit its column's type, or the column does not exist.                                      | Fix the column name or the value.                                                    |
| L404 | Note: two mods change the same cell; the change of the one higher in the Mods list is used.                | Nothing, if that is what the player wants.                                           |
| L405 | A patch changes a file of another mod that this mod does not `needs`.                                      | Add that mod to `needs`.                                                             |
| L406 | A `select` names a column the file does not have, or uses a match other than `equals`, `prefix` or `glob`. | Fix the selector.                                                                    |
| L407 | Note: a `select` matched no row at load.                                                                   | Check the selector against the game's file.                                          |

## L500: code

A mod's built libraries in `code/`. Most of these are also how the game refuses code when it loads it. See
[How the game loads a mod](reference/loading.md).

| Code | Meaning                                                                                                                                                                                                                                                                                               | How to fix                                                                                                                                                     |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L500 | `code/` without `code` in `luma.json`, or the reverse; or more mods with code are on than the game allows (256).                                                                                                                                                                                      | Add or remove the `code` key. Players: turn some mods off.                                                                                                     |
| L501 | An unknown platform folder in `code/`, or a listed platform without its library.                                                                                                                                                                                                                      | Build with `lumalink build`, which writes both.                                                                                                                |
| L502 | A file is not a library of its platform (another format or machine).                                                                                                                                                                                                                                  | Rebuild for that platform.                                                                                                                                     |
| L503 | The library does not export `luma_mod`.                                                                                                                                                                                                                                                               | Build with `luma.h`'s `LUMA_MOD` (LumaLink does this).                                                                                                         |
| L504 | The library imports from the system, which a mod's own library may not.                                                                                                                                                                                                                               | Build with `luma.h` and LumaLink's flags, which give the functions a mod needs. A library that must use the system belongs in `code.libraries`, with `native`. |
| L505 | The game has no such name: a function, field, class, hook target, service, or another mod's function. When the name exists with other signatures, the message lists them.                                                                                                                             | Fix the name or signature; copy the game's signature from the message. A name your mod can live without can be imported as optional.                           |
| L506 | The code uses a service whose permission `luma.json` does not declare.                                                                                                                                                                                                                                | Add the permission, with a `why`.                                                                                                                              |
| L507 | Note: no code for the player's platform, so the mod is off there.                                                                                                                                                                                                                                     | Build for that platform and add it to `code.platforms`.                                                                                                        |
| L508 | The library needs a newer LumaCore than this game has.                                                                                                                                                                                                                                                | Players: update Nebula.                                                                                                                                        |
| L509 | An extra library without the `native` permission; a library file not named in `code.libraries`; or the entry library would run code when the system loads it, before the game starts it.                                                                                                              | Declare `native`, name the file, or build with `luma.h`'s flags.                                                                                               |
| L510 | Note: lists each system import of an extra library.                                                                                                                                                                                                                                                   | Nothing; it tells you (and reviewers) what the library uses.                                                                                                   |
| L511 | An extra library cannot run on iOS; the message says why.                                                                                                                                                                                                                                             | Leave that library out on iOS.                                                                                                                                 |
| L512 | `luma_mod` cannot be used; the message says why: not built with `luma.h`, unreadable or too small, a malformed import row, a wrap or replace on a constructor or destructor, a hook that may not skip, wrap or replace a function whose result has no empty value, or the mod's start refused to run. | Rebuild with LumaLink. For a hook, use `before` or `after` on that function. For a refused start, see what your start code returned.                           |

## L600: content kinds

Codes L600 to L699 belong to content kinds, one block each: L600 to L619 models and skeletons, L620 to L639
materials, L640 to L649 shaders, L650 to L669 effects, L670 to L679 animation, L680 to L689 sound, L690 to L699
screens, fonts and text. L900 to L949 belong to stages and movies. Each block holds that kind's checks of your source
files; their messages name the file and what was expected. See [Content](content/overview.md).

## L700: module data

Data in `kit/` for a library mod such as LumaKit.

| Code | Meaning                                                                          | How to fix                                                                        |
| ---- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| L700 | A `kit/<module>/` folder that `luma.json`'s `kit` does not list, or the reverse. | List the module with its data version, or remove the folder.                      |
| L701 | A data file fails its module's schema; the module's own message follows.         | Fix the file at the line named.                                                   |
| L702 | The mod needs a module data version no installed module provides.                | Players: update the library mod. Authors: write the version the module documents. |

## L800: the game and other mods

Checked at import and again at every start, since they depend on what else is installed and on.

| Code | Meaning                                                                                                                     | How to fix                                                                                                                     |
| ---- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| L800 | A mod in `needs` is missing, off, or of a version outside the range; or `needs` makes a cycle ("a -> b -> a").              | Players: install and turn on the needed mod. Authors: check the range, and break the cycle.                                    |
| L801 | A mod in `conflicts` is on; the mod's `why` follows.                                                                        | Turn one of them off.                                                                                                          |
| L802 | Another installed mod has the same id.                                                                                      | Remove one. Two mods may never share an id.                                                                                    |
| L803 | The mod's `nebula` range excludes this release.                                                                             | Players: update Nebula. Authors: widen the range if the mod works.                                                             |
| L804 | A file of the mod failed to cook on this device; the cooker's message follows. The mod is off this session.                 | Fix the file the message names.                                                                                                |
| L805 | The code replaces a game function that a mod higher in the Mods list already replaces. Only one mod may replace a function. | Players: choose which mod to keep higher. Authors: use `wrap` instead of `replace` where you can; wraps of several mods stack. |
| L806 | The mod needs a graphics feature this device does not have.                                                                 | The mod cannot run on this device. Authors: list a feature in `renderer` only if the mod truly cannot do without it.           |

## Build-time script codes

LumaScript's compiler names the file, line and column of each problem, says what it found and what it expected, and
goes on to list every other problem. These are the codes whose meaning is documented; the parser's own codes describe
themselves in their message. See [Errors at build time and while the game runs](lumascript/errors.md).

| Code         | Meaning                                                                                                                                          | How to fix                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| S0004        | An interpolation (`{...}` in a string) does not end on its line.                                                                                 | Close it on the same line.                                                                     |
| S0013        | A chained comparison (`a < b < c`).                                                                                                              | Join two comparisons with `and`.                                                               |
| S0020        | A second `start` line in one `states`.                                                                                                           | One start state per machine.                                                                   |
| S0022        | The program nests deeper than 512 levels.                                                                                                        | Split the expression or block.                                                                 |
| S0023        | A name with a letter outside ASCII (`café`).                                                                                                     | Use ASCII letters in names.                                                                    |
| S0024        | The compiler itself could not start its work.                                                                                                    | Run the build again.                                                                           |
| S0025        | A call's type arguments end a line and its `(` starts the next.                                                                                  | Put the `(` on the same line.                                                                  |
| S0033        | The game's functions file is missing, so calls are read as written.                                                                              | Give `lumalink build` the game's names folder (`--names`).                                     |
| S0047        | A name the game's description does not know (a function, or a hook's target).                                                                    | Check the spelling against the game's names.                                                   |
| S0050        | A constant integer expression does not fit its type (`let x: u8 = 200 + 100`).                                                                   | Use a wider type, or a smaller value.                                                          |
| S0058        | No signature of a game function takes these arguments; the message lists them.                                                                   | Pass arguments that match one.                                                                 |
| S0059        | More than one signature takes these arguments; the message names them.                                                                           | Choose one with a quoted signature in backquotes.                                              |
| S0060, S0061 | A parameter (S0060) or result (S0061) of a game function cannot cross into LumaScript; the message says why.                                     | Call it from C in the same mod.                                                                |
| S0062, S0063 | A non-const reference parameter is passed without `var`.                                                                                         | Write `var x` for that argument.                                                               |
| S0064        | A write to something that is not a place (a `let`, a non-`var` parameter, an option, a const game value...); the message says which.             | Write to a `var`, or make a copy.                                                              |
| S0065, S0066 | The two sides of an operator have different types (S0065), or one side has the wrong type (S0066).                                               | Convert with `as`.                                                                             |
| S0067        | An optional value (`T?`) is put in text.                                                                                                         | Test it first, or give a value with `??`.                                                      |
| S0068        | A `match` misses values of an enum; the message names them.                                                                                      | Add arms for them, or `_`.                                                                     |
| S0069        | An `as` conversion LumaScript does not make.                                                                                                     | `as` converts numbers, game enums to and from integers, and the mod's plain enums to integers. |
| S0073        | `==` on views or service handles.                                                                                                                | Use `same(a, b)`.                                                                              |
| S0080        | A value that cannot be put in text.                                                                                                              | Put in its fields instead.                                                                     |
| S0083        | `json` used alone as a value.                                                                                                                    | Call a `json` function.                                                                        |
| S0086        | `== none` on a value that can never be none.                                                                                                     | Remove the test.                                                                               |
| S0090        | No form of a game function's signature can be called from LumaScript (variadic, unreadable).                                                     | Call it from C. See [Variable argument lists](lumascript/varargs.md).                          |
| S0093        | An unknown escape in a string.                                                                                                                   | Use `\n \t \r \0 \\ \" \' \{ \}`, `\xHH` or `\u{H...}`.                                        |
| S0094        | A value that is not json data, where json data is needed (`json.encode`, `keep`, `kept`).                                                        | Copy what you need into a struct of the mod.                                                   |
| S0098        | The script's copy of a game struct is passed where the game needs its own object.                                                                | Pass the field through the view (`MR::useBox(a.mBox)`).                                        |
| S0100        | A member function called without an object.                                                                                                      | Call it on an object (`actor.appear()`).                                                       |
| S0101        | A function with a result can reach its end without returning.                                                                                    | Return a value on every path.                                                                  |
| S0102        | A `guard`'s `else` does not leave.                                                                                                               | End it with `return`, `stop`, `break`, `continue`, `go` or `skip`.                             |
| S0103        | A view of a game object is kept past its statement (in a module value, a field, a task parameter, a later closure, or a state's local).          | Keep a handle instead: `ref(x)`, then `h.get()`.                                               |
| S0104        | A local view is read after a `wait`.                                                                                                             | Get the object again after the wait, or keep a handle.                                         |
| S0105        | A `wait` where it may not be, or inside an expression.                                                                                           | Move it into a task or handler that may wait, in a `let` of its own.                           |
| S0106        | A `defer` contains `return`, `stop`, `go`, `skip`, `wait`, or a `break`/`continue` of an outer loop.                                             | Keep the deferred statement self-contained.                                                    |
| S0107        | `on <service>.<event>` for an event that goes to the function given to a request.                                                                | Handle it in the function you pass to the request.                                             |
| S0108        | Calling or naming a service member that is set by an `on` handler.                                                                               | Write the `on` handler instead.                                                                |
| S0109        | A second `on` handler of one kind in the mod; the message names the first.                                                                       | Merge them into one.                                                                           |
| S0110        | A `wait` of a negative literal amount.                                                                                                           | Wait 0 or more.                                                                                |
| S0111        | A literal outside a service parameter's range; the message gives the range.                                                                      | Use a value in range.                                                                          |
| S0112        | A hook's parameter count matches no signature of that function.                                                                                  | Match the parameters of one signature.                                                         |
| S0113        | A `wrap` or `replace` on a constructor, a destructor, or a function the game only tells of.                                                      | Use `before` or `after`.                                                                       |
| S0114        | `every override of` on a function that is not virtual.                                                                                           | Hook the function itself.                                                                      |
| S0115        | A hook in a class on a function its game base class does not have.                                                                               | Hook a member of the base class.                                                               |
| S0116        | A result named on a function that returns nothing.                                                                                               | Remove the `->` part.                                                                          |
| S0117        | `skip` outside a `before` hook's own body.                                                                                                       | Skip only in a `before`.                                                                       |
| S0118, S0119 | `skip` written the wrong way for the function's result: `skip` alone for a function that returns nothing, `skip v` for one that returns a value. | Write the form that matches.                                                                   |
| S0120        | `result` outside an `after`, `wrap` or `replace` hook's own body.                                                                                | Read it in the hook's body, not a closure.                                                     |
| S0121        | `proceed()` outside a `wrap`'s own body.                                                                                                         | Proceed only in a `wrap`.                                                                      |
| S0122        | `proceed()` can run more than once on a path.                                                                                                    | Call it at most once.                                                                          |
| S0123        | A path of a `wrap` or `replace` gives no result.                                                                                                 | `proceed()` or set `result` on every path.                                                     |
| S0124        | `result` is read before `proceed()` or `result = v`.                                                                                             | Proceed or set it first.                                                                       |
| S0125        | `stop` where it may not be.                                                                                                                      | Use it in a task, a state machine, or a handler that may wait.                                 |
| S0126        | `go` or `is_state` outside a state machine or its class.                                                                                         | Use them there.                                                                                |
| S0127        | A state that is not the machine's.                                                                                                               | Name one of its states.                                                                        |
| S0128        | `self` in a constructor's `before` or a destructor's `after`.                                                                                    | The object does not exist there; use `after` / `before` instead.                               |
| S0129        | A state gives `enter`, `update` or `exit` twice.                                                                                                 | Once each.                                                                                     |
| S0130        | `go S` from a class with several machines; the message lists them.                                                                               | Write `go M.S`.                                                                                |
| S0131        | `is_state` given a value, not a state's name.                                                                                                    | Pass a state's name.                                                                           |
| S0132        | `keep` outside `on stop`, or `kept` outside `on start`.                                                                                          | Use them there.                                                                                |
| S0133        | A list literal of the wrong length for a fixed-size parameter.                                                                                   | Give exactly the length the parameter takes.                                                   |

A service used without its permission is the validator's **L506**, which LumaLink reports at the `use` line.

## Run-time script codes

A script error stops the statement it happens in and ends that hook, task or handler run. The mod log gets one line
with the mod, `file.lum:line` and what happened; the same line repeated is counted, not repeated. **The mod keeps
running**: a script error cannot damage memory, so it is not a crash. See
[Errors at build time and while the game runs](lumascript/errors.md).

| Code  | Meaning                                                                                            | How to fix                                                                       |
| ----- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| S0901 | A hook was called off the game thread, so it did not run there.                                    | Nothing to fix in the script; the game called that function from another thread. |
| S0902 | `index {0} is outside a list of {1}`                                                               | Check the index against `len` first.                                             |
| S0903 | `the handle to {0} is empty`: the object is gone, or the handle never held one.                    | Test with `h.get()`, which gives `none` when the object is gone.                 |
| S0904 | `{0} overflow in {1}`: integer overflow.                                                           | Use a wider type, or check before adding.                                        |
| S0905 | `division by zero in {0}` (`/` or `%`).                                                            | Test the divisor first.                                                          |
| S0906 | `{0} is none`: `!` on a value that was `none`.                                                     | Test it, or give a value with `??`.                                              |
| S0907 | `the map has no key {0}`                                                                           | Use `get`, or test that the key is there.                                        |
| S0908 | `{0} does not fit in {1}`: an `as` conversion that does not fit.                                   | Clamp the value first.                                                           |
| S0909 | `byte {0} is inside a character of the text`: `text.slice` off a character boundary.               | Slice at character boundaries.                                                   |
| S0910 | `bytes {0} to {1} are outside {2} bytes`: `bytes` read or written out of range.                    | Check the length first.                                                          |
| S0911 | `out of memory: {0} bytes`: the script heap could not give a block. The mod goes on.               | Hold less.                                                                       |
| S0912 | `{0} needs {1}, which is none now, so it was not called` (for example, the player between stages). | Test that the value exists before calling.                                       |
| S0913 | `{0} was ended, so it can no longer be used`: a LumaKit handle used after `end()`.                 | Test `alive()` first, or keep a new handle.                                      |
| S0914 | `{0}: {1} is {2}; it must be {3}`: a LumaKit call given an argument outside what it takes.         | Pass a value in the stated range.                                                |
| S0915 | A list of the wrong length for a fixed-size game parameter; the call was not made.                 | Give the length the parameter takes.                                             |
| S0916 | A list too long for the game function's count parameter; the call was not made.                    | Pass a shorter list.                                                             |

## Kernel codes (1 to 99)

Reported by the game's kernel while your mod runs. They are Errors.

| Code | Row                      | Meaning                                                                                                                                                                  | How to fix                                                         |
| ---- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| 1    | `Hook.OutOfMemory`       | C++ `new` in the mod's code could not get memory. The game stops, with a crash report naming the mod.                                                                    | Allocate less, or use the nothrow forms of `new` and handle null.  |
| 2    | `Hook.NoResult`          | A hook on a function that returns a reference neither set the result nor proceeded, so the game ran the function itself. The mod named is the hook that did not proceed. | Proceed, or set the result, on every path.                         |
| 3    | `Hook.SkipRefused`       | A `before` tried to skip a function whose result has no empty value; the function ran.                                                                                   | On such a function, use `after`, or a `before` that does not skip. |
| 4    | `Hook.ServiceNotGranted` | The code asked for a service at run time whose permission the player did not grant.                                                                                      | Handle the missing service; the player chose not to allow it.      |

## Service codes (100 to 619)

A service reports a mistake in a call your mod made, names the function (`{where}`, such as `time.set_rate`), and
does nothing. These are Errors unless marked Note.

### Every service

| Code | Row                  | Meaning                                                                |
| ---- | -------------------- | ---------------------------------------------------------------------- |
| 100  | `Service.Thread`     | A service was called off the game thread; it did nothing.              |
| 101  | `Service.Argument`   | A service function was given a wrong argument (named); it did nothing. |
| 102  | `Service.Handle`     | A handle that is closed or not the mod's own.                          |
| 103  | `Service.StructSize` | A struct smaller than the function needs.                              |
| 104  | `Service.Limit`      | The function reached its limit (named); it did nothing.                |

### Each service

| Code | Row                      | Meaning                                                                                                 |
| ---- | ------------------------ | ------------------------------------------------------------------------------------------------------- |
| 120  | `Time.NotHeld`           | A `time` function that works only while the mod holds the game was called without holding it.           |
| 121  | `Time.LetGo`             | Note: the player set the game back to its normal speed.                                                 |
| 140  | `System.LinkOpened`      | Note: the mod opened a page in the player's browser (shown on screen too).                              |
| 141  | `System.ClipboardRead`   | Note: the mod read the clipboard.                                                                       |
| 160  | `Mods.IdMoved`           | Note: a number the mod asked for was already taken, so another was given.                               |
| 161  | `Mods.IdsUnreadable`     | The record of mods' numbers could not be read; it was kept as `mod-ids.json.bad` and a new one started. |
| 162  | `Mods.Forgotten`         | Note: a removed mod's kept data was forgotten (the player chose to).                                    |
| 163  | `Mods.InstallAsked`      | Note: the mod asked to install a file.                                                                  |
| 164  | `Mods.TookOver`          | Note: the mod took over what an old id kept (`takes_over`).                                             |
| 165  | `Mods.OptionUnknown`     | The mod asked for an option it does not have.                                                           |
| 166  | `Mods.OptionNotOwn`      | The mod asked for another mod's option; a mod reads only its own.                                       |
| 167  | `Mods.OptionBufferShort` | The buffer given for an option's value is too small.                                                    |
| 180  | `Save.ChunkBroken`       | Mods' data in a save file could not be read; the file's game data loaded.                               |
| 181  | `Save.Exported`          | Note: the mod read one of the player's save files.                                                      |
| 182  | `Save.Offered`           | Note: the mod offered a file to replace a save file.                                                    |
| 183  | `Save.Replaced`          | Note: a save file was replaced with the one the mod offered.                                            |
| 184  | `Save.ChunkTooBig`       | Mods' data did not fit in a save file; the file was saved without it.                                   |
| 186  | `Save.GlobalWriteFailed` | The mod's global save values could not be written; the game tries again.                                |
| 250  | `Net.HostNotNamed`       | A host that `luma.json` does not name for `net.internet`; nothing was sent.                             |
| 251  | `Net.CertificateRefused` | A server's TLS certificate was refused.                                                                 |
| 252  | `Net.RedirectRefused`    | A redirect to a host that is not allowed, or from https to http.                                        |
| 253  | `Net.FileRefused`        | A certificate or key file for a TLS listener is missing or not PEM.                                     |
| 350  | `Audio.NotASound`        | A function was given something that is not a cooked sound.                                              |
| 351  | `Audio.Dropped`          | The mod plays more than 32 sounds at once; its lowest-priority one was stopped.                         |
| 352  | `Audio.NotANumber`       | Samples that are not numbers; they play as silence.                                                     |

The blocks are: 120 to 139 `time`, 140 to 159 `system`, 160 to 179 `mods`, 180 to 199 `save`, 200 to 249 `fs`, 250 to
299 `net`, 300 to 349 `input`, 350 to 399 `audio`, 400 to 419 `capture`, 420 to 469 `assets`, 470 to 569 `draw`, 570
to 619 `ui`. A service that has no row of its own for a mistake uses the general rows 100 to 104. See each service's
page under [Services](services/overview.md).

## Content codes (620 to 699)

The game could not find or show something your mod names while it runs. It never shows nothing: a placeholder stands
in, so the game goes on and you can see where the problem is.

| Code | Row                        | Meaning                                                                            |
| ---- | -------------------------- | ---------------------------------------------------------------------------------- |
| 620  | `Content.MissingClass`     | A placement names an object class no mod made; a placeholder stands there.         |
| 621  | `Content.MissingModel`     | No model of that name; a placeholder is drawn.                                     |
| 622  | `Content.MissingTexture`   | No texture of that name; a checker is drawn.                                       |
| 623  | `Content.MissingEffect`    | No effect of that name; placeholder sparks are shown.                              |
| 624  | `Content.MissingSound`     | No sound of that name; a chime plays.                                              |
| 625  | `Content.MissingText`      | No text of that name.                                                              |
| 626  | `Content.MissingJoint`     | A model has no joint of that name; its root is used.                               |
| 627  | `Content.MissingAnimation` | A model has no animation of that name.                                             |
| 628  | `Content.MissingProgram`   | A material has no program for this renderer; it is drawn plainly.                  |
| 640  | `Content.EffectEmpty`      | An effect started but made no particle; it shows nothing.                          |
| 641  | `Content.EffectsFile`      | A line of the mod's effects list cannot be read; its effects draw in the 3D group. |
| 670  | `Content.EventPastEnd`     | An animation event is after the clip's last frame; it never comes.                 |
| 671  | `Content.MissingParam`     | A material has no shader parameter of that name.                                   |
| 672  | `Content.MissingFont`      | A font is missing or cannot be read; the message font is used.                     |

A name your code builds at run time is the usual cause: names written in the source are checked when you build.

## Guard codes

When your mod's C code crashes, [the guard](reference/guard.md) switches the mod off for the session and the mod log
gets an Error from the guard, with the boundary, the function and the address.

| Code | Meaning                                                        |
| ---- | -------------------------------------------------------------- |
| 1    | An access violation: the code read or wrote memory it may not. |
| 2    | An illegal instruction.                                        |
| 3    | An integer division by zero (or overflow).                     |

## Messages without a number

The game says these in its own words; on the Mods page they are the reason a mod is off.

| Message                                                            | Meaning                                                                                                                                                                                                    |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `{part} is missing or damaged, so mods are off this time.`         | A part of Nebula that mods need (the mod importer, the shader compiler, the placeholder files, or free space for mod files) is missing, so every mod is off this session. Reinstall Nebula, or free space. |
| `Off: its files could not be prepared (see Mods > Log)`            | A file of the mod failed to cook (L804); the mod is off this session.                                                                                                                                      |
| `Off: waiting for your answer`                                     | The mod's code or a permission has not been allowed yet.                                                                                                                                                   |
| `Off: you did not allow {permission}`                              | The player declined a permission the mod needs to start.                                                                                                                                                   |
| `Taken out while the game runs.`                                   | The mod was taken out during the session, for example by a reload.                                                                                                                                         |
| `THIS MOD NEEDS: {id}`                                             | A mod in `needs` is not in the list, so the mod did not start.                                                                                                                                             |
| `{mod} ({file}) not started: it needs {id}, which did not start`   | A needed mod did not start, so this one did not either.                                                                                                                                                    |
| `{count} mod problems: Mods > Log`                                 | Shown when the title appears, when there were problems before it.                                                                                                                                          |
| `{mod}: {count} more problems; only the first are kept`            | The mod log keeps a limited number of entries per mod.                                                                                                                                                     |
| `Mod messages are shown as codes: the importer library is missing` | Nebula's importer library is missing, so messages appear as codes and values. Reinstall Nebula.                                                                                                            |

## See also

- [Debugging](start/debugging.md)
- [lumalink explain](lumalink/explain.md)
- [lumalink check](lumalink/check.md)
- [How the validator works](reference/validator.md)
- [The mod log in depth](reference/mod-log.md)
- [luma.json: every field](reference/luma-json.md)
