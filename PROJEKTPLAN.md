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

### Entscheidungen aus Phase 3a

- **Dexie Version 3:** neue Tabellen `exercises` (`name`, `muscle`), `plans` (`name`, `order`, `items` mit Übung, Sätzen, Wiederholungen, Startgewicht, `archived`) und `workouts` (`planId`, `day`, `startedAt`, `finishedAt`, `restEndsAt`, `entries` mit Sätzen: Gewicht, Wiederholungen, erledigt).
- **Laufendes Training** = `finishedAt: 0`. Es bleibt gespeichert und lässt sich nach dem Schließen der App fortsetzen. Es gibt höchstens eins gleichzeitig.
- **Steigerung** (`src/lib/progression.ts`): Waren beim letzten Mal alle Sätze abgehakt und die Ziel-Wiederholungen erreicht, schlägt die App das Arbeitsgewicht plus Steigerung vor (Standard 2,5 kg). Sonst bleibt das Gewicht gleich.
- **PRs** (`src/lib/pr.ts`): höchstes Gewicht oder besseres geschätztes 1RM (Epley) gegenüber allen früheren Trainings. Beim ersten Training einer Übung gibt es noch keinen PR.
- **Ereignisse:** `workout_done` (`workoutId`, `planId`, `sets`, `volume`) und `pr_set` (`exerciseId`, `kind`, `value`, `previous`).
- **Pausentimer:** Das Ende wird als Zeitpunkt (`restEndsAt`) gespeichert und läuft deshalb auch nach einem Wechsel in den Hintergrund richtig. Am Ende gibt es einen Ton (Web Audio, wird beim Abhaken freigeschaltet), auf Android zusätzlich Vibration. iOS kann nicht vibrieren.
- **Einstellungen** `restSeconds` (90 s) und `weightIncrement` (2,5 kg) stehen auf der Sport-Seite.
- **Übungen** legst du vorerst selbst an (mit Muskelgruppe). In 3b kommt die wger-Datenbank dazu.
- **Neuer UI-Baustein:** `Chips` (Auswahl aus mehreren Optionen).
- **Backup Version 3** enthält auch die neuen Tabellen.

### Entscheidungen aus Phase 3b

- **wger-Daten:** `node scripts/fetch-wger.mjs` holt alle Übungen (deutscher Name, sonst englisch) nach `src/data/wger.json` (~970 Übungen, ~490 KB). Die Datei wird erst bei der Suche geladen (eigener Baustein) und ist trotzdem offline vorgespeichert. Zum Aktualisieren das Skript erneut ausführen.
- **Übungsbilder** lädt die App beim ersten Ansehen von wger.de und speichert sie im Service Worker zwischen (Cache „wger-bilder“). Die Urheber werden nach CC-BY-SA in den Übungsdetails genannt.
- Wählst du eine wger-Übung, wird sie mit `wgerId` in `exercises` übernommen. Gesucht wird ab 2 Buchstaben.
- **Dexie Version 4:** Index `wgerId` an `exercises`, neue Tabelle `body` (ein Eintrag pro logischem Tag: `weight`, `waist`, `chest`, `arm`, `thigh`, `hip`, alle freiwillig).
- **Fortschrittsfotos** kommen in `photos` mit `kind: 'progress'`, `day` und `pose` (Vorne, Seite, Hinten) und sind damit automatisch im Foto-Backup. Die Seite hat eine PIN-Sperre. Zwei ausgewählte Fotos werden nebeneinander verglichen.
- **Ereignisse:** `body_logged` (einmal pro Tag) und `progress_photo`.
- **Recharts** ist installiert (Gewichts- und Maßverlauf).
- **Backup Version 4** enthält auch `body`.
- Der Kalenderplan für Trainings kommt mit dem Kalenderexport in Phase 7.
- **Zahleneingabe** (`NumberInput`): Textfeld mit Zahlentastatur, Komma oder Punkt, darf beim Tippen leer sein. Beim Verlassen springt sie auf den letzten gültigen Wert zurück.
- **Übungsauswahl** (`ExercisePicker`): Reiter „Muskel“ und „Gerät“ filtern eigene und wger-Übungen, auch ohne Suchwort. Muskelfilter: Hauptgruppe oder ein Hauptmuskel passt (`MUSCLE_GROUP` in `src/config/sport.ts`). Geräte stehen in `EQUIPMENT`. „Maschine“ setzt das wger-Skript, wenn der Name „Maschine“ oder „Machine“ enthält. Eigene Übungen haben ein freiwilliges Feld `equipment` (ohne Index, keine neue Dexie-Version).

