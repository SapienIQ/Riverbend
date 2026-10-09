# Riverbend Workshop Smoke Test Checklist

Use this checklist after each milestone update. The player should be able to complete the first memory without typing notes or reading the Notebook.

1. Clear local save, load the app, and confirm the player sees one hearth hotspot, one primary `Reveal` button, two clue tokens, and a collapsed Notebook.
2. Confirm no professional tool tray, tab row, evidence drawer, or exposed count dashboard is visible during the first loop.
3. Click `Reveal` and confirm the hearth marker reacts and the prompt advances without adding extra choices.
4. Click `Collect` for piece 1 and confirm one clue token changes from hidden to collected.
5. Reveal and collect piece 2, then confirm the primary action becomes `Restore pot`.
6. Click `Restore pot` and confirm a forgiving two-piece restore board appears, the primary action is disabled, and both pieces show the same mark.
7. Drag or use `Move closer` plus rotate controls until the prompt reaches `The pieces remember each other`, then click `Join pieces`.
8. Confirm the pot becomes restored and the primary action advances to `Place by hearth`.
9. Click `Place by hearth` and confirm the restored pot creates a warm hearth echo in the room scene.
10. Click `Wake the room` and confirm the room memory text appears and the warm meal mark is learned.
11. At `Decide`, confirm exactly three light story choices appear: daily cooking, sudden damage, and later mixing.
12. Choose `Daily cooking` and confirm the primary action changes to `Follow the doorway`.
13. Click `Follow the doorway`, then reveal, collect, place, and wake the bead memory without any new dashboard controls appearing.
14. At the doorway `Decide`, confirm exactly three light story choices appear: kept close, dropped by accident, and moved later.
15. Open Notebook and confirm it contains optional archaeology notes and `Marks I know`, but no progress depends on opening it.
16. Save, reload during restore and confirm piece positions/rotations persist; reload after completion and confirm chapter step, restored pot, memories, learned marks, and story choices restore correctly.
17. Check desktop, tablet, and mobile widths for no required browser-page scrolling during active play.
18. Confirm hover/focus/tap states make fragments, rotate controls, the active hotspot, story choices, menu, Notebook, and primary action visibly reactive.
19. Run `pnpm run lint` and `pnpm build`.
