# Smart Metronome

Ein browserbasiertes Metronom, entwickelt mit Python (Flask) und Web Audio API.

## Funktionen

### Metronom-Modus

**Play / Pause**
Das Metronom wird über den Play-Button gestartet und gestoppt. Alternativ kann die Leertaste verwendet werden.

**BPM (Beats per Minute)**
Das Tempo wird über ein Eingabefeld eingestellt. Zusätzlich gibt es `−`- und `+`-Buttons, um den Wert schrittweise anzupassen. Gültige Werte: 20–300 BPM.

**Taktart**
Die Taktart wird durch zwei separate Eingaben definiert:
- Die obere Zahl (Zähler) gibt an, wie viele Schläge ein Takt enthält (z. B. `4` für vier Schläge pro Takt).
- Die untere Zahl (Nenner) gibt den Notenwert jedes Schlags an und wird als Auswahlfeld angeboten (1, 2, 4, 8, 16). Eine `4` steht für Viertelnoten, eine `8` für Achtelnoten usw.

Beispiele: 4/4 (vier Viertelschläge), 3/4 (Walzer), 6/8 (sechs Achtelschläge).

**Visuelle Taktanzeige & Schläge stummschalten**
Für jeden Schlag des Taktes wird ein Kreis angezeigt. Der aktuell gespielte Schlag leuchtet auf und wird kurz vergrößert dargestellt. Ein Klick auf einen Kreis schaltet den zugehörigen Schlag stumm – er blinkt weiterhin zur Orientierung, produziert aber keinen Ton. Ein weiterer Klick hebt die Stummschaltung wieder auf. Beim Ändern der Taktart werden alle Stummschaltungen zurückgesetzt.

**Tap Tempo**
Über den Tap-Button (oder die Taste `T`) kann das Tempo durch Antippen ermittelt werden. Der Durchschnitt der letzten 8 Taps wird als BPM übernommen. Eine Pause von mehr als 2 Sekunden setzt die Messung zurück.

**Unterteilungen**
Unter den Taktart-Controls lässt sich eine Unterteilung wählen:

| Option | Wirkung |
|---|---|
| 1/4 | Nur Hauptschläge (Standard) |
| 1/8 | Zusätzlich ein Zwischenschlag pro Viertelschlag |
| Triolen | Zwei gleichmäßige Zwischenschläge pro Viertelschlag |
| 1/16 | Drei gleichmäßige Zwischenschläge pro Viertelschlag |

Die Unterteilungsklicks werden exakt per Web Audio API getimed. Stummgeschaltete Schläge unterdrücken auch ihre zugehörigen Unterteilungen.

**Akzent betonen**
Ist diese Checkbox aktiviert (Standard), erklingt der erste Schlag eines Taktes mit 1000 Hz als Akzent. Deaktiviert klingt Beat 1 wie alle anderen Schläge (600 Hz, Normal-Lautstärke).

**Viertelnoten betonen** *(nur bei Unterteilung > 1/4)*
Ist diese Checkbox aktiviert (Standard), klingen Unterteilungsklicks klanglich anders als die Hauptschläge (800 Hz, eigene Lautstärke). Deaktiviert klingen alle Klicks gleich (600 Hz, Normal-Lautstärke) – der Subdiv-Lautstärkeregler wird dabei deaktiviert.

---

### Dynamik-Modus

Im Reiter **Dynamik** kann das Metronom so konfiguriert werden, dass es das Tempo automatisch schrittweise steigert – nützlich für gezieltes Üben mit langsamer Temposteigerung.

**Starttempo**
Das BPM-Tempo, mit dem das Metronom beim Drücken von Play beginnt.

**Zieltempo**
Das BPM-Tempo, bei dessen Erreichen (oder Überschreiten) das Metronom automatisch wieder auf das Starttempo zurückspringt und den Zyklus neu beginnt. Das Metronom läuft damit kontinuierlich, bis Pause gedrückt wird.

**Modus: Wiederholungen**
Anzahl der Takte, die bei einem bestimmten Tempo gespielt werden, bevor die nächste Temposteigerung stattfindet.

**Modus: Zeit**
Anzahl der Sekunden, nach denen das Tempo automatisch erhöht wird.

**BPM Anpassung**
Der Wert, um den das Tempo nach jeder Gruppe erhöht wird.

**Beispiel:** Starttempo 80, Zieltempo 120, Wiederholungen 4, BPM Anpassung 5 → Das Metronom spielt jeweils 4 Takte bei 80, 85, 90, 95, 100, 105, 110, 115 BPM, springt bei 120 zurück auf 80 und beginnt erneut.

**Statusanzeige**
Während des Spielens zeigt der Dynamik-Tab das aktuelle Tempo sowie den Fortschritt der aktuellen Wiederholungsgruppe (z. B. „2 / 4") in Echtzeit an.

---

### Songs

Im Reiter **Songs** können Songs mit ihrem BPM-Wert gespeichert und direkt auf das Metronom übertragen werden.

**Aktuelle Anzeige**
Oben im Tab wird stets der zuletzt geladene Interpret, Titel und BPM-Wert angezeigt, damit beim Durchsuchen der Liste immer erkennbar ist, was das Metronom gerade verwendet.

**Song hinzufügen**
Über den Button „Manuell hinzufügen" lassen sich Interpret, Titel und BPM direkt eingeben und zur Liste hinzufügen.

**Song-Liste**
Die gespeicherten Songs werden in einer durchsuchbaren Liste angezeigt. Ein Klick auf einen Eintrag übernimmt den BPM-Wert ins Metronom und aktualisiert die Aktuelle Anzeige. Einträge können einzeln gelöscht werden.

---

### Lautstärke

Unterhalb der Tabs befinden sich Lautstärkeregler, die in allen Modi aktiv sind:

- **Akzent** – Lautstärke der ersten Zählzeit
- **Normal** – Lautstärke aller weiteren Hauptschläge
- **Subdiv** – Lautstärke der Unterteilungsklicks (nur aktiv wenn Unterteilung > 1/4 und „Viertelnoten betonen" eingeschaltet)

Die Regler wirken sofort, auch während das Metronom läuft.

---

## Technologie

| Schicht | Technologie |
|---|---|
| Backend / Server | Python 3, Flask |
| Frontend | HTML, CSS, JavaScript |
| Audioausgabe | Web Audio API |

## Voraussetzungen

- Python 3.10 oder neuer
- pip

## Installation

```bash
# Repository klonen
git clone https://github.com/mariokirchberger/smart-metronome.git
cd smart-metronome

# Virtuelle Umgebung erstellen und aktivieren
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS / Linux:
source .venv/bin/activate

# Abhängigkeiten installieren
pip install -r requirements.txt
```

## Starten

**Windows – Doppelklick:**
```
start.bat
```

**Manuell:**
```bash
python app.py
```

Anschließend die App im Browser öffnen: [http://localhost:5000](http://localhost:5000)

## Projektstruktur

```
smart-metronome/
├── app.py               # Flask-Server und API-Endpunkte
├── requirements.txt     # Python-Abhängigkeiten
├── songs.json           # Gespeicherte Songs (wird automatisch erstellt)
├── start.bat            # Schnellstart (Windows)
├── static/
│   ├── metronome.js     # Metronom-Logik und Web Audio API
│   └── style.css        # Styling
└── templates/
    └── index.html       # Frontend
```

## Lizenz

MIT