### Entscheidungen aus Phase 4a

- **XP** werden nur aus dem Ereignis-Log berechnet (`src/lib/level.ts`). Gesamt-XP fallen nie unter 0.
- **Level** (100 + 20 × (n−1) XP pro Level) wurde in Phase 4b durch Rang + Stufe ersetzt.
- **Attribute** = 10 + 1 Punkt pro 50 XP aus passenden Ereignissen (`ATTRIBUTE_OF`). Bisher: Stärke (Sport) und Willenskraft (Check-in, Tagebuch, Habits).
- **Tägliche Quests** stehen in `src/config/quests.ts`: Check-in, alle Habits (nur wenn es Habits gibt), Training oder Körperdaten, Tagebuch. Erledigt wird aus dem Log gelesen. Sind alle erledigt, gibt es `quests_completed` (+20 XP). Wird danach etwas rückgängig gemacht, wird der Bonus wieder entfernt.
- **Dexie Version 5:** Tabelle `quests` (ein Eintrag pro Tag: `evaluated`, `penalty`). **Backup Version 5** enthält sie.
- **Penalty:** Beim Tageswechsel werden offene Tage ausgewertet, höchstens die letzten 3. Jede verpasste Quest gibt `quest_failed` (−10 XP). Dazu kommt eine Penalty Quest für heute (wechselt täglich). Wird sie abgehakt (`penalty_done`), gibt es den Abzug zurück. Der erste Tag mit dem Levelsystem wird nicht bestraft.
- **Start-Sperre:** `runStartup` läuft nie doppelt gleichzeitig, damit kein Abzug doppelt kommt.
- **Level-Up:** `SystemWatcher` (in `App.tsx`) zeigt beim Aufstieg ein Fenster mit Animation. Nach einem Abzug gibt es beim Wiedererreichen keine zweite Meldung.

### Entscheidungen aus Phase 4b

- **Rang + Stufe statt Level:** Jeder Rang hat 5 Stufen (I–V). Anzeige z. B. „D · III“. XP pro Rang (`RANKS` in `xp.ts`): E 550 (~1 Woche), D 1.500 (~3 Wochen), C 3.500 (~6 Wochen), B 8.000 (~3,5 Monate), A 15.000 (~6 Monate). Bei ~80 XP/Tag dauert es bis S etwa 1 Jahr. S hat endlose Stufen (je 3.000 XP).
- **Rang aus dem Log:** Der Rang ist die Anzahl der `rank_up`-Ereignisse. Er geht nie verloren. Die Stufe wird aus den Gesamt-XP ab Rangbeginn berechnet und kann durch Penalty sinken. XP über Stufe V hinaus bleiben erhalten und zählen im nächsten Rang.
- **Aufstiegsprüfung:** Aufstieg nur bei voller Stufe V **und** 5 Bedingungen (`src/lib/rankExam.ts`, `src/lib/ranks.ts`):
  - 3 Sport: Beim Rangbeginn werden 3 zufällige Übungen aus den aktiven Plänen ausgelost (fehlende werden nachgelost, sobald es Pläne gibt). Startwert = bester Satz (kg × WDH) im letzten Training davor, sonst das erste Training danach. Ziel: bester Satz seit Rangbeginn ≥ Start × (1 + Steigerung). Steigerung: E 5 %, D 7,5 %, C 10 %, B 12,5 %, A 15 %.
  - 2 andere (**vorläufig**, Nutzer legt sie nach Abschluss aller Phasen fest): an X Tagen alle Quests (5/15/30/60/120) und eine Habit-Serie von X Tagen (7/14/30/60/100), jeweils seit Rangbeginn.
- **Dexie Version 6:** Tabelle `ranks` (pro Rang: `startedAt`, `startDay`, `exercises` mit `baseline`). **Backup Version 6** enthält sie.
- **Zusatz-XP:** `quest_streak` (+50 XP) bei jeder 7er-Serie mit allen Quests.
- **Status-Seite** (`/status`, Tipp auf das Rang-Fenster oder über „Mehr“): Rang, Stufe, Gesamt-XP, Attribute, Prüfung mit Fortschritt.
- **Meldungen:** „Stufe auf!“ und „Rangaufstieg!“ (Einstellung `seenStage`).

### Entscheidung: Optik-Varianten (geplant für Phase 8)

