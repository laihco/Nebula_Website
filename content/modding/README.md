# Writing the modding docs

Every page of the website's **Modding** section (`/mods/`) is generated from the Markdown files in this folder.
`npm run content` (and `npm run dev` / `npm run build`) turns them into HTML with the sidebar, search, on-page
contents and previous/next links. Do not edit the generated `mods/**/index.html` files.

## Folders

Each folder is one section of the sidebar. `sections.json` gives each section's title, short description and order.

| Folder        | Section         | What belongs here                                                        |
| ------------- | --------------- | ------------------------------------------------------------------------ |
| `start/`      | Getting started | What every modder needs: concepts, tools, first mod, workflow, debugging |
| `tutorials/`  | Tutorials       | Complete, worked mods, explained step by step                            |
| `lumascript/` | LumaScript      | The language: a guide first, then the advanced corners                   |
| `lumakit/`    | LumaKit         | The ready-made gameplay library: one page per module                     |
| `services/`   | Services        | `svc.*`: files, saves, network, input, audio, time, UI and more          |
| `content/`    | Content         | Models, animation, materials, effects, sound, screens, stages, tables    |
| `lumalink/`   | LumaLink CLI    | The command-line tool: one page per command                              |
| `reference/`  | Reference       | Complete formats, error codes and how the game runs a mod                |

## A page

Follow the [GitHub Docs content model](https://docs.github.com/en/contributing/style-guide-and-content-model/about-the-github-docs-content-model) when choosing a structure:

- **Quickstarts** give prerequisites, one small task, a way to verify success, and a few next steps.
- **Tutorials** walk through a complete example and explain choices as they come up.
- **Reference** pages document syntax, options, defaults, and limits for readers looking up a detail.

Use task headings for procedures, name the file or working directory before a code block, and state what the reader should see after running a command. Keep reference tables on the pages where readers look up those details.

```markdown
---
title: Your first mod
nav_title: First mod
description: Make a mod that counts Mario's jumps — one folder, two files, three commands.
order: 3
level: essential
---

One or two sentences that say what this page teaches and why you would read it.

## First heading

...
```

| Field         | Required | Meaning                                                                                  |
| ------------- | -------- | ---------------------------------------------------------------------------------------- |
| `title`       | yes      | The page's heading and browser title.                                                    |
| `nav_title`   | no       | A shorter label for the sidebar (for example `hud` for "LumaKit: hud").                  |
| `description` | yes      | One sentence. Used on cards, in search results and for search engines.                   |
| `order`       | yes      | Position within the section (1 = first).                                                 |
| `level`       | yes      | `essential` (most modders need it), `intermediate`, or `advanced` (depth and internals). |
| `status`      | no       | `planned` when the page describes something not built yet.                               |

Do not write a `#` heading: the title comes from the front matter. Use `##` for the page's main parts (they appear
in "On this page") and `###` below them.

## Links between pages

Link to another page by its path in this folder, with an optional heading anchor:

```markdown
See [the HUD module](lumakit/hud.md) and [corners](lumakit/hud.md#corners).
```

A heading's anchor is its text in lower case with every run of other characters replaced by `-`
(`## Timers and counters` → `#timers-and-counters`). The build stops with an error naming any link that does not
lead to a page or heading, so broken links cannot be published.

## Code

Name the language after the opening fence. A second word is shown as the file name:

````markdown
```lumascript source/main.lum
on start {
    log "hello"
}
```
````

Languages: `lumascript`, `json`, `sh`, `c`, `text`.

## Callouts

```markdown
> [!NOTE]
> Extra information worth knowing.

> [!TIP]
> A shortcut or good habit.

> [!WARNING]
> Something that can break a mod or lose a player's data.

> [!PLANNED]
> Described here, but not built yet.
```

## Style

- Write for someone who has played the game and maybe written a little code, not for the engine's authors.
- Put what most people need first. Move depth to later headings or to an `advanced` page, and link to it.
- Every page that describes an API opens with a short, complete example, then a reference table, then details.
- Explain _why_ as well as _what_, in short sentences. Use "you".
- Keep facts exact: names, codes, limits and defaults must match the toolkit.
