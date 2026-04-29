import os
import json
import uuid
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)
SONGS_FILE  = 'songs.json'

# ── Persistence ────────────────────────────────────────────────────────────

def load_songs():
    if os.path.exists(SONGS_FILE):
        with open(SONGS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []

def save_songs(songs):
    with open(SONGS_FILE, 'w', encoding='utf-8') as f:
        json.dump(songs, f, indent=2, ensure_ascii=False)

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


if __name__ == '__main__':
    app.run(debug=True, threaded=True)