- Später gibt es 3 Optiken, umschaltbar in den Einstellungen: **1 Solo Leveling** (jetzt), **2 Apple** (clean), **3 Anime** (bunt).
- Bis dahin: Farben nur über die Variablen in `src/index.css` (`sys-*`), keine festen Farben in Seiten. Aussehen nur in den Bausteinen in `src/components/ui/`.
- Umsetzung: Pro Optik eigene Werte für die Variablen, Bausteine passen sich an. Die Wahl wird lokal gespeichert.

### Entscheidungen aus Phase 4c

- **Bosse** (Tabelle `bosses`, **Dexie Version 7**, **Backup Version 7**): Übung, Zielgewicht, Wiederholungen (Standard 1), Termin. Gezählt wird das höchste Gewicht mit mindestens den Ziel-Wiederholungen aus Trainings **nach** dem Anlegen. Sieg bis einschließlich Termin: `boss_defeated` (+100 XP, Stärke). Danach beim Tageswechsel: `boss_failed` (kein Abzug), „Erneut“ startet ihn mit neuem Termin. „Aufgeben“ löscht einen aktiven Boss. Aktive Bosse stehen auf der Heute-Seite, alles andere auf der Status-Seite.
- **Neuer UI-Baustein:** `DateInput`.
- **Titel:** 106 Erfolge in `src/config/titles.ts`, in Gruppen mit Stufen (Kennzahl + Schwellen + Name). Berechnet nur aus dem Log (`src/lib/titles.ts`). Neue Titel einfach als weitere Stufe oder Gruppe eintragen.
- **Erfolge-Seite** (`/erfolge`, über die Status-Seite): alle Titel nach Kategorie, gesperrte grau mit Hinweis. Ein freigeschalteter Titel kann getragen werden (`activeTitle`) und steht unter dem Rang.
- **Meldungen** laufen über eine Warteschlange im `SystemWatcher`: Stufe, Rang, Boss besiegt, Titel erhalten. Beim ersten Start mit Titeln (`seenTitles` leer) werden bereits verdiente Titel still übernommen.

### Entscheidungen aus Phase 5a

- **Dexie Version 8**, **Backup Version 8**: `foods` (Werte pro 100 g, Barcode, Favorit, letzte Menge), `meals` (Eintrag pro Tag und Mahlzeit, Werte als Kopie, damit alte Tage gleich bleiben), `water` (ml pro Tag), `recipes`.
- **Mahlzeiten:** Frühstück, Mittag, Abend, Snack. Vergangene Tage lassen sich über die Pfeile nachtragen.
- **Suche:** zuerst lokal, dann online bei Open Food Facts (de). Gewählte Treffer werden lokal gespeichert und sind danach offline da. Eigene Lebensmittel möglich. Favoriten (★) stehen in der Auswahl oben.
- **Rezepte:** Name, Zutaten mit Mengen, optional feste Mahlzeit. Antippen fügt alle Zutaten als Gruppe ein. Ohne feste Mahlzeit wird gefragt (gilt nur für den Tag). Mengen am Tag ändern das Rezept nicht.
- **Ziele** (Einstellungen `kcalGoal`, `proteinGoal`, `carbsGoal`, `fatGoal`, `waterGoal`): erreicht, wenn der Wert mindestens so hoch ist.
- **XP** (alle Vitalität): `meal_logged` +2 pro Eintrag bzw. Rezept (max. 5 pro Tag), `water_goal` +5, `protein_goal` +10, `kcal_goal` +10. `syncNutrition` gleicht die Ereignisse eines Tages nach jeder Änderung ab (auch Löschen).
- **Neue Tagesquest** „Ernährung eintragen“, gilt ab dem Tag des Updates (`nutritionSince`), damit alte Tage nicht bestraft werden.
- **Titel:** 16 neue Ernährungs-Titel (jetzt 122).

### Entscheidungen aus Phase 5a (Verbesserungen)

