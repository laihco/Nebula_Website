---
title: lumalink build
nav_title: lumalink build
description: Compile a mod's LumaScript and C code to native libraries for every platform.
order: 5
level: essential
---

`lumalink build` compiles a mod's code, LumaScript and C, to native code for every platform. A mod's code is never
interpreted in the game: what the game loads is what `build` makes.

## Usage

```text
lumalink build --names <FOLDER> [OPTIONS] <FOLDER>
```

## Example

Build the "Hello" mod, after `check` passes:

```sh
lumalink build hello --names <names folder>
```

`build` compiles `source/` and writes one library set per platform under `code/<platform>/`. An error in your
LumaScript is reported with its `S` code, its file, line and column.

If you have not set `LUMA_INCLUDE` and `LUMALINK_CLANG`, name the SDK folder and clang yourself:

```sh
lumalink build hello --names <names folder> --sdk <folder with luma.h> --clang <path to clang>
```

To see the C that LumaScript compiles to, keep it in a folder:

```sh
lumalink build hello --names <names folder> --work build/hello-c
```

> [!NOTE]
> The tutorials write the short form `lumalink build <folder>`. The tool's own usage lists `--names` as required,
> so the examples here give it.

## Arguments

| Argument   | Description     |
| ---------- | --------------- |
| `<FOLDER>` | The mod folder. |

## Options

| Option                  | Default                                                                 | Description                                                                                                                        |
| ----------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `--names <FOLDER>`      | required                                                                | The game's function rows and types file (a kernel build's luma folder), for the rules on a mod's code.                             |
| `--sdk <FOLDER>`        | `LUMA_INCLUDE`                                                          | The folder with the game's luma.h.                                                                                                 |
| `--clang <FILE>`        | `LUMALINK_CLANG`, then LLVM's own folder, then the system's search path | The clang to build with.                                                                                                           |
| `--work <FOLDER>`       | a temporary folder, removed after                                       | Keep the generated C in this folder.                                                                                               |
| `-h, --help`            |                                                                         | Print this help.                                                                                                                   |
| `--language <LANGUAGE>` | `UsEnglish`                                                             | The language LumaLink and the validator speak: one of the game's 14, by its name in the game (UsEnglish, EuGerman, JpJapanese...). |

## Notes

### What it writes

| Platform                       | Library in `code/<platform>/`                |
| ------------------------------ | -------------------------------------------- |
| `windows-x64`, `windows-arm64` | `mod.dll`                                    |
| `linux-x64`, `linux-arm64`     | `mod.so`                                     |
| `macos-arm64`, `macos-x64`     | `mod.dylib`                                  |
| `android-arm64`, `android-x64` | `mod.so`                                     |
| `ios-arm64`                    | `mod.dylib` (unsigned; signed on the device) |

`luma.json` lists the platforms built under `code.platforms`, and under `build` the LumaLink version and the game
description the code was built against, which is what [`lumalink verify`](lumalink/verify.md) needs later. A
platform missing from `code.platforms` means the mod's code does not run there: the game turns the mod off on that
platform and says why (`L507`).

### How the code is checked

- Every game name your code uses (a function to hook, a class, a field) is checked against the game's description
  of itself, from the `--names` folder. A name the game does not have, or a signature that differs, stops the build
  with an `S` code naming it.
- Using a service whose permission `luma.json` does not declare is a build error naming the permission. The game
  reports the same mod with `L506`.
- A mod that writes `use kit.<module>` needs LumaKit in its `needs`; LumaLink reads LumaKit's interface from the
  needed `.luma`.
- The same names are checked again when a player imports the mod, with the same rule and the same message.

### What the compiler makes

LumaScript compiles to C: one C file per module, with `#line` markers so errors point at your `.lum` files, plus a
generated list of every game name the mod imports. Clang then compiles that C, and any C or C++ files in `source/`,
against the game's `luma.h`. `--work` keeps the generated C so you can read it; see
[What the compiler emits](lumascript/compiled-form.md).

### Languages

The command speaks one of the game's 14 languages (`--language`); its findings are the validator's, with the same
codes the game shows.

## See also

- [LumaLink overview: the build environment](lumalink/overview.md#the-build-environment)
- [Install the tools](start/install.md)
- [LumaScript at a glance](lumascript/overview.md)
- [What the compiler emits](lumascript/compiled-form.md)
- [Errors at build time and while the game runs](lumascript/errors.md)
- [lumalink check](lumalink/check.md)
- [lumalink pack](lumalink/pack.md)

## Full help text

```text
Build a mod's code (LumaScript and C) for every platform.

Usage: lumalink build --names <FOLDER> [OPTIONS] <FOLDER>

Arguments:
  <FOLDER>  The mod folder.

Options:
      --names <FOLDER>       The game's function rows and types file (a kernel build's luma folder), for the rules on a mod's code.
      --sdk <FOLDER>         The folder with the game's luma.h. Default: LUMA_INCLUDE.
      --clang <FILE>         The clang to build with. Default: LUMALINK_CLANG, then LLVM's own folder, then the system's search path.
      --work <FOLDER>        Keep the generated C in this folder. Default: a temporary folder, removed after.
  -h, --help                 Print this help.
      --language <LANGUAGE>  The language LumaLink and the validator speak: one of the game's 14, by its name in the game (UsEnglish, EuGerman, JpJapanese...). Default: UsEnglish.
```
