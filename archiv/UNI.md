# Uni-Bereich (archiviert)

Der Uni-Bereich wurde am 18.11.2026 aus der System-App entfernt, damit sich die App auf Sport, Ernährung und Haut konzentriert. Er soll später eventuell als eigene App weiterleben.

## Code wiederherstellen

Der komplette Stand mit Uni liegt in der Git-Markierung **`uni-archiv`** (Commit `b9798dc`, Phase 8).

```bash
git checkout uni-archiv            # ganzen Stand ansehen
git show uni-archiv:src/lib/uni.ts # einzelne Datei ansehen
git checkout uni-archiv -- src/pages/UniPage.tsx   # einzelne Datei zurückholen
```

## Funktionen

- **Fächer** als Kacheln auf `/uni`, jedes Fach ein Ordner `/uni/fach/:id?bereich=…` mit Übersicht, Karteikarten, Lernzettel, Lernplan und Material.
- **To-dos mit Fristen** pro Fach, Fristen auf der Uni-Seite (14 Tage) und auf „Heute“ (3 Tage).
- **Lern-Timer (Pomodoro)** 25/30/45/50 Min. + Pause, überlebt das Schließen, Mini-Timer über der Navigation.
- **Klausur-Bosse** (`kind: 'exam'`) mit Wunschnote, Ergebnis ab dem Klausurtag eintragen.
- **Karteikarten** mit Karteikasten (0/1/2/4/8/16 Tage), Themen, feste oder zufällige Reihenfolge, Handschrift auf Vorder-/Rückseite.
- **Lernzettel** mit Markdown (react-markdown + remark-breaks), Fotos und Handschrift-Seiten.
- **Lernplan** verteilt Themen bis zur Klausur, Wiederholungstage, Tagesaufgaben auf „Heute“.
- **Material** mit eigenen Ordnern: Dateien (PDF, Bilder …), Links (YouTube-Vorschau), Handschrift-Notizen; „nur auf diesem Gerät“.
- Quest „Lernen (Timer oder Karteikarten)“, Statistiken (Lernzeit, Karteikarten, Aufgaben, Lernzeit pro Fach), Zusammenhänge (Schlaf ↔ Lernzeit, Lernen ↔ Stimmung), Kalenderexport (Klausuren, Fristen, Lernplan).

## XP (Attribut Intelligenz)

`study_session` 20, `todo_done` 5, `cards_round` 10 (ab 10 Karten, max. 3 Runden/Tag), `plan_task_done` 5, Klausur-Boss-Sieg 100 (`boss_defeated` mit `attr: 'int'`). Die Werte stehen weiter in `src/config/xp.ts`, damit alte Ereignisse ihre XP behalten.

## Daten (bleiben in der App erhalten)

Die Tabellen bleiben in Dexie, im Backup (`data.json`) und im Dropbox-Sync, damit eine spätere Uni-App sie übernehmen kann:

| Tabelle | Inhalt |
|---|---|
| `subjects` | Fächer (`name`, `order`, `archived`, `folders`) |
| `todos` | To-dos (`subjectId`, `text`, `due`, `done`) |
| `cards` | Karteikarten (`front`, `back`, `topic`, `box`, `due`, `frontDrawing`, `backDrawing`) |
| `sheets` | Lernzettel (`title`, `text`, `photoIds`, `drawingIds`) |
| `studyPlans` | Lernpläne (`examDay`, `topics`, `repeatDays`, `tasks`) |
| `files` | Dateien (`subjectId`, `folder`, `category`, `blob`, `noSync`) |
| `links` | Links (`subjectId`, `folder`, `title`, `url`, `category`) |
| `drawings` | Handschrift; Uni-Zeichnungen haben `subjectId` |
| `bosses` | Klausur-Bosse mit `kind: 'exam'`, `subjectId`, `result` |
| `photos` | Lernzettel-Fotos mit `kind: 'sheet'` |
| `events` | `study_session`, `todo_done`, `cards_round`, `plan_task_done` |

Einstellungen: `focusMinutes`, `breakMinutes`, `studyTimer`, `cardOrder`.

## Dateien im Archiv-Stand

Seiten: `src/pages/UniPage.tsx`, `src/pages/SubjectPage.tsx`
Bausteine: `src/components/StudyTimer.tsx`, `Deadlines.tsx`, `TodayPlan.tsx`, `Flashcards.tsx`, `StudySheets.tsx`, `StudyPlan.tsx`, `Material.tsx`, Klausur-Teil in `BossList.tsx`
Logik: `src/lib/uni.ts`, `cards.ts`, `cardBox.ts` (+Test), `sheets.ts`, `studyPlan.ts` (+Test), `studyPlans.ts`, `material.ts`, `links.ts` (+Test), Klausur-Teil in `boss.ts`/`bosses.ts`, Uni-Teile in `stats.ts`, `insights.ts`, `calendar.ts`, `StatsPage.tsx`, `CalendarPage.tsx`
Bibliotheken nur für Uni: `react-markdown`, `remark-breaks`

## Entscheidungen (aus PROJEKTPLAN.md)

### Entscheidungen aus Phase 6a