- **Einheit g/ml** pro Lebensmittel (`unit`), Werte pro 100 g bzw. 100 ml. Ab 1.000 ml Anzeige in Litern.
- **Eingebaute Datenbank** `src/data/foods.json` (Skript `scripts/fetch-foods.mjs`, bei Bedarf neu ausführen): Schweizer Nährwertdatenbank (~1.200 Grundlebensmittel, Getränke über die Dichte auf 100 ml umgerechnet) + die ~9.100 meistgescannten Produkte aus Deutschland (Open Food Facts). Wird erst beim Öffnen der Suche geladen und ist offline verfügbar.
- **Suche** mit MiniSearch (`src/lib/foodSearch.ts`): Text wird vereinheitlicht (Umlaute, „1,5 %“ = „1.5“), Wortanfänge, Tippfehler, zusammengesetzte Wörter (z. B. „Vollmilch“ findet „Milch“). Synonyme in `src/config/foodSynonyms.ts`.
- **Online-Suche** über `world.openfoodfacts.org/cgi/search.pl` (alle Sprachen, doppelte Treffer werden ausgeblendet, Zwischenspeicher pro Suchbegriff, 0,7 s Tipp-Pause). `search.openfoodfacts.org` ist schneller, erlaubt aber keine Anfragen aus dem Browser (kein CORS), wird nur im Daten-Skript benutzt. Limit der Suche: ca. 10 Anfragen pro Minute.
- Lokale Suche: Passen nicht alle Wörter, kommen Treffer, bei denen höchstens ein Wort fehlt. Pulver (Whey, Isolat …) zählt immer in g.
- **Rezepte-Seite** `/ernaehrung/rezepte`: Suche, Sortierung A–Z / nach Mahlzeit / zuletzt benutzt (Wahl wird lokal gemerkt). Rezepte werden dem Tag hinzugefügt, der auf der Essen-Seite offen war.

### Entscheidungen aus Phase 5a+ (Kalorienrechner)

- **Ziel-Art** (`goalMode`): Abnehmen / Halten / Zunehmen. Kalorienziel erreicht (XP `kcal_goal`): Abnehmen 80–100 %, Halten 90–110 %, Zunehmen ab 100 %.
- **Rechner** (`/ernaehrung/rechner`, Logik in `src/lib/calorieCalc.ts`): Grundumsatz nach Mifflin-St Jeor × Aktivität (1,2 / 1,375 / 1,55 / 1,725 / 1,9). Tempo pro Woche oder Zielgewicht bis Datum. kcal = Umsatz + Tempo × 7.700 / 7, mindestens 1.500 (Mann) bzw. 1.200 (Frau). Eiweiß 2,0 g/kg (Abnehmen 2,2), Fett 0,9 g/kg, Rest Kohlenhydrate, Wasser 35 ml/kg. Warnung ab 1 % Körpergewicht/Woche Abnahme bzw. 0,5 kg/Woche Zunahme. Gewicht kommt aus den Körperdaten.
- **Plan** in der Einstellung `nutritionPlan` (kommt mit ins Backup).
- **2-Wochen-Prüfung** nach dem Speichern eines Gewichts (`runPlanCheck`): frühestens 14 Tage nach Berechnung/Anpassung/„Nein“. Trendlinie über alle Wiegungen seit der Berechnung (mind. 4, über mind. 11 Tage). Gefragt wird nur, wenn der Trend mehr als 0,25 kg/Woche **und** mehr als die doppelte Messunsicherheit vom Plan abweicht, an mind. 10 Tagen gegessen wurde und der Schnitt höchstens 10 % neben dem Ziel liegt. Neuer Umsatz = Schnitt gegessen − Trend × 7.700 / 7.
- Auf der Essen-Seite: Statuszeile „Ziel · Trend“, Knöpfe „Ziele“ und „Rechner“.

### Entscheidungen aus Phase 5b

- **Barcode-Scan:** neuer UI-Baustein `BarcodeScanner` (`@zxing/browser`, Rückkamera). Suche nach dem Scan: eigene Lebensmittel → eingebaute Datenbank → Produkt-Abruf `world.openfoodfacts.org/api/v2/product/{code}` (eigenes, großzügigeres Limit). Unbekannt oder offline: Formular „Eigenes Lebensmittel“ mit gespeichertem Barcode.
- **Ernährungs-Bosse** (`kind: 'nutrition'` in `bosses`, neue Felder `metric`, `direction`, `days`, `startDay`; keine neue Dexie-Version nötig, da nicht indiziert): „an X Tagen mindestens/höchstens Y kcal“, „… Eiweiß“, „… Wasser“ bis zum Termin. „Mindestens“ zählt sofort, „höchstens“ erst nach Tagesende und nur mit Einträgen. Sieg: `boss_defeated` mit `attr: 'vit'` (Level-Berechnung nimmt `data.attr` vor `ATTRIBUTE_OF`). Niederlage beim Tageswechsel, sobald es nicht mehr zu schaffen ist. Logik in `src/lib/boss.ts`.
- Boss-Prüfung läuft auch bei Änderungen an Essen/Wasser von heute (`useNutritionStamp`).
- Scanner liest im gründlichen Modus (`TRY_HARDER`, auch 90° gedreht), nur EAN/UPC. `Dialog` reagiert nur auf sein eigenes Schließen (sonst schloss der Scanner das Auswahl-Fenster mit). Kamera-Erlaubnis fragt iOS bei Home-Bildschirm-Apps pro Sitzung neu, das lässt sich in der App nicht ändern.

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
- **Links** (Tabelle `links`, Dexie-Version 13, im Daten-JSON): Adresse, Titel (leer → „YouTube-Video“ bzw. Seitenname), Art. Arten für Dateien und Links: Skript, Übung, Notiz, Video, Webseite. YouTube-Erkennung und Vorschaubild (`img.youtube.com`, nur online) in `src/lib/links.ts`.

