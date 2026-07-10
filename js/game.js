// THE LOST MAINFRAME — a hidden text adventure beneath jacinto.design
"use strict";

window.PhosphorGame = (() => {
  const PASSWORD = "hunter2";
  const SAVE_KEY = "phosphor-dungeon-save";
  const BEST_KEY = "phosphor-best-ms";
  const ACH_KEY = "phosphor-achievements";

  const ITEMS = {
    keycard: { desc: "a magnetic keycard, stamped TAPE LIBRARY — ACCESS LEVEL 3" },
    flashlight: { desc: "a heavy aluminum flashlight. Still works." },
    note: { desc: 'a sticky note: "root pw: hunter2 (do NOT tell anyone)"' },
    fuse: { desc: "a 400A industrial fuse, miraculously intact" },
    tape: { desc: 'a 9-track backup tape, hand-labeled: PROJECT_07' },
  };

  const ROOMS = {
    terminal: {
      name: "Terminal Room",
      desc: [
        "You materialize in a dim terminal room. A dead CRT hums with residual",
        "charge. Dust hangs in the phosphor glow. This is sector 7 — the",
        "forgotten level beneath jacinto.design.",
      ],
      exits: { north: "hall", east: "breakroom" },
    },
    breakroom: {
      name: "Break Room",
      desc: [
        "A break room frozen in time. A vending machine blinks EXACT CHANGE",
        "ONLY. On the table, a keycard glints under an overturned coffee mug.",
      ],
      exits: { west: "terminal" },
      items: ["keycard"],
    },
    hall: {
      name: "Server Hall",
      desc: [
        "Racks stretch into the dark, LEDs blinking like slow constellations.",
        "Something big sleeps north of here. A door marked TAPE LIBRARY sits",
        "east; a cluttered office lies west.",
      ],
      exits: { south: "terminal", west: "office", east: "library", north: "core" },
    },
    office: {
      name: "Sysadmin Office",
      desc: [
        "The sysadmin's lair. Three monitors, one chair, zero ergonomics.",
        "A sticky note clings to a monitor. A desk drawer hangs open with a",
        "flashlight inside. A maintenance hatch in the floor leads south, down.",
      ],
      exits: { east: "hall", south: "tunnel" },
      items: ["note", "flashlight"],
    },
    library: {
      name: "Tape Library",
      desc: [
        "Steel shelves of 9-track tapes, most demagnetized to static. One tape",
        "sits apart in a cradle, labeled PROJECT_07. Beside it, a spare",
        "industrial fuse rests in a parts box.",
      ],
      exits: { west: "hall" },
      items: ["tape", "fuse"],
      locked: true,
    },
    tunnel: {
      name: "Maintenance Tunnel",
      desc: [
        "A narrow crawlspace of cable trays and condensation. Your flashlight",
        "beam catches a stenciled sign: SUBSTATION — SOUTH.",
      ],
      exits: { north: "office", south: "substation" },
      dark: true,
    },
    substation: {
      name: "Power Substation",
      desc: [
        "A wall of breakers, all thrown to OFF. The main breaker's fuse slot",
        "is empty and scorched — someone pulled it in a hurry.",
      ],
      exits: { north: "tunnel" },
    },
    core: {
      name: "Mainframe Core",
      desc: [], // dynamic — see describeCore()
      exits: { south: "hall" },
    },
  };

  const MAP_LABELS = {
    core: "MAINFRAME", office: "OFFICE   ", hall: "SRV HALL ", library: "TAPE LIB ",
    tunnel: "TUNNEL   ", terminal: "TERMINAL ", breakroom: "BREAK RM ", substation: "SUBSTATION",
  };

  const DIRS = { n: "north", s: "south", e: "east", w: "west", north: "north", south: "south", east: "east", west: "west" };

  let io, state, runStart;

  function freshState() {
    return {
      room: "terminal",
      inv: [],
      visited: new Set(["terminal"]),
      libraryUnlocked: false,
      power: false,
      tapeLoaded: false,
      awaitingPassword: false,
      pwFails: 0,
      won: false,
      elapsedMs: 0,
    };
  }

  function save() {
    if (state.won) return;
    const data = { ...state, visited: [...state.visited], elapsedMs: elapsedNow() };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (e) { /* private mode */ }
  }

  function loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      return { ...freshState(), ...data, visited: new Set(data.visited) };
    } catch (e) {
      return null;
    }
  }

  function elapsedNow() {
    return state.elapsedMs + (Date.now() - runStart);
  }

  function fmtTime(ms) {
    const s = Math.round(ms / 1000);
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  }

  function addAchievement(name) {
    let list;
    try { list = JSON.parse(localStorage.getItem(ACH_KEY) || "[]"); } catch (e) { list = []; }
    const isNew = !list.includes(name);
    if (isNew) {
      list.push(name);
      try { localStorage.setItem(ACH_KEY, JSON.stringify(list)); } catch (e) { /* ignore */ }
    }
    return isNew;
  }

  function start(ioHandle, opts = {}) {
    io = ioHandle;
    runStart = Date.now();
    const saved = !opts.fresh && loadSave();
    if (saved) {
      state = saved;
      io.print("");
      io.print("═══ THE LOST MAINFRAME ═══", "bright");
      io.print("");
      io.print(`(resuming saved expedition — ${fmtTime(state.elapsedMs)} on the clock.`, "dim");
      io.print(" type 'quit' then 'dungeon new' to start over.)", "dim");
      io.print("");
      look();
      return;
    }
    state = freshState();
    io.print("", "");
    io.print("═══ THE LOST MAINFRAME ═══", "bright");
    io.print("");
    io.print("The screen shudders. Your prompt falls away like a trapdoor.");
    io.print("Legend says a seventh project was lost down here when MAINFRAME-7");
    io.print("went dark. Find it. Bring it back online.");
    io.print("");
    io.print("Commands: look · go <n/s/e/w> · take <item> · use <item> · read <item>", "dim");
    io.print("          inventory (i) · map · hint · help · quit", "dim");
    io.print("(progress auto-saves. the clock is running.)", "dim");
    io.print("");
    look();
    save();
  }

  function room() { return ROOMS[state.room]; }
  function has(item) { return state.inv.includes(item); }

  function look() {
    const r = room();
    io.print(`── ${r.name} ──`, "bright");
    const desc = state.room === "core" ? describeCore() : r.desc;
    desc.forEach((l) => io.print(l));
    const here = (r.items || []).filter((i) => !has(i));
    if (here.length) io.print(`You see: ${here.join(", ")}`, "bright");
    io.print(`Exits: ${Object.keys(r.exits).join(", ")}`, "dim");
  }

  function describeCore() {
    if (!state.power) {
      return [
        "MAINFRAME-7 towers over you, cold and dead. Its console is dark.",
        "A status plate reads: NO POWER — CHECK SUBSTATION.",
      ];
    }
    if (!state.tapeLoaded) {
      return [
        "MAINFRAME-7 hums at idle, panels rippling with light. The console",
        "glows: INSERT BACKUP MEDIA TO RESTORE LOST SECTOR.",
      ];
    }
    return ["The tape drive spins steadily. The console blinks: AWAITING ROOT PASSWORD."];
  }

  function move(dirWord) {
    const dir = DIRS[dirWord];
    if (!dir) return io.print(`Go where? Try n, s, e, or w.`, "err");
    const r = room();
    const destKey = r.exits[dir];
    if (!destKey) return io.print("You can't go that way.", "err");

    if (destKey === "library" && !state.libraryUnlocked) {
      if (has("keycard")) {
        state.libraryUnlocked = true;
        io.print("You swipe the keycard. The reader blinks green and the vault door grinds open.", "bright");
      } else {
        return io.print("A heavy door with a card reader blocks the way. [LOCKED]", "err");
      }
    }

    if (ROOMS[destKey].dark && !has("flashlight")) {
      io.print("It is pitch black down there. You are likely to be eaten by a grue.");
      return io.print("You back away and stay where you are.", "dim");
    }

    state.room = destKey;
    state.visited.add(destKey);
    look();
  }

  function take(name) {
    if (!name) return io.print("Take what?", "err");
    const r = room();
    const item = (r.items || []).find((i) => i === name || i.startsWith(name));
    if (!item || has(item)) return io.print(`There's no ${name} here to take.`, "err");
    state.inv.push(item);
    io.print(`Taken: ${item} — ${ITEMS[item].desc}`);
    if (item === "keycard") io.print("The coffee mug rolls off the table and shatters. Nobody minds.", "dim");
  }

  function use(name) {
    if (!name) return io.print("Use what?", "err");
    const item = Object.keys(ITEMS).find((i) => i === name || i.startsWith(name));

    if (name.startsWith("breaker") || name.startsWith("lever")) {
      if (state.room !== "substation") return io.print("There's no breaker here.", "err");
      if (state.power) return io.print("The breakers are already on. The hum is almost musical.");
      return io.print("You heave the main breaker. It sparks, bites your hand, and snaps back to OFF.\nThe fuse slot is empty. It needs a fuse.", "err");
    }

    if (!item || !has(item)) return io.print(`You don't have a ${name}.`, "err");

    switch (item) {
      case "flashlight":
        return io.print("You click the flashlight. A warm cone of light. Very reassuring.");
      case "note":
        return read("note");
      case "keycard":
        return io.print(state.libraryUnlocked ? "Already used. The library stands open." : "Nothing to swipe here. The reader is on the tape library door, east of the server hall.");
      case "fuse":
        if (state.room !== "substation") return io.print("Nothing here takes a 400A fuse.", "err");
        if (state.power) return io.print("Power's already flowing.");
        state.power = true;
        io.print("You seat the fuse and heave the main breaker.", "bright");
        io.print("");
        io.print("Deep below, something enormous inhales. Rack by rack, the dark");
        io.print("goes green. Somewhere north, MAINFRAME-7 whines back to life.", "bright");
        return;
      case "tape":
        if (state.room !== "core") return io.print("The tape needs a tape drive. This isn't one.", "err");
        if (!state.power) return io.print("MAINFRAME-7 is dead. No power, no tape drive.", "err");
        if (state.tapeLoaded) return io.print("The tape is already spinning.");
        state.tapeLoaded = true;
        state.awaitingPassword = true;
        io.print("The drive swallows the tape and spins up with a rising whirr.", "bright");
        io.print("");
        io.print("CONSOLE: RESTORE STAGED — AWAITING ROOT PASSWORD", "bright");
        io.print("(type the password)", "dim");
        return;
    }
  }

  function read(name) {
    if (!name) return io.print("Read what?", "err");
    if (name.startsWith("note")) {
      if (!has("note")) return io.print("You don't have a note.", "err");
      return io.print('The sticky note reads: "root pw: hunter2 (do NOT tell anyone)"', "bright");
    }
    return io.print(`Nothing to read on the ${name}.`, "err");
  }

  function inventory() {
    if (!state.inv.length) return io.print("You are carrying nothing but ambition.", "dim");
    io.print("You are carrying:", "bright");
    state.inv.forEach((i) => io.print(`  ${i} — ${ITEMS[i].desc}`));
  }

  function map() {
    const cell = (key) => {
      const l = MAP_LABELS[key];
      const shown = state.visited.has(key) ? l : "▒".repeat(l.length);
      return (state.room === key ? "●" : " ") + shown;
    };
    io.print([
      "                ┌───────────┐",
      `                │${cell("core")} │`,
      "                └─────┬─────┘",
      " ┌───────────┐  ┌─────┴─────┐  ┌───────────┐",
      ` │${cell("office")} ├──┤${cell("hall")} ├──┤${cell("library")} │`,
      " └─────┬─────┘  └─────┬─────┘  └───────────┘",
      " ┌─────┴─────┐  ┌─────┴─────┐  ┌───────────┐",
      ` │${cell("tunnel")} │  │${cell("terminal")} ├──┤${cell("breakroom")} │`,
      " └─────┬─────┘  └───────────┘  └───────────┘",
      " ┌─────┴─────┐",
      ` │${cell("substation")}│`,
      " └───────────┘",
      "  ● = you are here",
    ].join("\n"), "dim");
  }

  function hint() {
    let h;
    if (!has("keycard") && !state.libraryUnlocked) h = "That overturned coffee mug in the break room looks suspicious.";
    else if (!state.libraryUnlocked) h = "The keycard opens something east of the server hall.";
    else if (!has("tape") || !has("fuse")) h = "The tape library holds more than tapes. Take everything that isn't bolted down.";
    else if (!has("flashlight")) h = "Sysadmins keep useful things in desk drawers.";
    else if (!state.power) h = "Dark tunnels are safe with a flashlight. The substation wants its fuse back.";
    else if (!state.tapeLoaded) h = "MAINFRAME-7 is hungry. Feed it the tape.";
    else if (state.awaitingPassword) h = "The password? Somebody definitely wrote it down somewhere.";
    else h = "You're closer than you think. Look around.";
    io.print(`HINT: ${h}`, "dim");
  }

  function help() {
    io.print([
      "look (l)          describe where you are",
      "go <dir>          move: go north — or just n / s / e / w",
      "take <item>       pick something up",
      "use <item>        use an item here",
      "read <item>       read something",
      "inventory (i)     what you're carrying",
      "map               chart of explored rooms",
      "hint              a nudge in the right direction",
      "quit              wake up back in the shell",
    ].join("\n"), "dim");
  }

  function tryPassword(guess) {
    if (guess.toLowerCase() === PASSWORD) return win();
    state.pwFails++;
    io.print("CONSOLE: ACCESS DENIED", "err");
    if (state.pwFails >= 2) io.print("HINT: somebody definitely wrote it down somewhere.", "dim");
  }

  function win() {
    state.won = true;
    state.awaitingPassword = false;
    const total = elapsedNow();
    let best = null;
    try { best = Number(localStorage.getItem(BEST_KEY)) || null; } catch (e) { /* ignore */ }
    const isBest = !best || total < best;
    if (isBest) {
      try { localStorage.setItem(BEST_KEY, String(total)); } catch (e) { /* ignore */ }
    }
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
    io.print("");
    io.print("CONSOLE: ROOT ACCESS GRANTED", "bright");
    io.print("CONSOLE: RESTORING LOST SECTOR ..........", "bright");
    io.print("");
    io.print([
      "       ___________",
      "      '._==_==_=_.'",
      "      .-\\:      /-.",
      "     | (|:.     |) |",
      "      '-|:.     |-'",
      "        \\::.    /",
      "         '::. .'",
      "           ) (",
      "         _.' '._",
      "        `\"\"\"\"\"\"\"`",
    ].join("\n"), "ascii");
    io.print("");
    io.print("PROJECT_07 RESTORED: \"Agentic Engineering\"", "bright");
    io.print("A course on building production-grade AI agents — coming soon");
    io.print("to Zero to Mastery. You found it before the release. Nice.");
    io.print("");
    addAchievement("SYSOP");
    io.print("★ ACHIEVEMENT UNLOCKED: SYSOP", "bright");
    if (state.inv.length === Object.keys(ITEMS).length) {
      addAchievement("COMPLETIONIST");
      io.print("★ ACHIEVEMENT UNLOCKED: COMPLETIONIST — every item recovered", "bright");
    }
    io.print(`TIME: ${fmtTime(total)}${isBest ? " — new personal best" : ""}`, "bright");
    io.print("MAINFRAME-7 will remember you. Your prompt has been upgraded.", "dim");
    io.print("");
    io.exit(true);
  }

  function handle(raw) {
    route(raw);
    if (!state.won) save();
  }

  function route(raw) {
    const input = raw.trim().toLowerCase();
    if (!input) return;

    if (state.awaitingPassword) {
      const passthrough = ["quit", "exit", "hint", "help", "look", "l", "i", "inventory", "map"];
      if (!passthrough.includes(input)) return tryPassword(input);
    }

    const [verb, ...rest] = input.split(/\s+/);
    const arg = rest.join(" ").replace(/^(the|a|an)\s+/, "");

    if (DIRS[verb] && !rest.length) return move(verb);

    switch (verb) {
      case "go": case "walk": case "move": return move(arg);
      case "look": case "l": case "examine": case "x": return look();
      case "take": case "get": case "grab": case "pick": return take(arg.replace(/^up\s+/, ""));
      case "use": case "insert": case "swipe": case "install": return use(arg);
      case "read": return read(arg);
      case "inventory": case "i": case "inv": return inventory();
      case "map": return map();
      case "hint": case "hints": return hint();
      case "help": case "?": return help();
      case "xyzzy": return io.print("A hollow voice says: \"You're already here.\"", "dim");
      case "quit": case "exit": case "q":
        io.print("The dungeon dissolves into phosphor static. You wake at your shell.", "dim");
        io.print("(progress saved — 'dungeon' resumes where you left off.)", "dim");
        io.print("");
        return io.exit(false);
      default:
        return io.print(`I don't know how to "${verb}" here. Try 'help'.`, "err");
    }
  }

  return { start, handle };
})();
