# Fishing Game – iPad version

A web version of `Fishing2.psyexp` that runs full-screen from an icon on the iPad Home Screen and works offline. It uses the same images and scoring, with its own trial list (`trial_set.csv`, 117 casts) (the iPad version now shows a bar graph of points per round instead of the leaderboard).

## 1. Put the folder online (once)

The iPad has to download the game once from an **https** web address. Any static web hosting works. Two free options:

**GitHub Pages**
1. Create a GitHub account and a new repository (e.g. `fishing-game`).
2. Upload everything in this folder (keep the `images` and `icons` folders).
3. In the repository: **Settings → Pages → Branch: main → Save**.
4. After a minute the game is at `https://<your-username>.github.io/fishing-game/`.

**Netlify Drop**: drag this whole folder onto <https://app.netlify.com/drop> and you get an https address.

Only the game files are online. Participants' data never leaves the iPad unless you export it.

## 2. Install on each iPad (once)

1. Open the address in **Safari** (it must be Safari).
2. Tap **Share → Add to Home Screen → Add**.
3. Open the game from the new icon once while still online, so it saves an offline copy.

From then on, tap the icon to play. No internet is needed.

## 3. Running a session

1. Tap the icon. Enter the **Participant ID**, then tap **Start game**. Hand over the iPad in landscape.
2. The participant plays: How to play (4 pages) → 9 practice casts → pick a player → 9 rounds of 12 casts, each followed by the round catch and a bar graph of points per round → thank-you screen.
3. At the end, the participant sees a "Thank you for playing!" screen. The data is already saved in the game.
4. Tap **Quit** (or tap the top-left corner 5 times). The start screen opens for the next participant. Nothing else to do: the data is already saved in the game.
5. **Saving to Files:** whenever convenient (e.g. end of the day), on the start screen tap **Save data (n)** → **Save to Files** → **Save**. Every participant not yet saved is saved as their own CSV in one go and marked as saved. When everything is saved the button shows **All data saved to Files ✓**.

Games ended before the first cast are not saved.

**Pausing or stopping early (researcher):** during a game, tap the **top-left corner 5 times quickly**. Choose Resume, or End game (the data so far stays saved).

## 4. Data

- Each game is saved inside the game on the iPad **after every cast**, so nothing is lost if the app is closed.
- **Save data** (start screen) saves all not-yet-saved games to the Files app (one CSV per participant, named `participant_FishingGame_date.csv`). Saved games stay in the game as a backup.
- Data inside the game is deleted if the Home Screen icon is removed — save data before removing or reinstalling the game.

The columns match the PsychoPy data: `trialNum, roundNum, practice, trialID, priorCond, likeCond, inRing, splash1X…splash5Y, splashMeanX/Y, realX, realY, respX, respY, rt, respDist, respDistPx, fishLevel, totalPoints, fishImage, playerPicked, lbRank, lbYouScore, lbBest, lbAverage, lbWorst`. A final row holds `finalRank, finalTotalYou, finalTotalBest, finalTotalAvg, finalTotalWorst`. `screenW, screenH, unitPx` record the screen size (unitPx = pixels per height unit).

## 5. Changing the game

- **Settings** (SDs, reward distances, rounds) are at the top of `game.js`.
- **Trials**: `trials.js` holds the 117 trials (copied from `trial_set.csv`).
- After changing any file, upload it again **and** change `VERSION` at the top of `sw.js` (e.g. `fishing-v2`). Otherwise iPads keep the old offline copy. Then open the app once while online.

## Differences from the PsychoPy version

- On-screen words say **Tap** instead of Click (including the How to play pages).
- **Trials (v35):** 9 practice casts (one at each net spot) + 108 main casts in 9 rounds of 12. The net is at one of 9 spots (`netSpot`: top/middle/bottom × left/middle/right; centres x −0.144/0/0.144, y 0.155/0.004/−0.147). Main casts: exactly 3 per spot per condition (9 × 4 × 3). Fish outside the net: 4 per condition, 1–2 per spot, never 2 of the same condition at one spot. Each person gets a new random order, dealt so every round has 3 casts of each condition and the fish-outside casts are spread out (each condition's in different rounds, at most 2 per round). The whole net, all splashes and the fish stay in the water and clear of the basket. Trials 111–118 are new casts (2 per condition), trial 91 was replaced and practice trial 1 dropped. In the data, `netSpot`/`netX`/`netY` are saved, and `realX`/`realY`, splash positions and `respX`/`respY` are screen positions (net position included).
- **Fish detector (v44):** the net is replaced by a fish detector. The detector (designer's drawing) sits at the top of the pond. Each cast starts with 'Tap to scan': the detector makes a radar sound (big circle = 2 slow low blips, small circle = 4 quick high blips), the pink reading grows in at the net spot (0.6 s), then the splashes appear and they tap their guess. The reading's outer ring is where the net's edge was (2 SD), so trials and scoring are unchanged. On the catch screen a small net shows where they tapped. Data: `scanRT` = time to tap to scan; `rt` now counts from when the splashes appear. Columns keep the names `netX`/`netY`/`netSpot` (= the detector reading's centre).
- **Points:** Small 1, Good 2, Great 3, Amazing 5 (`FISH_POINTS` in game.js); a round of 12 casts scores 12–60.
- After each main round (1–9) a bar graph shows the points in every round so far, split by fish type. A crown marks the best round so far on every graph. The player they picked stands on top of the latest round's bar (wearing the crown if it is their best round). No point numbers on the bars, no y axis or grid lines. Fish colours from the design palette: Small yellow #ffd700, Good orange #ff7700, Great pink #ef3d64, Amazing purple #ad4dff. From round 9 on, two buttons offer **Keep playing** (an extra round) or **Finish**. Up to 9 extra rounds of 12 casts, one at a time (their own 108 casts, trials 201–308, same balance as the main casts; dealt the same way). After extra round 9 only 'Tap to finish'. There is no leaderboard or final ranking. Data: `extraRound` (True/False), `roundScore` on the last cast of each round, `bestRound` after every round (ties joined with ;), `choice` (extra/finish) on the last cast of round 9 and of each extra round.
- Sound effects (calm, gentle sounds, files in `sounds/`): soft bubbles when the splashes appear, a catch chime (more notes for a bigger fish), the fish landing in the basket, each round graph, and the last round graph. Sound switches on with the Start game tap; turn the iPad volume up. To play silently, set `SOUND_ON = false` at the top of the sounds section in game.js.
- A tap counts at the moment the finger touches the screen. On every screen only a new tap counts, so a held press can't skip a trial.
- The researcher start screen and the data export replace PsychoPy's dialog box and data folder.
