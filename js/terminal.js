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
  const crt = document.getElementById("crt");
  const ghost = document.getElementById("ghost");
  const measure = document.getElementById("measure");

  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ROOT_PW = "hunter2";

  const state = {
    mode: "shell", // "shell" | "game" | "form" | "su"
    history: [],
    hIndex: -1,
    draft: "",
    ghost: "",
    user: localStorage.getItem("phosphor-user") || "guest",
    root: localStorage.getItem("phosphor-root") === "1",
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
    return state.root ? "root@jacinto:~#" : `${state.user}@jacinto:~$`;
  }

  function refreshPrompt() {
    promptLabel.textContent = promptString();
    promptLabel.classList.toggle("root", state.root);
  }

  function echoCommand(raw) {
    const div = document.createElement("div");
    div.className = "line";
    const p = document.createElement("span");
    p.className = "prompt" + (state.root && state.mode === "shell" ? " root" : "");
    p.textContent = promptLabel.textContent;
    const c = document.createElement("span");
    c.className = "cmd-echo";
    c.textContent = " " + raw;
    div.append(p, c);
    output.appendChild(div);
    scrollDown();
  }

  function fmtTime(ms) {
    const s = Math.round(ms / 1000);
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  }

  function achievements() {
    try { return JSON.parse(localStorage.getItem("phosphor-achievements") || "[]"); }
    catch (e) { return []; }
  }

  // ── sound engine (off by default) ───────────────────────────────

  const Sound = {
    enabled: localStorage.getItem("phosphor-sound") === "on",
    ctx: null,
    hum: null,
    ensure() {
      if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === "suspended") this.ctx.resume();
    },
    click(freq) {
      if (!this.enabled) return;
      try {
        this.ensure();
        this.startHum();
        const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.008), this.ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        const bp = this.ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.value = freq || 2200 + Math.random() * 500;
        bp.Q.value = 1.4;
        const g = this.ctx.createGain();
        g.gain.value = 0.14;
        src.connect(bp);
        bp.connect(g);
        g.connect(this.ctx.destination);
        src.start();
      } catch (e) { /* audio unavailable */ }
    },
    startHum() {
      if (!this.enabled || this.hum) return;
      try {
        this.ensure();
        const g = this.ctx.createGain();
        g.gain.value = 0.008;
        const o1 = this.ctx.createOscillator();
        o1.type = "sine";
        o1.frequency.value = 60;
        const o2 = this.ctx.createOscillator();
        o2.type = "sine";
        o2.frequency.value = 120;
        const g2 = this.ctx.createGain();
        g2.gain.value = 0.35;
        o1.connect(g);
        o2.connect(g2);
        g2.connect(g);
        g.connect(this.ctx.destination);
        o1.start();
        o2.start();
        this.hum = { o1, o2, g };
      } catch (e) { /* audio unavailable */ }
    },
    stopHum() {
      if (!this.hum) return;
      try { this.hum.o1.stop(); this.hum.o2.stop(); } catch (e) { /* already stopped */ }
      this.hum = null;
    },
    set(on) {
      this.enabled = on;
      localStorage.setItem("phosphor-sound", on ? "on" : "off");
      if (on) { this.ensure(); this.startHum(); } else this.stopHum();
    },
  };

  // ── fx toggle ───────────────────────────────────────────────────

  function applyFx() {
    document.documentElement.classList.toggle("no-fx", localStorage.getItem("phosphor-fx") === "off");
  }

  // ── banner ──────────────────────────────────────────────────────

  // pure ASCII — Unicode block chars render from mismatched fallback
  // fonts on some Android browsers (Samsung Internet) and garble
  const BANNER = [
    "     ##\\ #####\\  ######\\##\\###\\   ##\\########\\ ######\\ ",
    "     ##|##/==##\\##/====/##|####\\  ##|\\==##/==/##/===##\\",
    "     ##|#######|##|     ##|##/##\\ ##|   ##|   ##|   ##|",
    "##   ##|##/==##|##|     ##|##|\\##\\##|   ##|   ##|   ##|",
    "\\#####//##|  ##|\\######\\##|##| \\####|   ##|   \\######//",
    " \\====/ \\=/  \\=/ \\=====/\\=/\\=/  \\===/   \\=/    \\=====/ ",
    "######\\ #######\\#######\\##\\ ######\\ ###\\   ##\\",
    "##/==##\\##/====/##/====/##|##/====/ ####\\  ##|",
    "##|  ##|#####\\  #######\\##|##|  ###\\##/##\\ ##|",
    "##|  ##|##/==/  \\====##|##|##|   ##|##|\\##\\##|",
    "######//#######\\#######|##|\\######//##| \\####|",
    "\\=====/ \\======/\\======/\\=/ \\=====/ \\=/  \\===/",
  ].join("\n");

  function fitAscii(div) {
    requestAnimationFrame(() => {
      div.style.fontSize = "";
      const avail = div.clientWidth - 10; // scrollbar allowance
      if (div.scrollWidth > avail) {
        const cur = parseFloat(getComputedStyle(div).fontSize);
        div.style.fontSize = Math.max(4, cur * (avail / div.scrollWidth)) + "px";
      }
    });
  }

  window.addEventListener("resize", () => {
    document.querySelectorAll(".ascii").forEach(fitAscii);
  });

  function banner() {
    fitAscii(print(BANNER, "ascii"));
    print("");
    const [role1, role2] = D.site.title.split(" · ");
    printHTML(`${esc(role1)}<span class="sep"> · </span><span class="role2">${esc(role2)}</span>`, "bright");
    print(`${D.site.location}`, "dim");
    print("");
  }

  // ── case studies ────────────────────────────────────────────────

  function caseStudyView(p) {
    if (!p.caseStudy) {
      print(`${p.title} — case study not written yet. it's the one being built.`, "dim");
      return;
    }
    const cs = p.caseStudy;
    print(`${p.title.toUpperCase()}(7)`, "bright");
    print("");
    print("NAME", "bright");
    print(`    ${p.title} — ${cs.tagline}`);
    print("");
    print("SYNOPSIS", "bright");
    print(`    ${p.tech.join(" · ")}   [${p.year}]`);
    print("");
    print("DESCRIPTION", "bright");
    cs.intro.forEach((par) => { print(`    ${par}`); print(""); });
    print("ROLE", "bright");
    print(`    ${cs.role}`);
    print("");
    print("HIGHLIGHTS", "bright");
    cs.highlights.forEach(([t, b]) => {
      print(`    > ${t}`, "bright");
      print(`      ${b}`);
      print("");
    });
    print("SEE ALSO", "bright");
    if (p.href) printHTML(`    live: ${link(p.href)}`);
    if (p.repo) printHTML(`    repo: ${link(p.repo)}`);
  }

  // ── ascii image preview ─────────────────────────────────────────

  async function asciiPreview(p) {
    print(`rendering ${p.title} …`, "dim");
    try {
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error("image failed to load"));
        img.src = p.image;
        if (img.complete && img.naturalWidth) resolve();
      });
      const cols = 64;
      const rows = Math.max(8, Math.round((img.naturalHeight / img.naturalWidth) * cols * 0.5));
      const c = document.createElement("canvas");
      c.width = cols;
      c.height = rows;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0, cols, rows);
      const data = ctx.getImageData(0, 0, cols, rows).data;
      const RAMP = " .,:;+*oO#@";
      const lums = [];
      let lo = 1, hi = 0;
      for (let i = 0; i < cols * rows; i++) {
        const j = i * 4;
        const lum = (0.2126 * data[j] + 0.7152 * data[j + 1] + 0.0722 * data[j + 2]) / 255;
        lums.push(lum);
        if (lum < lo) lo = lum;
        if (lum > hi) hi = lum;
      }
      const span = hi - lo || 1;
      const out = [];
      for (let y = 0; y < rows; y++) {
        let line = "";
        for (let x = 0; x < cols; x++) {
          const n = Math.pow((lums[y * cols + x] - lo) / span, 0.8);
          line += RAMP[Math.min(RAMP.length - 1, Math.floor(n * RAMP.length))];
        }
        out.push(line);
      }
      fitAscii(print(out.join("\n"), "ascii"));
      print(`${p.title} — 'open ${p.id}' for the real thing`, "dim");
      print("");
    } catch (e) {
      print("render failed — the electron gun jammed.", "err");
      print("");
    }
  }

  // ── contact form ────────────────────────────────────────────────

  const form = { step: 0, data: { name: "", email: "", message: "" } };

  function startForm() {
    state.mode = "form";
    form.step = 0;
    form.data = { name: "", email: "", message: "" };
    print("-- SEND A MESSAGE --", "bright");
    print("three prompts, then it lands in my inbox. type 'cancel' (or Esc) to abort.", "dim");
    print("");
    promptLabel.textContent = "name:";
    promptLabel.classList.remove("root");
  }

  function cancelForm(msg) {
    state.mode = "shell";
    refreshPrompt();
    print(msg || "transmission aborted.", "dim");
    print("");
  }

  function handleForm(v) {
    if (v.toLowerCase() === "cancel") return cancelForm();
    if (form.step === 0) {
      if (!v) return print("a name helps. try again — or 'cancel'.", "err");
      form.data.name = v;
      form.step = 1;
      promptLabel.textContent = "email:";
    } else if (form.step === 1) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return print("that doesn't parse as an email. try again — or 'cancel'.", "err");
      form.data.email = v;
      form.step = 2;
      promptLabel.textContent = "message:";
    } else {
      if (!v) return print("an empty message says so little. type something — or 'cancel'.", "err");
      form.data.message = v;
      sendForm();
    }
  }

  async function sendForm() {
    state.mode = "shell";
    refreshPrompt();
    print("");
    print("transmitting …", "dim");
    try {
      const res = await fetch("https://formsubmit.co/ajax/" + D.site.email, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          name: form.data.name,
          email: form.data.email,
          message: form.data.message,
          _subject: "phosphor terminal contact",
        }),
      });
      if (res.ok) {
        print(`message sent — thanks, ${form.data.name}. I'll reply to ${form.data.email}.`, "bright");
      } else {
        throw new Error("bad status");
      }
    } catch (e) {
      print("transmission failed — the network gremlins win this round.", "err");
      printHTML(`fallback: ${link("mailto:" + D.site.email, D.site.email)}`);
    }
    print("");
  }

  // ── su / root ───────────────────────────────────────────────────

  function startSu() {
    state.mode = "su";
    input.type = "password";
    promptLabel.textContent = "password:";
    promptLabel.classList.remove("root");
  }

  function handleSu(v) {
    input.type = "text";
    state.mode = "shell";
    if (v.toLowerCase() === ROOT_PW) {
      state.root = true;
      localStorage.setItem("phosphor-root", "1");
      refreshPrompt();
      print("root access granted. the shell hums differently now.", "bright");
      print("try: ls · cat .sysop/origin.txt · 'logout' drops privileges", "dim");
    } else {
      refreshPrompt();
      print("su: authentication failure", "err");
      if (state.user !== "sysop") print("(the password is written down somewhere in sector 7…)", "dim");
    }
    print("");
  }

  // ── commands ────────────────────────────────────────────────────

  const FILES = {
    "about.txt": () => commands.about.fn([]),
    "skills.txt": () => commands.skills.fn([]),
    "contact.txt": () => commands.contact.fn([]),
    "socials.txt": () => commands.socials.fn([]),
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
        print("  <id>           type a project id for its case study (e.g. vibemail)");
        print("  open <id>      open a project in a new tab (e.g. open vibemail)");
        print("  preview <id>   render a project screenshot in glorious ASCII");
        print("  skills         the toolbox");
        print("  now            what i'm building right now");
        print("  contact        get in touch (contact --send composes right here)");
        print("  socials        elsewhere on the internet");
        print("");
        print("TERMINAL", "bright");
        print("  banner         reprint the banner");
        print("  neofetch       system information, more or less");
        print("  theme <t>      green | amber | ice");
        print("  fx on|off      scanlines, flicker & glow");
        print("  sound on|off   key clicks & mains hum");
        print("  ls / cat       poke around the filesystem");
        print("  clear          wipe the screen");
        print("  history        command history");
        print("");
        print("tab or → accepts the ghost suggestion · ↑/↓ recall history", "dim");
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
        print("PROJECTS — type an <id> for the case study · 'open <id>' for links", "dim");
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
        if (p.caseStudy) print(`case study: type '${p.id}' (or 'cat projects/${p.id}.md')`, "dim");
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

    preview: {
      desc: "ascii project preview",
      fn(args) {
        const id = (args[0] || "").toLowerCase();
        if (!id) return print("usage: preview <id> — try 'projects' for the list", "err");
        const p = D.projects.find((x) => x.id === id || x.id.startsWith(id));
        if (!p) return print(`no project matching '${id}' — try 'projects'`, "err");
        if (!p.image) return print("no visual on file yet — it's still being built. try the dungeon.", "dim");
        asciiPreview(p);
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
      fn(args) {
        if (args[0] === "--send" || args[0] === "send") return startForm();
        printHTML(`email:    ${link("mailto:" + D.site.email, D.site.email)}`);
        printHTML(`website:  ${link(D.site.url, "jacinto.design")}`);
        print("");
        print("or compose without leaving the terminal:  contact --send", "bright");
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

    neofetch: {
      desc: "system info",
      fn() {
        const logo = [
          " +-----------+ ",
          " | >_        | ",
          " |           | ",
          " | PHOSPHOR  | ",
          " | rev 2.0   | ",
          " +-----------+ ",
        ];
        const info = [
          ["", `${state.root ? "root" : state.user}@jacinto`],
          ["", "----------------"],
          ["OS", "JacintoOS 5.0 LTS (Toronto)"],
          ["Host", "jacinto.design"],
          ["Kernel", "self-taught 4mo → senior"],
          ["Shell", "phosphor 2.0"],
          ["Uptime", "in tech since age 12"],
          ["Packages", "100+ projects shipped"],
          ["Theme", `${document.documentElement.dataset.theme} phosphor [CRT]`],
          ["CPU", "Senior Developer @ CBC"],
          ["GPU", "Instructor @ Zero to Mastery"],
          ["Memory", "5yr teaching · ∞ curiosity"],
        ];
        const rows = Math.max(logo.length, info.length);
        for (let i = 0; i < rows; i++) {
          const l = logo[i] || " ".repeat(15);
          const kv = info[i];
          let right = "";
          if (kv) {
            right = kv[0]
              ? `<span class="k">${esc(kv[0].padEnd(10))}</span>${esc(kv[1])}`
              : `<span class="k">${esc(kv[1])}</span>`;
          }
          printHTML(`<span class="k">${esc(l)}</span> ${right}`);
        }
      },
    },

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

    fx: {
      desc: "toggle CRT effects",
      fn(args) {
        const v = (args[0] || "").toLowerCase();
        if (!["on", "off"].includes(v)) return print("usage: fx on | off", "err");
        localStorage.setItem("phosphor-fx", v);
        applyFx();
        print(v === "off" ? "effects off — plain phosphor, easy on the eyes." : "effects on — scanlines, glow, the works.");
      },
    },

    sound: {
      desc: "toggle sound",
      fn(args) {
        const v = (args[0] || "").toLowerCase();
        if (!["on", "off"].includes(v)) return print("usage: sound on | off", "err");
        Sound.set(v === "on");
        print(v === "on" ? "sound on — key clicks and a faint 60Hz hum. very 1978." : "sound off.");
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
        const flags = args.filter((a) => a.startsWith("-")).join("");
        const target = (args.find((a) => !a.startsWith("-")) || "").replace(/\/$/, "");
        const all = flags.includes("a");
        if (target === "projects") {
          return print(D.projects.filter((p) => p.caseStudy).map((p) => p.id + ".md").join("   "));
        }
        if (target === ".sysop") {
          if (!state.root) return print("ls: .sysop: permission denied", "err");
          return print(Object.keys(D.sysop).join("   "));
        }
        if (target) return print(`ls: ${target}: no such directory`, "err");
        const files = ["about.txt", "contact.txt", "projects/", "readme.md", "skills.txt", "socials.txt"];
        if (state.root) files.unshift(".sysop/");
        if (all) files.unshift(".dungeon");
        print(files.join("   "));
        if (all && !state.root) print("(that first one wasn't there yesterday)", "dim");
      },
    },

    cat: {
      desc: "read a file",
      fn(args) {
        const f = (args[0] || "").toLowerCase();
        if (!f) return print("usage: cat <file>", "err");
        const proj = f.match(/^projects\/([a-z0-9-]+?)(\.md)?$/);
        if (proj) {
          const p = D.projects.find((x) => x.id === proj[1]);
          if (!p) return print(`cat: ${f}: no such file`, "err");
          return caseStudyView(p);
        }
        if (f.startsWith(".sysop")) {
          if (!state.root) return print(`cat: ${f}: permission denied (are you root?)`, "err");
          const name = f.replace(/^\.sysop\/?/, "");
          if (!name) return print("cat: .sysop: is a directory — try 'ls .sysop'", "err");
          const body = D.sysop[name] || D.sysop[name + ".txt"];
          if (!body) return print(`cat: ${f}: no such file`, "err");
          return body.forEach((l) => print(l));
        }
        const reader = FILES[f];
        if (reader) return reader();
        if (f === "projects" || f === "projects/") return print("cat: projects/ is a directory — try 'ls projects'", "err");
        print(`cat: ${f}: no such file`, "err");
      },
    },

    whoami: {
      desc: "who are you?",
      fn() {
        if (state.root) {
          print("root — with great power comes great uptime.", "bright");
        } else if (state.user === "sysop") {
          print("sysop ★ — the one who rebooted MAINFRAME-7.", "bright");
        } else {
          print("guest — read access to everything that matters.");
        }
      },
    },

    date: { desc: "current date", fn: () => print(new Date().toString()) },

    echo: { desc: "echo", fn: (args) => print(args.join(" ")) },

    logout: {
      desc: "drop privileges",
      fn() {
        if (!state.root) return print("logout: you're a guest. this is a portfolio, not a mainframe. …mostly.", "dim");
        state.root = false;
        localStorage.removeItem("phosphor-root");
        refreshPrompt();
        print("privileges dropped. the shell feels lighter.", "dim");
      },
    },

    exit: {
      desc: "power down",
      fn() {
        if (REDUCED) {
          print("powering down… and right back up. there is no exit — only the terminal.", "dim");
          return;
        }
        print("powering down…", "dim");
        Sound.stopHum();
        inputLine.hidden = true;
        chips.hidden = true;
        setTimeout(() => {
          crt.classList.add("crt-off");
          setTimeout(() => {
            output.innerHTML = "";
            crt.classList.remove("crt-off");
            state.skipBoot = false;
            boot();
          }, 950);
        }, 350);
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
      fn(args) {
        enterGame({ fresh: (args[0] || "").toLowerCase() === "new" });
      },
    },

    su: {
      hidden: true,
      fn(args) {
        if (state.root) return print("already root. power responsibly.", "dim");
        const who = (args[0] || "root").toLowerCase();
        if (who !== "root") return print(`su: user '${who}' does not exist`, "err");
        startSu();
      },
    },

    sudo: {
      hidden: true,
      fn() {
        if (state.root) {
          print("you ARE root. just do the thing.", "bright");
        } else if (state.user === "sysop") {
          print("sysop privileges are honorary. for the real thing: su root", "dim");
          print("(you already know the password. you typed it once.)", "dim");
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
          if (state.root) {
            print("permission granted. deleting everything in 3… 2… 1…", "bright");
            print("…just kidding. even root can't delete a portfolio this stubborn.", "dim");
          } else {
            print("nice try.", "bright");
            print("this portfolio has survived worse code reviews.", "dim");
          }
        } else {
          print("rm: permission denied (everything here is load-bearing)", "err");
        }
      },
    },

    degauss: {
      hidden: true,
      fn() {
        print("degaussing…  *BWOOoonngg*", "dim");
        if (!REDUCED) {
          crt.classList.remove("degauss");
          void crt.offsetWidth;
          crt.classList.add("degauss");
          setTimeout(() => crt.classList.remove("degauss"), 750);
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
        const ach = achievements();
        if (!ach.length) {
          return print("no trophies yet. they say something sleeps beneath this shell.", "dim");
        }
        print("ACHIEVEMENTS", "bright");
        if (ach.includes("SYSOP")) print("  ★ SYSOP — restored PROJECT_07 and rebooted MAINFRAME-7");
        if (ach.includes("COMPLETIONIST")) print("  ★ COMPLETIONIST — recovered every item in sector 7");
        let best = null;
        try { best = Number(localStorage.getItem("phosphor-best-ms")) || null; } catch (e) { /* ignore */ }
        if (best) print(`  best dungeon time: ${fmtTime(best)}`, "dim");
        if (!ach.includes("COMPLETIONIST")) print("  (something's still missing…)", "dim");
      },
    },
  };

  const ALIASES = { home: "banner", work: "projects", man: "help", "?": "help", email: "contact", play: "dungeon", adventure: "dungeon", quest: "dungeon", view: "preview", achievements: "trophy" };

  // ── game bridge ─────────────────────────────────────────────────

  function enterGame(opts) {
    state.mode = "game";
    promptLabel.textContent = "dungeon>";
    promptLabel.classList.remove("root");
    window.PhosphorGame.start({
      print: (text, cls) => print(text, cls),
      exit(won) {
        state.mode = "shell";
        if (won) {
          state.user = "sysop";
          localStorage.setItem("phosphor-user", "sysop");
        }
        refreshPrompt();
        print(`back at the shell. ${won ? "try 'whoami' — or 'su root'." : "the dungeon will wait."}`, "dim");
      },
    }, opts);
  }

  // ── ghost autocomplete ──────────────────────────────────────────

  function argPools(verb) {
    const ids = D.projects.map((p) => p.id);
    return {
      open: ids,
      preview: ids,
      view: ids,
      cat: [
        ...Object.keys(FILES).filter((f) => !f.startsWith(".")),
        ...D.projects.filter((p) => p.caseStudy).map((p) => `projects/${p.id}.md`),
      ],
      theme: ["green", "amber", "ice"],
      fx: ["on", "off"],
      sound: ["on", "off"],
    }[verb];
  }

  function findSuggestion(v) {
    const lower = v.toLowerCase();
    for (let i = state.history.length - 1; i >= 0; i--) {
      const h = state.history[i];
      if (h.length > v.length && h.toLowerCase().startsWith(lower)) return h;
    }
    const parts = v.split(/\s+/);
    if (parts.length === 1) {
      const pool = Object.keys(commands).filter((k) => !commands[k].hidden)
        .concat(D.projects.map((p) => p.id)).sort();
      const c = pool.find((k) => k.startsWith(lower) && k.length > v.length);
      return c || null;
    }
    const pool = argPools(parts[0].toLowerCase());
    if (pool && parts.length === 2) {
      const m = [...pool].sort().find((x) => x.startsWith(parts[1].toLowerCase()) && x.length > parts[1].length);
      if (m) return parts[0] + " " + m;
    }
    return null;
  }

  function clearGhost() {
    state.ghost = "";
    ghost.textContent = "";
  }

  function updateGhost() {
    clearGhost();
    if (state.mode !== "shell") return;
    const v = input.value;
    if (!v || /^\s/.test(v)) return;
    const sugg = findSuggestion(v);
    if (!sugg) return;
    state.ghost = sugg;
    measure.textContent = v;
    ghost.style.transform = `translateX(${measure.offsetWidth}px)`;
    ghost.textContent = sugg.slice(v.length);
  }

  function acceptGhost() {
    if (!state.ghost) return false;
    input.value = state.ghost;
    clearGhost();
    return true;
  }

  // ── input handling ──────────────────────────────────────────────

  function run(raw) {
    const trimmed = raw.trim();
    clearGhost();

    if (state.mode === "su") {
      const div = document.createElement("div");
      div.className = "line";
      div.innerHTML = `<span class="prompt">password:</span><span class="cmd-echo"> ********</span>`;
      output.appendChild(div);
      return handleSu(trimmed);
    }

    echoCommand(trimmed);
    if (!trimmed) return;

    if (state.mode === "form") return handleForm(trimmed);

    state.history.push(trimmed);
    state.hIndex = state.history.length;

    if (state.mode === "game") {
      window.PhosphorGame.handle(trimmed);
      scrollDown();
      return;
    }

    const [word, ...args] = trimmed.split(/\s+/);
    const bare = word.toLowerCase().replace(/^\//, "");
    const name = ALIASES[bare] || bare;
    const cmd = commands[name];
    if (cmd) {
      cmd.fn(args);
    } else {
      const proj = D.projects.find((p) => p.id === bare);
      if (proj) {
        caseStudyView(proj);
      } else {
        print(`command not found: ${word}`, "err");
        print("try 'help' — or look closer.", "dim");
      }
    }
    print("");
  }

  function complete() {
    if (acceptGhost()) return;
    const raw = input.value;
    const parts = raw.split(/\s+/);
    if (state.mode !== "shell") return;
    if (parts.length === 1) {
      const visible = Object.keys(commands).filter((c) => !commands[c].hidden)
        .concat(D.projects.map((p) => p.id));
      const matches = visible.filter((c) => c.startsWith(parts[0].toLowerCase()));
      if (matches.length === 1) input.value = matches[0] + " ";
      else if (matches.length > 1) {
        echoCommand(raw);
        print(matches.join("   "), "dim");
      }
    }
  }

  input.addEventListener("input", updateGhost);

  input.addEventListener("keydown", (e) => {
    if (e.key.length === 1 || e.key === "Backspace") Sound.click();
    if (e.key === "Enter") {
      Sound.click(1200);
      const v = input.value;
      input.value = "";
      run(v);
    } else if (e.key === "Escape") {
      if (state.mode === "form") { input.value = ""; cancelForm(); }
      else if (state.mode === "su") { input.value = ""; input.type = "text"; state.mode = "shell"; refreshPrompt(); print("su: cancelled", "dim"); print(""); }
      clearGhost();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (state.mode === "form" || state.mode === "su") return;
      if (!state.history.length) return;
      if (state.hIndex === state.history.length) state.draft = input.value;
      state.hIndex = Math.max(0, state.hIndex - 1);
      input.value = state.history[state.hIndex] ?? "";
      clearGhost();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (state.mode === "form" || state.mode === "su") return;
      if (state.hIndex >= state.history.length) return;
      state.hIndex = Math.min(state.history.length, state.hIndex + 1);
      input.value = state.hIndex === state.history.length ? state.draft : state.history[state.hIndex];
      clearGhost();
    } else if (e.key === "ArrowRight") {
      if (state.ghost && input.selectionStart === input.value.length) {
        e.preventDefault();
        acceptGhost();
      }
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
    if (state.mode !== "shell") {
      print(state.mode === "game"
        ? "(you're in the dungeon — type 'quit' to return to the shell)"
        : "(finish the current prompt first — or type 'cancel')", "dim");
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
    applyFx();

    // legacy winners: seed the achievements list
    if (state.user === "sysop" && !achievements().length) {
      localStorage.setItem("phosphor-achievements", JSON.stringify(["SYSOP"]));
    }

    if (!REDUCED) {
      crt.classList.add("crt-on");
      setTimeout(() => crt.classList.remove("crt-on"), 700);
    }

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
    if (state.root) print("welcome back, root #", "dim");
    else if (state.user === "sysop") print("welcome back, sysop ★", "dim");
    print("");

    inputLine.hidden = false;
    chips.hidden = false;
    refreshPrompt();
    state.booted = true;
    if (!("ontouchstart" in window)) input.focus({ preventScroll: true });
    scrollDown();
  }

  boot();

  // ── service worker (production only) ────────────────────────────

  if ("serviceWorker" in navigator && location.protocol === "https:" &&
      !["localhost", "127.0.0.1"].includes(location.hostname)) {
    navigator.serviceWorker.register("sw.js").catch(() => { /* offline can wait */ });
  }
})();
