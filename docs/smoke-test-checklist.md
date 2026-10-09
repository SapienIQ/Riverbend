# Riverbend Workshop Smoke Test Checklist

Use this checklist after each milestone update. The player should be able to complete the first memory without typing notes or reading the Notebook.

1. Clear local save, load the app, and confirm the player sees one hearth hotspot, one primary `Reveal` button, two clue tokens, and a collapsed Notebook.
2. Confirm no professional tool tray, tab row, evidence drawer, or exposed count dashboard is visible during the first loop.
3. Click `Reveal` and confirm the hearth marker reacts and the prompt advances without adding extra choices.
4. Click `Collect` for piece 1 and confirm one clue token changes from hidden to collected.
5. Reveal and collect piece 2, then confirm the primary action becomes `Restore pot`.
6. Click `Restore pot` and confirm a forgiving two-piece restore panel appears and the pot becomes restored.
7. Click `Place by hearth` and confirm the restored pot creates a warm hearth echo in the room scene.
8. Click `Wake the room` and confirm the room memory text appears.
9. At `Decide`, confirm exactly three light story choices appear: daily cooking, sudden damage, and later mixing.
10. Choose `Daily cooking` and confirm the loop completes and the primary action changes to `Play again`.
11. Open Notebook and confirm it contains optional archaeology notes, but no progress depends on opening it.
12. Save, reload, and confirm chapter step, collected pieces, restored pot, hearth memory, and story choice restore correctly.
13. Check desktop, tablet, and mobile widths for no required browser-page scrolling during active play.
14. Confirm hover/focus/tap states make the hearth hotspot, story choices, menu, Notebook, and primary action visibly reactive.
15. Run `pnpm run lint` and `pnpm build`.
