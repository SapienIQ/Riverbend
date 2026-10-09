# Riverbend Workshop Smoke Test Checklist

Use this checklist after each milestone update. The player should be able to complete the first memory without typing notes or reading the Notebook.

1. Clear local save, load the app, and confirm the player sees one hearth hotspot, one primary `Reveal` button, two clue tokens, and a collapsed Notebook.
2. Confirm no professional tool tray, tab row, evidence drawer, or exposed count dashboard is visible during the first loop.
3. Click `Reveal` and confirm the hearth marker reacts and the prompt advances without adding extra choices.
4. Click `Collect` for piece 1 and confirm one clue token changes from hidden to collected.
5. Reveal and collect piece 2, then confirm the primary action becomes `Restore pot`.
6. Click `Restore pot` and confirm a forgiving two-piece restore panel appears, both pieces show the same mark, and the pot becomes restored.
7. Click `Place by hearth` and confirm the restored pot creates a warm hearth echo in the room scene.
8. Click `Wake the room` and confirm the room memory text appears and the warm meal mark is learned.
9. At `Decide`, confirm exactly three light story choices appear: daily cooking, sudden damage, and later mixing.
10. Choose `Daily cooking` and confirm the primary action changes to `Follow the doorway`.
11. Click `Follow the doorway`, then reveal, collect, place, and wake the bead memory without any new dashboard controls appearing.
12. At the doorway `Decide`, confirm exactly three light story choices appear: kept close, dropped by accident, and moved later.
13. Open Notebook and confirm it contains optional archaeology notes and `Marks I know`, but no progress depends on opening it.
14. Save, reload, and confirm chapter step, collected pieces, restored pot, hearth memory, doorway memory, learned marks, and story choices restore correctly.
15. Check desktop, tablet, and mobile widths for no required browser-page scrolling during active play.
16. Confirm hover/focus/tap states make the active hotspot, story choices, menu, Notebook, and primary action visibly reactive.
17. Run `pnpm run lint` and `pnpm build`.
