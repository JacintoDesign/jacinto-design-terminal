# Spoilers — The Lost Mainframe

Stop reading if you want to find it yourself.

## Getting in

The boot sequence warns about "1 hidden sector". Any of these work:

- `ls -a` → reveals `.dungeon` → `cat .dungeon` → tells you the word
- `xyzzy` (the classic magic word) → points you at the door
- `dungeon` (or `play` / `quest` / `adventure`) → starts the game

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

Winning grants the **SYSOP** achievement: your prompt becomes `sysop@jacinto:~$` (persisted in localStorage), and `whoami` / `trophy` change.

## Other easter eggs

`sudo`, `rm -rf /`, `coffee`, `exit`, `xyzzy` after entering the game.
