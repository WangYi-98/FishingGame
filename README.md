Fishing Game – iPad version

A web version of Fishing2.psyexp that runs full-screen from an icon on the iPad Home Screen and works offline. It uses the same images and scoring, with its own trial list (trial_set.csv: 117 casts, plus 108 casts for the optional extra rounds). Instead of the leaderboard, the iPad version shows a bar graph of points per round.

1. Put the folder online (once)

The iPad has to download the game once from an https web address. Any static web hosting works. Two free options:

GitHub Pages

Create a GitHub account and a new repository (e.g. FishingGame).
Upload everything in this folder (keep the images and icons folders).
In the repository: Settings → Pages → Branch: main → Save.
After a minute the game is at https://<your-username>.github.io/FishingGame/.

Netlify Drop: drag this whole folder onto https://app.netlify.com/drop and you get an https address.

Only the game files are online. Participants' data never leaves the iPad unless you export it.

2. Install on each iPad (once)
Open the address in Safari (it must be Safari).
Tap Share → Add to Home Screen → Add.
Open the game from the new icon once while still online, so it saves an offline copy.

From then on, tap the icon to play. No internet is needed.

3. Running a session
Tap the icon. Enter the Participant ID, then tap Start game. Hand over the iPad in landscape.
The participant plays: How to play (4 pages) → 9 practice casts → pick a player → 9 rounds of 12 casts, each followed by the round catch and a bar graph of points per round → after round 9, Keep playing (up to 9 extra rounds, one at a time) or Finish → thank-you screen.
At the end, the participant sees a "Thank you for playing!" screen. The data is already saved in the game.
Tap Quit (or tap the top-left corner 5 times). The start screen opens for the next participant. Nothing else to do: the data is already saved in the game.
Saving to Files: whenever convenient (e.g. end of the day), on the start screen tap Save data (n) → Save to Files → Save. Every participant not yet saved is saved as their own CSV in one go and marked as saved. When everything is saved the button shows All data saved to Files ✓.

Games ended before the first cast is finished are not saved.

Pausing or stopping early (researcher): during a game, tap the top-left corner 5 times quickly. Choose Resume, or End game (the casts already finished stay saved; the cast in progress is not saved).

4. Data
Each game is saved inside the game on the iPad after every cast (when they tap past the catch screen), so at most the cast in progress is lost if the app is closed.
Save data (start screen) saves all not-yet-saved games to the Files app (one CSV per participant, named participant_FishingGame_date.csv). Saved games stay in the game as a backup.
Data inside the game is deleted if the Home Screen icon is removed — save data before removing or reinstalling the game.

One row per cast, with these columns (in this order): participant, date, expName, trialNum, roundNum, practice, trialID, priorCond, likeCond, inRing, netSpot, netX, netY, basket, splash1X…splash5Y, splashMeanX, splashMeanY, realX, realY, respX, respY, rt, timedOut, respDist, respDistPx, fishLevel, totalPoints, fishImage, playerPicked, extraRound, roundScore, bestRound, choice, screenW, screenH, unitPx.

playerPicked is filled in on the first main cast (trial 10); roundScore, bestRound and choice only on the last cast of a round (see Differences below).
timedOut is always False (there is no time limit).
screenW, screenH, unitPx record the screen size (unitPx = pixels per height unit).
There is no leaderboard, so there are no lb… or final… columns and no final summary row.

5. Changing the game
Settings (SDs, reward distances, rounds) are at the top of game.js.
Trials: trials.js holds the 225 trials (copied from trial_set.csv): 9 practice + 108 main + 108 extra-round casts (extra = 1, trials 201–308).
After changing any file, upload it again and change VERSION at the top of sw.js (e.g. fishing-v71). Otherwise iPads keep the old offline copy. Also change APP_VERSION in game.js to match (e.g. v71): it's the version shown on the start screen, so you can check each iPad has the update. Then open the app once while online.
