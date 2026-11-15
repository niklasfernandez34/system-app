# App „System“: Projektplan

All-in-One-App für die Selbstoptimierung, im Stil von Solo Leveling. Sie deckt alle 5 Bereiche ab: Uni, Sport, Ernährung, Hautbild und Antrieb.

> Stand: Phase 0 und Phase 1 (Fundament) sind abgeschlossen (15.11.2026).

---

## 1. Rahmenbedingungen

- **Kosten:** 0 € neben dem Claude-Abo. Höchstens 10 € einmalig.
- **Testphase:** mindestens 4 Monate. Danach entscheiden: weiter als Web-App oder für 99 €/Jahr als native Apple-App mit Watch und Health.
- **Geräte:** iPhone ist das **Hauptgerät**. iPad und MacBook bekommen die Daten bei Bedarf per Backup-Import. Es gibt keinen automatischen Abgleich zwischen den Geräten, weil dafür ein Server nötig wäre.
- **Offline ist Pflicht.** Alles, was im Gym passiert, muss ohne Internet funktionieren. Internet braucht man nur für App-Updates, die Lebensmittel-Datenbank und Übungsbilder beim ersten Ansehen.
- **Form:** Web-App (PWA). Sie wird über Safari mit „Zum Home-Bildschirm“ installiert, hat ein eigenes Icon und läuft im Vollbild.
- **Prinzip:** Alles kommt rein. Was nicht gefällt, fliegt später raus oder wird geändert.
- **Sparsam mit Credits:** siehe Abschnitt 7.

## 2. Technik

| Teil | Wahl | Warum |
|---|---|---|
| Grundgerüst | Vite + React + TypeScript | Standard, Claude kennt es sehr gut |
| Navigation | React Router | fertige Lösung für die Seiten |
| Design | Tailwind CSS, dunkles „System-Fenster“-Design mit blauem Glow | schnell anpassbar |
| Offline | vite-plugin-pwa (Service Worker) | die App lädt ohne Internet |
| Datenspeicher | IndexedDB über Dexie.js + dexie-react-hooks | alle Daten lokal, die Anzeige aktualisiert sich automatisch |
| Datum/Zeit | date-fns | Streaks, Countdowns, Wochen |
| Diagramme | Recharts | Statistiken |
| Lebensmittel | Open Food Facts API (kostenlos), Barcode-Scan mit @zxing/browser | Safari kann Barcodes nicht selbst lesen; Ergebnisse werden offline zwischengespeichert |
| Übungen | wger-Übungsdatenbank (kostenlos). Ein Skript holt die Daten einmalig in eine JSON-Datei, Bilder werden beim ersten Ansehen geladen und zwischengespeichert | kleine App, trotzdem offline nutzbar |
| Tests | Vitest, nur für die Rechenlogik (XP, Ränge, Gewichtssteigerung, Streaks) | billige Absicherung |
| Hosting | GitHub Pages (kostenlos, HTTPS), automatisches Update per GitHub Actions bei jedem Push | **ab Phase 1** |
| Backup | Daten als JSON-Datei, Fotos getrennt als ZIP (JSZip), z. B. nach iCloud Drive | Schutz vor Datenverlust |

### Wichtige technische Entscheidungen (aus Phase 0)

- **HTTPS zum Testen:** Offline-Modus und Kamera funktionieren auf dem iPhone nur über HTTPS. Deshalb wird ab Phase 1 über GitHub Pages getestet. Der Dev-Server mit `--host` reicht nur für schnelle Optik-Checks.
- **Ereignis-Log:** Jeder Bereich meldet erledigte Aktionen über eine zentrale Funktion (z. B. `logEvent('workout_done', …)`). Das Levelsystem, Streaks und Statistiken lesen nur dieses Log. So muss später kein fertiger Bereich umgebaut werden.
- **XP-Werte** stehen ab Phase 1 zentral in einer Datei (`src/config/xp.ts`).
- **Tageswechsel um 4 Uhr nachts** (einstellbar). Lernen bis 1 Uhr zählt noch zum Vortag.
- **Keine Hintergrund-Ausführung:** Verpasste Quests und Streaks werden beim nächsten Öffnen der App ausgewertet.
- **Dauerhafter Speicher:** Beim Start fragt die App `navigator.storage.persist()` an.
- **Fotos** werden beim Speichern verkleinert (ca. 1080 px, JPEG).
- **PIN-Sperre** ist ein Sichtschutz, keine Verschlüsselung.
- **Datenbank-Schema** wächst mit Dexie-Versionen pro Phase mit. Es wird nicht alles im Voraus geplant.

