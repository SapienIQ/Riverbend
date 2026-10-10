# Riverbend Workshop Smoke Test Checklist

Use this checklist after each milestone update. The player should be able to complete the main memory route without typing notes or reading the Notebook.

1. Start a fresh game and confirm one pot edge, one primary `Reveal` button, no hidden-clue badges, and a collapsed Notebook. The opening asks "Who made a home here?"
2. Confirm no professional tool tray, tab row, evidence drawer, or exposed count dashboard is visible during the first loop.
3. Click `Reveal` and confirm the hearth marker reacts and the prompt advances without adding extra choices.
4. Click `Collect` for piece 1 and confirm one clue token changes from hidden to collected.
5. Reveal and collect piece 2, then confirm the primary action becomes `Join pieces`, disabled until the pot fits.
6. After collection, confirm a forgiving two-piece pot puzzle appears automatically with the primary action disabled. Fragments use matching clay artwork.
7. Drag or use `Move closer` plus rotate controls until the prompt reaches `Ready to join`, then click `Join pieces`.
8. Confirm the pot becomes restored and the place token appears with a glowing hearth target.
9. Use `Move closer` or drag the token until the primary action becomes `Set it down`, then click it.
10. Confirm the restored pot creates a warm hearth echo in the room scene.
11. Click `Imagine the room` and confirm a two-second crossfade reveals the cooking scene, with a quiet fire cue only when sound is enabled. Reduced motion shows it immediately. Reload must retain the imagined scene.
12. At `Decide`, confirm Everyday cooking, Keeping supplies, and Making things. Only the selected answer shows feedback. Each answer permits progression and revision.
13. Choose `Everyday cooking` and confirm the primary action changes to `Follow the doorway`, with a prompt about the room's later change. Joining hides collected fragment badges.
14. Click `Follow the doorway`, then reveal, collect, place, and wake the bead memory without any new dashboard controls appearing.
15. At the doorway `Place`, confirm the bead token and doorway target use the same place interaction as the hearth.
16. At the doorway `Decide`, confirm exactly three light story choices appear: kept close, dropped by accident, and moved later.
17. Click `Follow the bench`, then reveal and collect weight A, weight B, and the color clue without any new dashboard controls appearing.
18. Confirm the compact three-piece pattern board opens automatically, disables `Bind pattern` until ready, and offers one `Move closer` fallback.
19. Drag or use `Move closer` until the prompt reaches `The pattern holds`, then click `Bind pattern`.
20. Confirm the pattern becomes placeable, the bench target glows, and `Set it down` wakes the bench placement.
21. Click `Imagine the workshop` and confirm the work rhythm mark is learned. The doorway uses `Imagine the doorway` for the same action.
22. At the bench `Decide`, confirm exactly three light story choices appear: steady making, a special order, and left unfinished.
23. Open Notebook and confirm it contains optional archaeology notes and `Marks I know`, including warm meal, kept close, and work rhythm after they are learned, but no progress depends on opening it.
24. Save, reload during restore/pattern/place and confirm piece positions, token positions, rotations, pattern state, and story choices persist; reload after completion and confirm all chapter steps, memories, learned marks, and choices restore correctly.
25. Check desktop, tablet, and mobile widths for no required browser-page scrolling during active play.
26. Confirm hover/focus/tap states make fragments, pattern pieces, rotate controls, place tokens, the active hotspot, story choices, menu, Notebook, and primary action visibly reactive.
27. Run `pnpm run lint` and `pnpm build`.
28. Verify 1280x720, 1024x768, and 390x844 layouts; scene targets remain aligned with artwork and interactive controls are at least 44px high. Inspect keyboard focus and the selected-answer feedback.
29. Ask a new player to try the first minute without explanation. Record whether they find the first action, understand the join, recognize cooking, and want to follow the doorway. This human check remains separate from automated browser verification.
30. Confirm Fraunces renders in prompts and Alegreya Sans in controls and Notebook. Verify licensed local font files return 200, clue labels disappear after their puzzle/placement, selected choices expose aria-pressed, and Notebook is fully visible on mobile. Escape closes Notebook/Menu and returns focus to the disclosure. Check all three memory captions remain within the viewport.
31. Check a short landscape viewport (844x390): puzzle controls use the compact side-by-side layout, decision choices remain reachable, and no active control extends above the viewport. Mobile clue labels must not compete with Notebook and the main action.
32. After the bench decision, select `See the room's story`. Confirm the closing scene reflects all three choices, leaves the bead's meaning unresolved, and survives reload. `Back to my choice` allows revision without clearing finds or puzzle progress.
33. Revisit each learned memory through Notebook. At the hearth, keyboard-activate `Then` and `Now`; the scene changes, selected state is announced, and the reconstruction remains described as imagined. Return through doorway and bench without resetting their completed puzzles.
