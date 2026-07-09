// Phosphor — the terminal shell
"use strict";

(() => {
  const D = window.PhosphorData;
  const output = document.getElementById("output");
  const input = document.getElementById("cmd");
  const inputLine = document.getElementById("input-line");
  const promptLabel = document.getElementById("prompt-label");
  const screen = document.getElementById("screen");
  const chips = document.getElementById("chips");

  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const state = {
    mode: "shell", // "shell" | "game"
    history: [],
    hIndex: -1,
    draft: "",
    user: localStorage.getItem("phosphor-user") || "guest",
    booted: false,
    skipBoot: false,
  };

  // ── output helpers ──────────────────────────────────────────────

  const esc = (s) =>
    String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  function print(text = "", cls = "") {
    const div = document.createElement("div");
    div.className = "line" + (cls ? " " + cls : "");
    div.textContent = text;
    output.appendChild(div);
    scrollDown();
    return div;
  }

  function printHTML(html, cls = "") {
    const div = document.createElement("div");
    div.className = "line" + (cls ? " " + cls : "");
    div.innerHTML = html;
    output.appendChild(div);
    scrollDown();
    return div;
  }

  const link = (href, label) =>
    `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(label || href)}</a>`;

  function scrollDown() {
    screen.scrollTop = screen.scrollHeight;
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function printLines(lines, delay = 26) {
    for (const l of lines) {
      print(l.text ?? l, l.cls ?? "");
      if (!REDUCED && !state.skipBoot && delay) await sleep(delay);
    }
  }

  function promptString() {
    return `${state.user}@jacinto:~$`;
  }

  function echoCommand(raw) {
    const div = document.createElement("div");
    div.className = "line";
    const p = document.createElement("span");
    p.className = "prompt";
    p.textContent = state.mode === "game" ? "dungeon>" : promptString();
    const c = document.createElement("span");
    c.className = "cmd-echo";
    c.textContent = " " + raw;
    div.append(p, c);
    output.appendChild(div);
    scrollDown();
  }

  // ── banner ──────────────────────────────────────────────────────

  const BANNER = [
    "     ██╗ █████╗  ██████╗██╗███╗   ██╗████████╗ ██████╗ ",
    "     ██║██╔══██╗██╔════╝██║████╗  ██║╚══██╔══╝██╔═══██╗",
    "     ██║███████║██║     ██║██╔██╗ ██║   ██║   ██║   ██║",
    "██   ██║██╔══██║██║     ██║██║╚██╗██║   ██║   ██║   ██║",
    "╚█████╔╝██║  ██║╚██████╗██║██║ ╚████║   ██║   ╚██████╔╝",
    " ╚════╝ ╚═╝  ╚═╝ ╚═════╝╚═╝╚═╝  ╚═══╝   ╚═╝    ╚═════╝ ",
  ].join("\n");

  function banner() {
    print(BANNER, "ascii");
    print("");
    print(`${D.site.person} · ${D.site.title}`, "bright");
    print(`${D.site.location}`, "dim");
    print("");
  }

  // ── commands ────────────────────────────────────────────────────

  const FILES = {
    "about.txt": () => commands.about.fn(),
    "skills.txt": () => commands.skills.fn(),
    "contact.txt": () => commands.contact.fn(),
    "socials.txt": () => commands.socials.fn(),
    "readme.md": () => {
      print("# phosphor", "bright");
      print("A green-phosphor terminal portfolio. Vanilla HTML/CSS/JS, no build");
      print("step, no framework. The CRT is a lie, but a loving one.");
    },
    ".dungeon": () => {
      print("01100100 01110101 01101110 01100111 01100101 01101111 01101110", "dim");
      print("");
      print("They sealed sector 7 after MAINFRAME-7 went dark.");
      print("The door still answers to one word: dungeon", "bright");
    },
  };

  const commands = {
    help: {
      desc: "list commands",
      fn() {
        print("CORE", "bright");
        print("  about          who is jacinto?");
        print("  projects       browse the work");
        print("  open <id>      open a project in a new tab (e.g. open vibemail)");
        print("  skills         the toolbox");
        print("  now            what i'm building right now");
        print("  contact        get in touch");
        print("  socials        elsewhere on the internet");
        print("");
        print("TERMINAL", "bright");
        print("  banner         reprint the banner");
        print("  theme <t>      green | amber | ice");
        print("  ls / cat       poke around the filesystem");
        print("  clear          wipe the screen");
        print("  history        command history");
        print("");
        print("tab completes commands · ↑/↓ recall history", "dim");
        print("some commands aren't listed.", "dim");
      },
    },

    about: {
      desc: "who is jacinto?",
      fn() {
        D.about.forEach((l) => print(l));
        print("");
        D.stats.forEach(([v, l]) => printHTML(`<span class="k">${esc(v.padEnd(5))}</span>${esc(l)}`));
      },
    },

    projects: {
      desc: "browse the work",
      fn() {
        print("PROJECTS — type 'open <id>' for details + live link", "dim");
        print("");
        D.projects.forEach((p) => {
          const id = p.id.padEnd(16);
          const status = p.status === "soon" ? "  [COMING SOON]" : "";
          printHTML(
            `<span class="k">${esc(id)}</span>${esc(p.title.padEnd(22))}<span class="dim">${esc(p.year)}  ${esc(p.category)}</span>${status ? `<span class="k">${status}</span>` : ""}`
          );
        });
      },
    },

    open: {
      desc: "open a project",
      fn(args) {
        const id = (args[0] || "").toLowerCase();
        if (!id) {
          print("usage: open <id> — try 'projects' for the list", "err");
          return;
        }
        const p = D.projects.find((x) => x.id === id || x.id.startsWith(id));
        if (!p) {
          print(`no project matching '${id}' — try 'projects'`, "err");
          return;
        }
        print(`${p.title} (${p.year}) — ${p.category}`, "bright");
        print("");
        print(p.description);
        print("");
        print(`stack: ${p.tech.join(" · ")}`, "dim");
        if (p.status === "soon") {
          print("");
          print("status: in development — no link yet. it may already exist somewhere down below…", "dim");
          return;
        }
        printHTML(`live:  ${link(p.href)}`);
        if (p.repo) printHTML(`repo:  ${link(p.repo)}`);
        print("");
        print("opening live site in a new tab…", "dim");
        window.open(p.href, "_blank", "noopener");
      },
    },

    skills: {
      desc: "the toolbox",
      fn() {
        D.skills.forEach(([cat, list]) =>
          printHTML(`<span class="k">${esc(cat.padEnd(11))}</span>${esc(list)}`)
        );
      },
    },

    now: {
      desc: "currently building",
      fn() {
        print("CURRENTLY BUILDING", "bright");
        print("");
        print(D.now.title, "bright");
        print(D.now.blurb);
      },
    },

    contact: {
      desc: "get in touch",
      fn() {
        printHTML(`email:    ${link("mailto:" + D.site.email, D.site.email)}`);
        printHTML(`website:  ${link(D.site.url, "jacinto.design")}`);
        print("");
        print("inbox is open — projects, courses, or just to say hi.", "dim");
      },
    },

    socials: {
      desc: "elsewhere",
      fn() {
        D.socials.forEach(([label, handle, href]) =>
          printHTML(`<span class="k">${esc(label.padEnd(10))}</span>${link(href, handle)}`)
        );
      },
    },

    banner: { desc: "reprint banner", fn: banner },

    theme: {
      desc: "set phosphor",
      fn(args) {
        const t = (args[0] || "").toLowerCase();
        if (!["green", "amber", "ice"].includes(t)) {
          print("usage: theme green | amber | ice", "err");
          return;
        }
        document.documentElement.dataset.theme = t;
        localStorage.setItem("phosphor-theme", t);
        print(`phosphor set to ${t}.`);
      },
    },

    clear: {
      desc: "wipe screen",
      fn() {
        output.innerHTML = "";
      },
    },

    history: {
      desc: "command history",
      fn() {
        state.history.forEach((h, i) => print(`  ${String(i + 1).padStart(3)}  ${h}`, "dim"));
      },
    },

    ls: {
      desc: "list files",
      fn(args) {
        const all = args.includes("-a") || args.includes("-la") || args.includes("-al");
        const files = ["about.txt", "contact.txt", "projects/", "readme.md", "skills.txt", "socials.txt"];
        if (all) files.unshift(".dungeon");
        print(files.join("   "));
        if (all) print("(that first one wasn't there yesterday)", "dim");
      },
    },

    cat: {
      desc: "read a file",
      fn(args) {
        const f = (args[0] || "").toLowerCase();
        if (!f) return print("usage: cat <file>", "err");
        const reader = FILES[f];
        if (reader) return reader();
        if (f === "projects" || f === "projects/") return print("cat: projects/ is a directory — try 'projects'", "err");
        print(`cat: ${f}: no such file`, "err");
      },
    },

    whoami: {
      desc: "who are you?",
      fn() {
        if (state.user === "sysop") {
          print("sysop ★ — the one who rebooted MAINFRAME-7.", "bright");
        } else {
          print("guest — read access to everything that matters.");
        }
      },
    },

    date: { desc: "current date", fn: () => print(new Date().toString()) },

    echo: { desc: "echo", fn: (args) => print(args.join(" ")) },

    exit: {
      desc: "leave",
      fn() {
        print("there is no exit. there is only the terminal.", "dim");
        print("(closing the tab works too.)", "dim");
      },
    },

    // ── hidden ────────────────────────────────────────────────────

    xyzzy: {
      hidden: true,
      fn() {
        print("A hollow voice says: \"Plugh.\"", "dim");
        print("");
        print("…the floor feels thin here. Sector 7 is right below you.");
        print("The old door still answers to: dungeon", "bright");
      },
    },

    dungeon: {
      hidden: true,
      fn() {
        enterGame();
      },
    },

    sudo: {
      hidden: true,
      fn(args) {
        if (state.user === "sysop") {
          print("you're already root down here. MAINFRAME-7 saw to that.", "bright");
        } else {
          print(`${state.user} is not in the sudoers file. This incident will be reported.`, "err");
          print("(to whom? nobody knows.)", "dim");
        }
      },
    },

    rm: {
      hidden: true,
      fn(args) {
        if (args.join(" ").replace(/\s+/g, " ").includes("-rf /")) {
          print("nice try.", "bright");
          print("this portfolio has survived worse code reviews.", "dim");
        } else {
          print("rm: permission denied (everything here is load-bearing)", "err");
        }
      },
    },

    coffee: {
      hidden: true,
      fn() {
        print("      ( (");
        print("       ) )");
        print("    ........");
        print("    |      |]");
        print("    \\      /");
        print("     `----'");
        print("brewing… done. productivity +12%.", "dim");
      },
    },

    trophy: {
      hidden: true,
      fn() {
        if (state.user === "sysop") {
          print("★ SYSOP — restored PROJECT_07 and brought MAINFRAME-7 back online.", "bright");
        } else {
          print("no trophies yet. they say something sleeps beneath this shell.", "dim");
        }
      },
    },
  };

  const ALIASES = { home: "banner", work: "projects", man: "help", "?": "help", email: "contact", play: "dungeon", adventure: "dungeon", quest: "dungeon" };

  // ── game bridge ─────────────────────────────────────────────────

  function enterGame() {
    state.mode = "game";
    promptLabel.textContent = "dungeon>";
    window.PhosphorGame.start({
      print: (text, cls) => print(text, cls),
      exit(won) {
        state.mode = "shell";
        if (won) {
          state.user = "sysop";
          localStorage.setItem("phosphor-user", "sysop");
        }
        promptLabel.textContent = promptString();
        print(`back at the shell. ${won ? "try 'whoami'." : "the dungeon will wait."}`, "dim");
      },
    });
  }

  // ── input handling ──────────────────────────────────────────────

  function run(raw) {
    const trimmed = raw.trim();
    echoCommand(trimmed);
    if (!trimmed) return;

    state.history.push(trimmed);
    state.hIndex = state.history.length;

    if (state.mode === "game") {
      window.PhosphorGame.handle(trimmed);
      scrollDown();
      return;
    }

    const [word, ...args] = trimmed.split(/\s+/);
    const name = ALIASES[word.toLowerCase()] || word.toLowerCase();
    const cmd = commands[name];
    if (cmd) {
      cmd.fn(args);
    } else {
      print(`command not found: ${word}`, "err");
      print("try 'help' — or look closer.", "dim");
    }
    print("");
  }

  function complete() {
    const raw = input.value;
    const parts = raw.split(/\s+/);
    if (state.mode === "game") return;
    if (parts.length === 1) {
      const visible = Object.keys(commands).filter((c) => !commands[c].hidden);
      const matches = visible.filter((c) => c.startsWith(parts[0].toLowerCase()));
      if (matches.length === 1) input.value = matches[0] + " ";
      else if (matches.length > 1) {
        echoCommand(raw);
        print(matches.join("   "), "dim");
      }
    } else if (["open", "cat"].includes(parts[0].toLowerCase())) {
      const pool = parts[0].toLowerCase() === "open"
        ? D.projects.map((p) => p.id)
        : Object.keys(FILES).filter((f) => !f.startsWith("."));
      const matches = pool.filter((x) => x.startsWith(parts[1]?.toLowerCase() || ""));
      if (matches.length === 1) input.value = parts[0] + " " + matches[0];
    }
  }

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const v = input.value;
      input.value = "";
      run(v);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!state.history.length) return;
      if (state.hIndex === state.history.length) state.draft = input.value;
      state.hIndex = Math.max(0, state.hIndex - 1);
      input.value = state.history[state.hIndex] ?? "";
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (state.hIndex >= state.history.length) return;
      state.hIndex = Math.min(state.history.length, state.hIndex + 1);
      input.value = state.hIndex === state.history.length ? state.draft : state.history[state.hIndex];
    } else if (e.key === "Tab") {
      e.preventDefault();
      complete();
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      commands.clear.fn();
    }
  });

  screen.addEventListener("click", () => {
    if (!String(window.getSelection())) input.focus({ preventScroll: true });
  });

  chips.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    if (state.mode === "game") {
      print("(you're in the dungeon — type 'quit' to return to the shell)", "dim");
      scrollDown();
      return;
    }
    run(btn.dataset.cmd);
    input.focus({ preventScroll: true });
  });

  // ── boot ────────────────────────────────────────────────────────

  async function boot() {
    const savedTheme = localStorage.getItem("phosphor-theme");
    if (savedTheme) document.documentElement.dataset.theme = savedTheme;

    const skip = () => { state.skipBoot = true; };
    window.addEventListener("keydown", skip, { once: true });
    window.addEventListener("pointerdown", skip, { once: true });

    await printLines(
      [
        { text: "JACINTO BIOS v5.0 — (c) 2026 Jacinto Design", cls: "dim" },
        { text: "memory check: 65536 KB ............ OK", cls: "dim" },
        { text: "detecting phosphor: GREEN ......... OK", cls: "dim" },
        { text: "mounting /dev/portfolio ........... OK", cls: "dim" },
        { text: "loading modules: about projects skills contact ... OK", cls: "dim" },
        { text: "WARN: 1 hidden sector found (unindexed)", cls: "dim" },
        { text: "boot complete.", cls: "dim" },
        { text: "" },
      ],
      REDUCED ? 0 : 110
    );

    banner();
    print("welcome. type 'help' to get started.", "bright");
    if (state.user === "sysop") print("welcome back, sysop ★", "dim");
    print("");

    inputLine.hidden = false;
    chips.hidden = false;
    promptLabel.textContent = promptString();
    state.booted = true;
    if (!("ontouchstart" in window)) input.focus({ preventScroll: true });
    scrollDown();
  }

  boot();
})();