- **Uni-Seite** (`/uni`): Fächer (Tabelle `subjects`) mit To-dos (Tabelle `todos`, Dexie-Version 9). Deadlines sind To-dos mit optionaler Frist, keine eigene Tabelle. Fristen der nächsten 14 Tage oben auf der Uni-Seite, die der nächsten 3 Tage auf „Heute“.
- **XP:** `study_session` 20, `todo_done` 5, beide Intelligenz. To-do wieder öffnen löscht das Ereignis.
- **Lern-Timer:** Zustand in der Einstellung `studyTimer` (überlebt Seitenwechsel und Schließen). Lernzeit 25/30/45/50 Min., Pause 5/10/15 Min. Ende wird in einer Transaktion genau einmal gezählt (`finishStudyIfDue`), danach startet die Pause. Abbrechen gibt keine XP. Läuft der Timer, zeigt jede andere Seite einen Mini-Timer über der Navigation.
- **Quest „Eine Lerneinheit“**, nur wenn ein aktives Fach existiert (ab dem Tag, an dem es angelegt wurde).
- **Klausur-Boss** (`kind: 'exam'`, Felder `subjectId`, `result`; `target` = Wunschnote, 0 = egal): Ab dem Klausurtag „Ergebnis eintragen“. Sieg bei bestanden und Note ≤ Wunschnote (`boss_defeated` mit `attr: 'int'`), sonst Niederlage. Kein automatisches Verlieren nach dem Termin. Logik `examOutcome` in `src/lib/boss.ts`.

### Entscheidungen aus Phase 6a+ (Fach-Ordner, Teil 1)

- **Uni-Seite:** oben Lern-Timer und Fristen, darunter Fächer als Kacheln (offene To-dos, nächste Frist, Klausur-Countdown, Anzahl Dateien). Klausuren und To-dos stehen nur noch im Fach-Ordner.
- **Fach-Ordner** `/uni/fach/:id?bereich=…` mit fünf Bereichen: Übersicht (Timer fest auf das Fach, To-dos/Fristen, Klausur-Boss), Karteikarten, Lernzettel, Lernplan (Teil 2 und 3), Dateien.
- **Dateien** (Tabelle `files`, Dexie-Version 10): PDFs, Bilder und andere Dateien unverändert als Blob, Art Skript/Übung/Notiz. Öffnen über Blob-URL, dazu „Teilen / In anderer App öffnen“. Backup in der Foto-ZIP unter `dateien/` (alte ZIPs ohne Dateien lassen vorhandene Dateien unangetastet).
- Mini-Timer wird auch in der Übersicht des laufenden Fachs ausgeblendet.

### Entscheidungen aus Phase 6a+ (Teil 2: Karteikarten)

- Tabelle `cards` (Dexie-Version 11): Vorderseite, Rückseite, optionales Thema, Fach `box` 0–5 und Fälligkeitstag `due`. Logik in `src/lib/cardBox.ts`: gewusst → nächstes Fach (0, 1, 2, 4, 8, 16 Tage), nicht gewusst → Fach 0 und in derselben Runde nochmal.
- **Lernrunde** nur mit fälligen Karten (nach Thema filterbar). **Freies Üben** mit allen Karten ändert keine Fächer und gibt keine XP.
- XP `cards_round` 10 (Intelligenz), wenn mindestens 10 verschiedene Karten in der Runde dran waren, höchstens 3 Runden pro Tag (`CARD_ROUND_MIN`, `CARD_ROUND_XP_MAX_PER_DAY`). Zählt auch für die Lern-Quest („Lernen (Timer oder Karteikarten)“).
- Fach-Kachel zeigt fällige Karten.
- Reihenfolge einstellbar (Einstellung `cardOrder`, gilt für alle Fächer): fest = in der Reihenfolge des Anlegens, zufällig = neu gemischt pro Runde.

### Entscheidungen aus Phase 6a+ (Teil 3: Lernzettel und Lernplan)

- **Lernzettel** (Tabelle `sheets`, Dexie-Version 12): Titel, Text als Markdown (`react-markdown` + `remark-breaks`, einfache Zeilenumbrüche bleiben), Knöpfe für Überschrift, Liste und Fett. Fotos über `PhotoCapture` in `photos` mit `kind: 'sheet'`, IDs am Lernzettel (`photoIds`). Abbrechen löscht neu aufgenommene Fotos, Löschen des Zettels löscht seine Fotos. `TextField` hat dafür `textareaRef`.
- **Lernplan** (Tabelle `studyPlans`, einer pro Fach): Klausurtermin (Vorschlag vom Klausur-Boss), Themen (eins pro Zeile), Wiederholungstage. `buildPlan` in `src/lib/studyPlan.ts` verteilt die Themen gleichmäßig ab heute bis vor der Klausur, danach je ein Tag „Wiederholen: alle Themen“. „Neu planen“ behält Erledigtes und verteilt den Rest ab heute neu.
- XP `plan_task_done` 5 (Intelligenz). „Heute“ zeigt die Aufgaben des Tages und verpasste Themen (rot „nachholen“), solange die Klausur nicht vorbei ist.

### Entscheidungen aus Phase 6a+ (Material: Ordner und Links)

- Bereich „Dateien“ heißt jetzt **Material** (`src/components/Material.tsx`). Eigene **Ordner** pro Fach (Namen in `subjects.folders`, Feld `folder` an Dateien und Links). Ordner löschen schiebt den Inhalt nach „Ohne Ordner“, Umbenennen zieht den Inhalt mit. Geöffneter Ordner steht in der Adresse (`?bereich=dateien&ordner=…`).
- Dateien und Lernzettel-Fotos öffnen sich im UI-Baustein `FileViewer` (Vollbild-Dialog: Bild, Video, PDF/Text per iframe, sonst „In anderer App öffnen“). Grund: Blob-Links in neuem Fenster bleiben in der Home-Bildschirm-App auf iOS beim Laden hängen.
- **Links** (Tabelle `links`, Dexie-Version 13, im Daten-JSON): Adresse, Titel (leer → „YouTube-Video“ bzw. Seitenname), Art. Arten für Dateien und Links: Skript, Übung, Notiz, Video, Webseite. YouTube-Erkennung und Vorschaubild (`img.youtube.com`, nur online) in `src/lib/links.ts`.

