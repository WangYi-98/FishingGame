# Fishing Game – iPad version

A web version of `Fishing2.psyexp` that runs full-screen from an icon on the iPad Home Screen and works offline. It uses the same images, the same 110 trials (`trial_set.csv`), the same scoring, leaderboards and final ranking.

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

1. Tap the icon. Enter the **Participant ID** (and session), then tap **Start game**. Hand over the iPad in landscape.
2. The participant plays: How to play (4 pages) → 10 practice casts → pick a player → 10 rounds of 10 casts, each followed by the round catch and leaderboard → final ranking.
3. At the end, the participant sees a "Thank you for playing!" screen. The data is already saved in the game.
4. Tap **Quit**. The participant's CSV downloads to **Files → Downloads** (set Settings → Safari → Downloads → On My iPad; the iPad may ask "Download?" first). The start screen then opens for the next participant. If the download doesn't happen, export it from **Saved data** instead — the data is always kept in the game.

Games ended before the first cast are not saved.

**Pausing or stopping early (researcher):** during a game, tap the **top-left corner 5 times quickly**. Choose Resume, or End game (the data so far stays saved).

## 4. Data

- Each game is saved on the iPad **after every cast**, so nothing is lost if the app is closed.
- To get the data off the iPad: start screen → **Saved data** → **Export** (one game) or **Export all**. Export opens the iPad share sheet: choose **Save to Files**, AirDrop, email, etc. Files are named `participant_FishingGame_date.csv`.
- **Saved data** on the start screen lists every game on this iPad, with Export per game, **Export all** (one combined CSV) and **Delete all**.
- The data saved inside the Home Screen app is separate from Safari's, so always export from the app.
- Export regularly. Data is stored in the app's browser storage, and deleting the app removes it.

The columns match the PsychoPy data: `trialNum, roundNum, practice, trialID, priorCond, likeCond, inRing, splash1X…splash5Y, splashMeanX/Y, realX, realY, respX, respY, rt, respDist, respDistPx, fishLevel, totalPoints, fishImage, playerPicked, lbRank, lbYouScore, lbBest, lbAverage, lbWorst`. A final row holds `finalRank, finalTotalYou, finalTotalBest, finalTotalAvg, finalTotalWorst`. `screenW, screenH, unitPx` record the screen size (unitPx = pixels per height unit).

## 5. Changing the game

- **Settings** (SDs, reward distances, leaderboard rules) are at the top of `game.js`.
- **Trials**: `trials.js` holds the 110 trials (copied from `trial_set.csv`).
- After changing any file, upload it again **and** change `VERSION` at the top of `sw.js` (e.g. `fishing-v2`). Otherwise iPads keep the old offline copy. Then open the app once while online.

## Differences from the PsychoPy version

- On-screen words say **Tap** instead of Click (including the How to play pages).
- A tap counts at the moment the finger touches the screen. On every screen only a new tap counts, so a held press can't skip a trial.
- The researcher start screen and the data export replace PsychoPy's dialog box and data folder.
