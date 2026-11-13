---
title: lumalink verify
nav_title: lumalink verify
description: Check that a .luma is exactly what its mod folder packs to.
order: 9
level: intermediate
---

`lumalink verify` checks that a `.luma` is exactly what its mod folder packs to. Use it before you publish, or to
confirm that a `.luma` someone shares really comes from the sources they share with it.

## Usage

```text
lumalink verify --source <FOLDER> [OPTIONS] <FILE>
```

## Example

You packed `hello` and want to be sure the file matches the folder:

```sh
lumalink pack hello
lumalink verify --source hello you.hello-1.0.0.luma
```

`verify` compares the file with what the folder packs to. A difference means the `.luma` is not what this folder
makes: it was packed from other sources, changed afterwards, or the folder has changed since.

## Arguments

| Argument | Description     |
| -------- | --------------- |
| `<FILE>` | The .luma file. |

## Options

| Option                  | Default     | Description                                                                                                                        |
| ----------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `--source <FOLDER>`     | required    | The mod folder it was packed from.                                                                                                 |
| `-h, --help`            |             | Print this help.                                                                                                                   |
| `--language <LANGUAGE>` | `UsEnglish` | The language LumaLink and the validator speak: one of the game's 14, by its name in the game (UsEnglish, EuGerman, JpJapanese...). |

## Notes

- A mod with code records what it was built with in `luma.json` under `build`: the LumaLink version and commit, and
  the game description the code was built against. That is what `verify` needs. LumaLink writes it when it builds
  the code ([`lumalink build`](lumalink/build.md)).
- A `.luma`'s `source/` folder (LumaScript and C sources, and the build description) is not read by the game. It is
  there for `verify`.
- The command speaks one of the game's 14 languages (`--language`); its findings are the validator's, with the same
  codes the game shows.

## See also

- [Versions, dependencies and sharing](start/sharing.md)
- [The .luma file format](reference/luma-format.md)
- [luma.json](reference/luma-json.md)
- [lumalink pack](lumalink/pack.md)
- [lumalink build](lumalink/build.md)

## Full help text

```text
Check that a .luma is exactly what its folder packs to.

Usage: lumalink verify --source <FOLDER> [OPTIONS] <FILE>

Arguments:
  <FILE>  The .luma file.

Options:
      --source <FOLDER>      The mod folder it was packed from.
  -h, --help                 Print this help.
      --language <LANGUAGE>  The language LumaLink and the validator speak: one of the game's 14, by its name in the game (UsEnglish, EuGerman, JpJapanese...). Default: UsEnglish.
```
