# System-App – Regeln für Claude

Offline-PWA zur Selbstoptimierung (Solo-Leveling-Stil). Vollständiger Plan: `PROJEKTPLAN.md` (nur lesen, wenn nötig).

## Nutzer
- Programmier-Anfänger. Antworten kurz, einfach, auf Deutsch.
- Immer erst planen, Plan zeigen, nach OK umsetzen.
- Schritte, die der Nutzer selbst machen muss (GitHub, iPhone), knapp als Liste erklären.

## Sparsam arbeiten
- Nur relevante Dateien lesen, keine großen Suchen über das ganze Projekt.
- Keine unnötigen Kommentare oder Erklärungen im Code.
- Fertige Bibliotheken statt Eigenbau.
- Neue Entscheidungen in `PROJEKTPLAN.md` eintragen.
- Nach jedem fertigen Schritt committen.

## Stack
Vite + React + TypeScript + Tailwind, React Router, Dexie.js + dexie-react-hooks, date-fns, Recharts, vite-plugin-pwa, @zxing/browser (Barcode), JSZip (Backup), MiniSearch (Lebensmittelsuche), perfect-freehand (Handschrift), Vitest (nur Rechenlogik). Hosting: GitHub Pages via GitHub Actions.

## Feste Entscheidungen
- 100 % offline nutzbar; Daten lokal in IndexedDB. Optionaler Sync iPhone/iPad über das eigene Dropbox-Konto (`src/lib/sync.ts`).
- Alle erledigten Aktionen über das zentrale Ereignis-Log (`logEvent`). Levelsystem, Streaks und Statistiken lesen nur das Log.
- XP-Werte nur in `src/config/xp.ts`.
- Tageswechsel um 4:00 Uhr (einstellbar). Auswertung verpasster Quests/Streaks beim App-Start.
- UI nur aus den gemeinsamen Bausteinen in `src/components/ui/` (System-Fenster, Button, Balken, Zahleneingabe, Dialog, Fotoaufnahme).
- Dunkles Fitness-App-Design (Karten, Montserrat, Bereichsfarben, siehe PROJEKTPLAN Phase 8); mobil zuerst (iPhone), Safe Areas beachten.
- Fotos beim Speichern auf ~1080 px JPEG verkleinern.
- Backup: eine ZIP-Datei mit allem (`data.json` + `blobs/`).
- Dexie-Schema pro Phase per neuer Version erweitern, nie alte Versionen ändern.
- PIN-Sperre ist nur Sichtschutz.
- Kein Uni-Bereich: entfernt und in Git-Markierung `uni-archiv` + `archiv/UNI.md` gesichert. Uni-Tabellen in Dexie nicht löschen.
- Texte in der App auf Deutsch.