### Entscheidungen aus Phase 1

- **HashRouter** (Adressen wie `#/sport`), damit Neuladen auf GitHub Pages keinen 404-Fehler gibt. `base: './'` in Vite, damit der Repository-Name egal ist.
- **Dexie Version 1:** Tabellen `events` (Ereignis-Log: `type`, `at`, `day`, `data`), `settings` (Schlüssel/Wert) und `photos` (`kind`, `createdAt`, `blob`).
- **Tageswechsel:** Jedes Ereignis speichert seinen logischen Tag (`day`). Bereiche melden sich mit `onNewDay()` aus `src/lib/startup.ts` für die Auswertung verpasster Tage an. Die Auswertung läuft beim Start und wenn die App wieder sichtbar wird.
- **Backup** speichert über das Teilen-Menü (iPhone: „In Dateien sichern“). Die Erinnerung an das Backup kommt in Phase 7.
- Recharts und @zxing werden erst in den Phasen installiert, die sie brauchen.
- **Deployment:** GitHub Actions (`.github/workflows/deploy.yml`) testet, baut und veröffentlicht bei jedem Push auf `main`.

### Entscheidungen aus Phase 2

- **Dexie Version 2:** neue Tabellen `habits` (`name`, `order`, `archived`), `journal` (ein Eintrag pro logischem Tag: `sleepHours`, `sleep`, `energy`, `mood` 1–5, `text`) und `notes` (`text`, `createdAt`, optional `ref` wie `day:2026-11-16` für spätere Anmerkungen an Übungen oder Mahlzeiten).
- **Ereignisse:** `checkin_done` (einmal pro Tag, mit den Werten), `journal_written` (einmal pro Tag, wenn Text vorhanden), `habit_done` (`habitId`; Abhaken rückgängig löscht das Ereignis des Tages) und `note_added`.
- **Streaks** werden mit `calcStreak` (`src/lib/streak.ts`) aus den Tagen im Log berechnet. Ein offener heutiger Tag bricht die Serie nicht.
- **Habits** werden archiviert statt gelöscht, damit ihre Ereignisse gültig bleiben.
- **Schlafstunden** werden zusätzlich zur Schlafqualität erfasst (für die Auswertung „7+ h Schlaf“ in Phase 7).
- **PIN:** SHA-256-Hash in `settings.pinHash`. Die Freigabe gilt bis zum Wechsel in den Hintergrund. `<PinGate>` schützt Seiten (später auch Fotos).
- **Neue UI-Bausteine:** `Rating` (1–5), `TextField` (ein- oder mehrzeilig), `PinPad`.
- Tagebuch, Habits und Notizen sind über „Mehr“ erreichbar. Die „Heute“-Seite zeigt Check-in-Status und Habits zum Abhaken.
- **Backup Version 2** enthält auch die neuen Tabellen. Ältere Backups lassen sich weiter laden.

## 3. Funktionen

### Start: „Heute“-Seite
- Tägliche Quests, heutiges Training, Essen und Wasser, Erinnerungen, Streaks
- Aktuelles Level, XP-Balken und Attribute auf einen Blick

