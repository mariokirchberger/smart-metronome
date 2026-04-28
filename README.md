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

**Betonter erster Schlag**
Die erste Zählzeit eines Taktes erklingt mit einem höheren Ton (1000 Hz) und wird rot hervorgehoben. Alle anderen Schläge erklingen mit einem tieferen Ton (600 Hz) und werden blau hervorgehoben.

**Visuelle Taktanzeige**
Für jeden Schlag des Taktes wird ein Kreis angezeigt. Der aktuell gespielte Schlag leuchtet auf und wird kurz vergrößert dargestellt.

**Tap Tempo**
Über den Tap-Button (oder die Taste `T`) kann das Tempo durch Antippen ermittelt werden. Der Durchschnitt der letzten 8 Taps wird als BPM übernommen. Eine Pause von mehr als 2 Sekunden setzt die Messung zurück.

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

### Analyse-Modus

Im Reiter **Analyse** können Songs mit ihrem BPM-Wert gespeichert und direkt auf das Metronom übertragen werden.

**BPM-Suche**
Über die Felder Interpret und Titel wird ein Song in der GetSongBPM-Datenbank gesucht. Das Ergebnis kann mit „Bestätigen & Speichern" in die lokale Liste übernommen oder direkt im Metronom verwendet werden. Voraussetzung: API-Key in `config.json` (siehe Einrichtung).

**Manuell hinzufügen**
Über den Button „Manuell hinzufügen" lassen sich Interpret, Titel und BPM direkt eingeben und zur Liste hinzufügen – ohne API-Suche.

**Song-Liste**
Die gespeicherten Songs werden in einer durchsuchbaren Liste angezeigt. Ein Klick auf einen Eintrag übernimmt den BPM-Wert sofort in das Metronom. Einträge können einzeln gelöscht werden.

---

### Lautstärke

Unterhalb der Tabs befinden sich zwei Lautstärkeregler, die in beiden Modi aktiv sind:

- **Akzent** – Lautstärke der ersten Zählzeit (betonter Schlag)
- **Normal** – Lautstärke aller weiteren Schläge

Die Regler wirken sofort, auch während das Metronom läuft.

---

## Technologie

| Schicht | Technologie |
|---|---|
| Backend / Server | Python 3, Flask |
| Frontend | HTML, CSS, JavaScript |
| Audioausgabe | Web Audio API |
| BPM-Datenbank | [GetSongBPM](https://getsongbpm.com) — [getsongbpm.com](https://getsongbpm.com) |

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

## Einrichtung (optional: BPM-Suche)

Für die automatische BPM-Suche im Analyse-Tab wird ein kostenloser API-Key von [getsongbpm.com/api](https://getsongbpm.com/api) benötigt.

Den erhaltenen Key in `config.json` eintragen:

```json
{
  "getsongbpm_api_key": "DEIN_KEY_HIER"
}
```

Ohne API-Key funktioniert die manuelle Eingabe im Analyse-Tab weiterhin vollständig.

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
├── config.json          # Konfiguration (API-Key)
├── requirements.txt     # Python-Abhängigkeiten
├── start.bat            # Schnellstart (Windows)
├── static/
│   ├── metronome.js     # Metronom-Logik und Web Audio API
│   └── style.css        # Styling
└── templates/
    └── index.html       # Frontend
```

## Credits

BPM data powered by [GetSongBPM](https://getsongbpm.com) — [getsongbpm.com](https://getsongbpm.com)

## Lizenz

MIT
