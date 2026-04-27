import os
import json
import uuid
import requests as http
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)
SONGS_FILE   = 'songs.json'
CONFIG_FILE  = 'config.json'

# ── Persistence ────────────────────────────────────────────────────────────

def load_songs():
    if os.path.exists(SONGS_FILE):
        with open(SONGS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []

def save_songs(songs):
    with open(SONGS_FILE, 'w', encoding='utf-8') as f:
        json.dump(songs, f, indent=2, ensure_ascii=False)

def load_config():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

# ── GetSongBPM ─────────────────────────────────────────────────────────────

def _search_getsongbpm(artist, title):
    cfg = load_config()
    api_key = cfg.get('getsongbpm_api_key', '').strip()
    if not api_key:
        raise ValueError(
            'GetSongBPM API nicht konfiguriert. '
            'Bitte api_key in config.json eintragen.'
        )
    lookup = f'{artist} {title}'
    resp = http.get(
        'https://api.getsongbpm.com/search/',
        params={'api_key': api_key, 'type': 'both', 'lookup': lookup},
        timeout=10,
    )
    resp.raise_for_status()
    results = resp.json().get('search', [])
    if not results:
        return None
    hit = results[0]
    tempo = hit.get('tempo', '0') or '0'
    bpm = int(round(float(tempo)))
    return {
        'artist': hit.get('artist', {}).get('name', artist),
        'title':  hit.get('title', title),
        'bpm':    bpm,
    }

# ── Routes ─────────────────────────────────────────────────────────────────

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/songs')
def get_songs():
    return jsonify(load_songs())

@app.route('/api/songs', methods=['POST'])
def save_song():
    data   = request.json or {}
    artist = data.get('artist', '').strip()
    title  = data.get('title', '').strip()
    bpm    = data.get('bpm')
    if not artist or not title or not bpm:
        return jsonify({'error': 'artist, title und bpm sind erforderlich.'}), 400
    song = {
        'id':         str(uuid.uuid4()),
        'artist':     artist,
        'title':      title,
        'full_title': f'{artist} - {title}',
        'bpm':        int(bpm),
    }
    songs = load_songs()
    songs.append(song)
    save_songs(songs)
    return jsonify(song)

@app.route('/api/songs/<song_id>', methods=['DELETE'])
def delete_song(song_id):
    songs = [s for s in load_songs() if s.get('id') != song_id]
    save_songs(songs)
    return jsonify({'ok': True})

@app.route('/api/search')
def search():
    artist = request.args.get('artist', '').strip()
    title  = request.args.get('title', '').strip()
    if not artist or not title:
        return jsonify({'error': 'Interpret und Titel sind erforderlich.'}), 400

    # Check local list first (case-insensitive)
    for song in load_songs():
        if (song.get('artist', '').lower() == artist.lower() and
                song.get('title', '').lower() == title.lower()):
            return jsonify({**song, 'source': 'list'})

    # Query GetSongBPM
    try:
        result = _search_getsongbpm(artist, title)
    except ValueError as e:
        return jsonify({'error': str(e)}), 503
    except Exception as e:
        return jsonify({'error': str(e)}), 500

    if not result:
        return jsonify({'error': f'„{artist} – {title}" wurde nicht gefunden.'}), 404

    return jsonify({**result, 'source': 'getsongbpm'})


if __name__ == '__main__':
    app.run(debug=True, threaded=True)