### Levelsystem
- **Attribute:** Stärke (Sport), Intelligenz (Uni), Vitalität (Ernährung), Charisma (Hautbild), Willenskraft (Antrieb)
- **Ränge:** E → D → C → B → A → S
- **XP** für erledigte Aktionen in allen Bereichen. Die Werte stehen zentral in einer Datei und sind leicht anpassbar.
- **Tägliche Quests** werden automatisch aus den Bereichen erzeugt. Wer eine verpasst, bekommt eine Penalty Quest oder verliert XP.
- **Boss-Kämpfe:** Klausuren und Trainingsziele mit Countdown und Extra-XP
- **Titel und Erfolge**, z. B. „30 Tage Streak“ oder „100 kg Bankdrücken“
- Animation beim Level-Up

### Sport
- Trainingspläne mit Übung, Sätzen, Wiederholungen und Gewicht
- **Automatische Steigerung:** Wer alle Sätze schafft, bekommt beim nächsten Mal einen Gewichtsvorschlag nach oben.
- Bilder zur Übung, Muskelgruppen, Kalenderplan
- Pausentimer, der nach jedem Satz automatisch startet
- Bestleistungen (PRs) werden automatisch erkannt
- Körpergewicht und Maße im Verlauf
- Fortschrittsfotos, die nur lokal gespeichert werden

### Ernährung
- Essenstracker mit Suche und Barcode-Scan. Online wird aktualisiert, offline wird zwischengespeichert.
- Ziele für Kalorien und Makros, eigener Balken für Protein
- Wasser-Tracker
- Lieblingsmahlzeiten mit einem Tipp hinzufügen

### Uni
- Lern-Timer (Pomodoro) mit XP
- Deadlines und Klausuren mit Countdown (= Bosse)
- To-dos pro Fach

### Hautbild
- Checkliste für die Pflegeroutine morgens und abends
- Hautfotos im Verlauf mit Vergleichsansicht

### Antrieb und Übergreifendes
- Habit-Tracker mit Streaks
- Tagebuch mit täglichem Check-in: Schlaf, Energie und Stimmung (1–5)
- Notizen und Anmerkungen. Anmerkungen lassen sich an Übungen, Tage oder Mahlzeiten hängen.
- **Zusammenhänge:** automatische Auswertungen, z. B. „Mit 7+ h Schlaf trainierst du besser“
- Wochenrückblick am Sonntag
- Statistiken mit Diagrammen

### Erinnerungen
- Termine wie Training, Lernen oder Pflegeroutine werden als Kalenderdatei (.ics) exportiert. Der Apple-Kalender übernimmt dann das Erinnern.
- Später optional: Web-Push-Benachrichtigungen. Das ist aufwendiger, weil dafür ein Server nötig ist.

### Sicherheit
- PIN-Sperre für Tagebuch und Fotos (Sichtschutz)
- Backup mit einem Tipp (Daten-JSON + Foto-ZIP), dazu eine wöchentliche Erinnerung an das Backup als Hinweis in der App

## 4. Bauphasen

Immer eine Phase nach der anderen. Nach jeder Phase auf dem iPhone testen (über GitHub Pages).

0. ~~**Prüfen und optimieren**~~ – erledigt.
1. ~~**Fundament:** Projekt-Setup, PWA und Offline, Datenbank (Dexie), **Ereignis-Log**, **XP-Konfigurationsdatei**, Design, **wiederverwendbare Bausteine** (System-Fenster/Karte, Button, Fortschrittsbalken, Zahleneingabe, Dialog, Fotoaufnahme mit Verkleinerung), Navigation, „Heute“-Seite (leer), Backup Export/Import, Tageswechsel-Logik, `storage.persist()`, **Git + GitHub + automatisches Deployment auf GitHub Pages**~~ – erledigt.
2. ~~**Tagebuch, Notizen, Habits:** Check-in, Streaks, PIN-Sperre~~ – erledigt.
3. **Sport**
   - **3a Training:** Pläne, Training durchführen, Pausentimer, automatische Steigerung, PRs
   - **3b Daten:** Übungsdatenbank (wger-Skript), Körperdaten, Fortschrittsfotos
