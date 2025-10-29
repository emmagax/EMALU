from ytmusicapi import YTMusic

try:
    yt = YTMusic("headers.json")
    playlists = yt.get_library_playlists()
    print("✅ Authenticated! Here are your playlists:")
    for p in playlists:
        print(f"- {p['title']} ({p['playlistId']})")
except Exception as e:
    print("❌ Error:", e)
