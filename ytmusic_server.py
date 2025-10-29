from flask import Flask, request, jsonify
from ytmusicapi import YTMusic

app = Flask(__name__)
ytmusic = YTMusic("headers.json")

@app.route("/ytmusic/search_add", methods=["POST"])
def search_and_add():
    data = request.json
    print("📩 Incoming JSON:", data)  # 👈 Add this line to log all requests

    playlist_id = data.get("playlistId")
    query = data.get("query")

    if not playlist_id or not query:
        return jsonify({"error": "Missing playlistId or query"}), 400

    try:
        search_results = ytmusic.search(query, filter="songs")
        if not search_results:
            return jsonify({"error": "No results found"}), 404

        best = search_results[0]
        video_id = best.get("videoId")
        title = best.get("title")
        artist = best["artists"][0]["name"] if best.get("artists") else "Unknown"
        album = best["album"]["name"] if best.get("album") else "Unknown"

        ytmusic.add_playlist_items(playlist_id, [video_id])

        return jsonify({
            "success": True,
            "message": f"✅ Added '{title}' by {artist} to YouTube Music!",
            "videoId": video_id,
            "title": title,
            "artist": artist,
            "album": album
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
