# Spoilers — The Lost Mainframe

Stop reading if you want to find it yourself.

## Getting in

The boot sequence warns about "1 hidden sector". Any of these work:

- `ls -a` → reveals `.dungeon` → `cat .dungeon` → tells you the word
- `xyzzy` (the classic magic word) → points you at the door
- `dungeon` (or `play` / `quest` / `adventure`) → starts the game

Progress auto-saves: `quit` and later `dungeon` resumes; `dungeon new` restarts. A clock runs from your first command — your best time is kept.

## Walkthrough

```
e               # break room
take keycard
w  n            # server hall
e               # tape library (keycard unlocks)
take tape
take fuse
w  w            # sysadmin office
take flashlight
take note       # root pw: hunter2
s               # maintenance tunnel (needs flashlight)
s               # power substation
use fuse        # power restored
n  n  e  n      # mainframe core
use tape
hunter2         # password from the note
```

## Achievements

- **SYSOP** — win the game. Your prompt becomes `sysop@jacinto:~$` (persisted), and `whoami` / `trophy` change.
- **COMPLETIONIST** — win while carrying all five items (keycard, tape, fuse, flashlight, note).
- `trophy` (or `achievements`) lists them plus your best dungeon time.

## Root access

The sticky note is good for more than the mainframe: `su root` + `hunter2` at the shell grants a red `root@jacinto:~#` prompt and unlocks the `.sysop/` directory — `ls .sysop`, then `cat .sysop/origin.txt`, `.sysop/colophon.txt`, `.sysop/todo.txt`. `logout` drops privileges.

## Other easter eggs

`sudo` (changes with rank), `rm -rf /`, `coffee`, `degauss`, `exit` (really powers the CRT down… briefly), `xyzzy` inside the game.
