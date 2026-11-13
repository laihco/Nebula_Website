---
title: Add a mod option
nav_title: Add a mod option
description: Add a toggle to the Hello mod so players can control its jump messages from the Mods screen.
order: 12
level: essential
---

## Prerequisites

Complete the [quickstart](start/first-mod.md) and verify that the Hello mod writes jump messages to the log.

## Define the option

In `hello/luma.json`, add the `options` array and change the version to `1.1.0`.

```json luma.json
{
  "format": "1.0",
  "id": "you.hello",
  "version": "1.1.0",
  "name": "Hello",
  "summary": "Logs Mario's jump attempts.",
  "authors": ["you"],
  "game": { "id": "RMG", "regions": ["RMGE01", "RMGP01", "RMGJ01"] },
  "options": [{ "key": "announce", "kind": "toggle", "default": true, "name": "Log each jump" }]
}
```

## Read the option in LumaScript

Replace `hello/source/main.lum` with the following code.

```lumascript source/main.lum
option announce: bool

var jumps: int = 0

on start {
    log "hello"
}

hook before Mario::tryJump() {
    jumps = jumps + 1
    if announce {
        log "jump {jumps}"
    }
}
```

The declaration uses the manifest key `announce`. A manifest option of kind `toggle` has type `bool` in LumaScript.

## Verify the toggle

1. [Check, build, and package the mod](start/first-mod.md#check-build-and-package-the-mod) again.
1. Install `you.hello-1.1.0.luma` and open **Hello** on the **Mods** screen.
1. Turn off **Log each jump**, then jump and check **Mods > Log**. The mod should stop adding jump messages. Turn the option back on to resume logging.

For other option types, see [Lifecycle, options and frames](lumascript/events.md). For versioning and distribution, see [Versions and sharing](start/sharing.md).
