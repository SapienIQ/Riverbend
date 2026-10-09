# Riverbend Workshop Smoke Test Checklist

Use this checklist after each milestone update. The player should be able to complete the first memory without typing notes or reading the Notebook.

1. Clear local save, load the app, and confirm the player sees one hearth hotspot, one primary `Reveal` button, two clue tokens, and a collapsed Notebook.
2. Confirm no professional tool tray, tab row, evidence drawer, or exposed count dashboard is visible during the first loop.
3. Click `Reveal` and confirm the hearth marker reacts and the prompt advances without adding extra choices.
4. Click `Collect` for piece 1 and confirm one clue token changes from hidden to collected.
5. Reveal and collect piece 2, then confirm the primary action becomes `Restore pot`.
6. Click `Restore pot` and confirm a forgiving two-piece restore board appears, the primary action is disabled, and both pieces show the same mark.
7. Drag or use `Move closer` plus rotate controls until the prompt reaches `The pieces remember each other`, then click `Join pieces`.
8. Confirm the pot becomes restored and the place token appears with a glowing hearth target.
9. Use `Move closer` or drag the token until the primary action becomes `Set it down`, then click it.
10. Confirm the restored pot creates a warm hearth echo in the room scene.
11. Click `Wake the room` and confirm the room memory text appears and the warm meal mark is learned.
12. At `Decide`, confirm exactly three light story choices appear: daily cooking, sudden damage, and later mixing.
13. Choose `Daily cooking` and confirm the primary action changes to `Follow the doorway`.
14. Click `Follow the doorway`, then reveal, collect, place, and wake the bead memory without any new dashboard controls appearing.
15. At the doorway `Place`, confirm the bead token and doorway target use the same place interaction as the hearth.
16. At the doorway `Decide`, confirm exactly three light story choices appear: kept close, dropped by accident, and moved later.
17. Open Notebook and confirm it contains optional archaeology notes and `Marks I know`, but no progress depends on opening it.
18. Save, reload during restore/place and confirm piece positions, token positions, and rotations persist; reload after completion and confirm chapter step, restored pot, memories, learned marks, and story choices restore correctly.
19. Check desktop, tablet, and mobile widths for no required browser-page scrolling during active play.
20. Confirm hover/focus/tap states make fragments, rotate controls, place tokens, the active hotspot, story choices, menu, Notebook, and primary action visibly reactive.
21. Run `pnpm run lint` and `pnpm build`.