## 3. Funktionen

### Start: „Heute“-Seite
- Tägliche Quests, heutiges Training, Essen und Wasser, Erinnerungen, Streaks
- Aktueller Rang und Stufe, XP-Balken und Attribute auf einen Blick

### Levelsystem
- **Attribute:** Stärke (Sport), Intelligenz (Uni), Vitalität (Ernährung), Charisma (Hautbild), Willenskraft (Antrieb)
- **Ränge:** E → D → C → B → A → S
- **XP** für erledigte Aktionen in allen Bereichen. Die Werte stehen zentral in einer Datei und sind leicht anpassbar.
- **Tägliche Quests** werden automatisch aus den Bereichen erzeugt. Wer eine verpasst, bekommt eine Penalty Quest oder verliert XP.
- **Boss-Kämpfe** für alle Bereiche, mit Countdown und Extra-XP. Beim Anlegen wählt man die Boss-Art:
  - **Sport:** Zielgewicht bei einer Übung (fertig seit 4c)
  - **Ernährung:** an X Tagen ein Tagesziel schaffen, z. B. „10 × über 2500 kcal in 12 Tagen“ (auch Protein, Wasser)
  - **Uni:** Klausur mit Datum. Sieg, wenn sie nach dem Termin als bestanden (optional mit Wunschnote) eingetragen wird.
  - **Hautbild / Antrieb:** an X Tagen eine Routine oder ein Habit erledigen
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
- Rezepte (ganze Gerichte mit Zutaten und Mengen) per Schnellauswahl

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
   - ~~**3a Training:** Pläne, Training durchführen, Pausentimer, automatische Steigerung, PRs~~ – erledigt.
   - ~~**3b Daten:** Übungsdatenbank (wger-Skript), Körperdaten, Fortschrittsfotos~~ – erledigt.
4. **Levelsystem**
   - ~~**4a:** XP, Level, Ränge, Attribute, Quests, Penalty, Level-Up-Animation~~ – erledigt.
   - ~~**4b:** Ränge mit Stufen, Aufstiegsprüfung, Quest-Serie, Status-Seite~~ – erledigt.
   - ~~**4c:** Bosse (Trainingsziele mit Countdown), 106 Titel und Erfolge~~ – erledigt.
5. **Ernährung**
   - ~~**5a:** Tracker, Suche (Open Food Facts), Wasser, Ziele, Favoriten, Rezepte~~ – erledigt.
   - ~~**5a+:** Kalorienrechner, Ziel-Art (Abnehmen/Halten/Zunehmen), 2-Wochen-Prüfung mit Gewichtstrend~~ – erledigt.
   - ~~**5b:** Barcode-Scan, **Ernährungs-Bosse**~~ – erledigt.
6. **Uni und Hautbild**
   - ~~**6a Uni:** Fächer, To-dos mit Fristen, Lern-Timer, **Klausur-Bosse**~~ – erledigt.
   - **6a+ Fach-Ordner:** ~~Teil 1: Kacheln, Ordner, Dateien~~ – erledigt. ~~Teil 2: Karteikarten~~ – erledigt. ~~Teil 3: Lernzettel, Lernplan~~ – erledigt.
   - **6b Hautbild:** Pflegeroutine morgens/abends, Hautfotos mit Vergleich, **Routine-/Habit-Bosse**
7. **Erinnerungen und Auswertung:** Kalenderexport, Zusammenhänge, Wochenrückblick, Statistiken
8. **Optik-Varianten:** Umschalter in den Einstellungen, Variante 2 (Apple-Style), Variante 3 (Anime-Style)

(Die frühere Phase 8 „Veröffentlichen“ ist in Phase 1 aufgegangen.)

### Modell pro Phase
- **Opus** für alle Phasen und Änderungen.
- **Sonnet** nur, wenn es für eine bestimmte Aufgabe nachweislich besser ist als Opus.

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