4. **Levelsystem:** XP, Attribute, Ränge, Quests, Penalty, Bosse, Titel. Liest das Ereignis-Log, die fertigen Bereiche bleiben unverändert.
5. **Ernährung:** Tracker, Barcode, Wasser, Ziele, Favoriten
6. **Uni und Hautbild:** Timer, Deadlines, To-dos, Pflegeroutine, Hautfotos
7. **Erinnerungen und Auswertung:** Kalenderexport, Zusammenhänge, Wochenrückblick, Statistiken

(Die frühere Phase 8 „Veröffentlichen“ ist in Phase 1 aufgegangen.)

### Modell pro Phase
- **Opus/Fable:** Phase 1 und 4 sowie knifflige Fehler
- **Sonnet:** alle anderen Phasen und kleine Änderungen

## 5. Einrichtung auf dem MacBook (einmalig)

1. **Git:** ✅ bereits installiert.
2. **Node.js:** ✅ v26.13.1 (LTS) installiert in `~/.local/node` (ohne Admin-Rechte), PATH in `~/.zshrc`.
3. **Claude Code:** ✅ vorhanden.
4. **GitHub-Konto** anlegen (kostenlos). ❗ Wird schon **ab Phase 1** gebraucht.
5. Ordner `~/Projekte/system-app` mit dieser Datei. ✅ erledigt.
6. Im Terminal: `cd ~/Projekte/system-app` und dann `claude` (oder in der Claude-App diesen Ordner wählen).

**Auf dem iPhone testen:** Die App über die GitHub-Pages-Adresse in Safari öffnen und mit „Zum Home-Bildschirm“ installieren. Für schnelle Optik-Checks geht zusätzlich der Dev-Server mit `--host` (iPhone und Mac im selben WLAN). Offline und Kamera funktionieren dort aber nicht.

## 6. Prompts für Claude Code

### Phase 1 (Fundament), in einer neuen Sitzung

```
Setze Phase 1 aus PROJEKTPLAN.md um. Plane zuerst, zeig mir den Plan, und leg nach meinem OK los.
Richte am Ende das automatische Deployment auf GitHub Pages ein und erkläre mir kurz die Schritte,
die ich selbst machen muss (GitHub-Repository anlegen, Pages aktivieren).
```

### Für alle weiteren Phasen

```
Setze Phase X aus PROJEKTPLAN.md um. Plane zuerst, zeig mir den Plan, dann nach OK umsetzen.
```

## 7. Credits sparen bei der Arbeit mit Claude Code

- **Eine Phase pro Sitzung, danach `/clear`** oder eine neue Sitzung. Ein langer Chatverlauf wird bei jeder Nachricht mitgeschickt und kostet dadurch immer mehr. Wird eine Sitzung lang, hilft `/compact`.
- **Kurze CLAUDE.md:** Sie wird bei jeder Sitzung mitgelesen, jede überflüssige Zeile kostet also jedes Mal.
- **Plan vor Code:** Lass dir erst den Plan zeigen (Shift+Tab schaltet in den Plan-Modus). Fehler im Plan zu korrigieren ist billig, Fehler im fertigen Code teuer.
- **Präzise Prompts:** Sag genau, welche Datei oder welcher Bildschirm gemeint ist.
- **Kleine Änderungen sammeln:** Lieber 5 Wünsche in einer Nachricht als 5 einzelne Nachrichten.
- **Modell passend wählen:** siehe „Modell pro Phase“.
- **Kleine Sachen selbst machen:** z. B. die XP-Werte in `src/config/xp.ts`.
- **Fehler gezielt melden:** genaue Fehlermeldung kopieren oder Screenshot schicken.
- **Entscheidungen in Dateien festhalten:** „Trag das in PROJEKTPLAN.md ein.“

## 8. Weitere Tipps

- **Nach jeder Phase committen.** Dann kannst du jederzeit zum letzten funktionierenden Stand zurück.
- **Änderungswünsche einfach beschreiben**, z. B. „Die XP für Training sind zu hoch, halbiere sie.“
- **Regelmäßig ein Backup** über die App machen, vor allem vor großen Updates.
