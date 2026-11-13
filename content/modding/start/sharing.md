---
title: Versions, dependencies and sharing
nav_title: Sharing
description: Version numbers, needs and conflicts, load order, regions and Nebula versions, packing and verifying a release, and how players install it.
order: 8
level: intermediate
---

Once your mod works on your machine, this page helps it work for everyone else. It covers numbering versions, depending on other mods, saying which games and Nebula releases it supports, and packing a `.luma` that others can trust and install.

## A release checklist

1. Bump `version` in `luma.json` (see below).
2. Check it, for every platform: `lumalink check --names <names> --game <game.pak> <folder>`.
3. Run your tests: `lumalink test <folder>`.
4. Pack: `lumalink pack --names <names> --game <game.pak> <folder>`.
5. Install the `.luma` itself (not your folder) on a fresh game, switch it on, and play.
6. Share the `.luma` file, and keep the source folder you packed it from.

## Version numbers

`version` is a semantic version, `MAJOR.MINOR.PATCH`, with an optional pre-release suffix such as `1.2.0-beta.1`. Versions are compared by semantic-versioning rules, which is how other mods' `needs` ranges are matched against yours.

| Change                                                                    | Bump  | Example            |
| ------------------------------------------------------------------------- | ----- | ------------------ |
| A fix that changes nothing anyone relies on                               | PATCH | `1.0.0` to `1.0.1` |
| Something new; everything that worked still works                         | MINOR | `1.0.1` to `1.1.0` |
| Something removed or changed that other mods or players' settings rely on | MAJOR | `1.1.0` to `2.0.0` |

This matters most for library mods that other mods `use`. LumaKit, for example, only adds within 1.x, so a mod that needs `^1` keeps working with every 1.x release.

> [!TIP]
> Keep your `id` forever. Saves, options and permission answers are all keyed by it. If you must rename it, list the old id in `takes_over` (below) so players keep their settings.

## Depending on other mods

### needs

`needs` lists the mods yours can't work without, each with a version range:

```json
{ "needs": [{ "id": "lumakit", "version": "^1" }] }
```

Each needed mod must be installed, on, and loaded before yours. Otherwise your mod is off, with the reason (L800). A mod that writes `use kit.<module>`, or `use <mod id>.<module>` for any library mod, must list that mod in `needs`. Without it, the compiler stops at the `use` line and names the `needs` entry to add. A patch that changes a file another mod brings also needs that mod in `needs` (L405).

When a mod you need is taken out (switched off or reloaded), your mod is taken out first.

### conflicts

`conflicts` lists mods that must not be on with yours, each with a `why` the player is shown:

```json
{ "conflicts": [{ "id": "other-flower", "why": "Both change the Fire Flower." }] }
```

The two can't be on together. The player is shown your `why` (L801).

### load order

Mods load in the order of the Mods list, top first. When two mods change the same thing, the order settles it, and the player is always told:

- **Whole files**: the mod higher in the list is used (L305, a Note naming both mods and the path).
- **Table cells**: the change of the mod higher in the list is used (L404, a Note naming the cell).
- **Hooks**: run in load order. Only one mod may `replace` a given function. A second mod's `replace` is refused (L805, naming the mod that holds it).

If your mod must load after or before another when both are on, say so:

```json
{ "load": { "after": ["lumakit"], "before": [] } }
```

An order that can't be met (a cycle) is an error naming it (L212).

### takes_over

`takes_over` lists earlier ids of this same mod. Their saves and options move to the new id:

```json
{ "takes_over": ["goldflower-old"] }
```

## Which games and which Nebula

| Key                 | Meaning                                                                                                                  | When it doesn't match                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| `game.regions`      | The game releases the mod works with: `RMGE01` (North America), `RMGP01` (Europe), `RMGJ01` (Japan). Default: all three. | The mod shows as off, with the reason (L208, a Note)                 |
| `format`            | The `.luma` format the mod needs, `"1.0"`. A game refuses a format newer than the ones it reads.                         | "made for a newer Nebula" (L205)                                     |
| `nebula`            | A semver range of Nebula releases, such as `">=2.0.0"`. Default: any release that reads this format.                     | L803, naming the version needed                                      |
| `code.platforms`    | The platforms your code was built for                                                                                    | Off on a missing platform (L507, a Note), unless the mod has no code |
| `renderer.features` | Graphics features the mod can't do without                                                                               | Off on a device without them (L806)                                  |

Listing fewer regions is better than claiming all three and breaking on one. Use a layer with a `region` condition for text or files that differ between releases. If your mod can do without a graphics feature, don't list it: ask for it at run time instead.

## How players see your mod

The Mods screen shows your `name`, `summary`, `version`, `authors`, `icon` and `pictures`, and your options. To reach players in other languages, give translations in `text`:

```json
{
  "text": { "JpJapanese": { "name": "ゴールドフラワー", "summary": "..." } }
}
```

The game shows the player's language when you've given it, and `name` and `summary` otherwise. `license` (an SPDX expression such as `"GPL-3.0-only"`) and `links` (`home`, `source`, `issues`, all `https`) tell players where to find out more.

## Pack and verify

`lumalink pack` runs every rule and writes `<id>-<version>.luma` beside the folder (or where `-o` says). The `.luma` is a zip file, but always make it with `pack`. Hand-made archives can break rules that `pack` keeps (file names, folder separators, sizes).

`lumalink verify` checks that a `.luma` is exactly what its source folder packs to:

```sh
lumalink verify --source gold-flower gold-flower-1.0.0.luma
```

The build is reproducible: the same sources, the same LumaLink release and the same game description give byte-identical libraries. That lets anyone with your sources confirm that the `.luma` you shared was built from them. For this, LumaLink records in `luma.json`'s `build` key the LumaLink version and the game description it built against. Publishing your source folder alongside the `.luma` lets players and other modders verify it.

## How players install it

Players drop the `.luma` on the game's window, or copy it into the game's `mods` folder, then switch it on on the Mods screen. Installing it:

1. checks the whole `.luma` with every rule, the same check you ran with LumaLink;
2. asks the player to allow its code and permissions (see [Permissions](start/permissions.md));
3. offers any save files the mod brings in `saves/`, showing your `why`. The player picks a file to replace or declines, and confirms in the game's own screen.

At each start, the game checks again what depends on the player's setup (region, other mods, options, this device), cooks the mod's content for this device, and loads its code.

An update is installed the same way. If it changes the code or a permission, the player is asked again before it runs.

> [!NOTE]
> Players can also be pointed to the Player guide's Mods page, which covers installing mods in general.

## See also

- [luma.json reference](reference/luma-json.md)
- [How the game loads a mod](reference/loading.md)
- [`lumalink pack`](lumalink/pack.md)
- [`lumalink verify`](lumalink/verify.md)
- [Permissions](start/permissions.md)
