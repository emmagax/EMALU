import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

export async function addYoutubeSong(videoId) {
  try {
    const accessToken = process.env.YOUTUBE_ACCESS_TOKEN;
    const playlistId = process.env.YOUTUBE_PLAYLIST_ID;

    // If input is a full YouTube URL, extract video ID
    const match = videoId.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    const id = match ? match[1] : videoId;

    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          snippet: {
            playlistId,
            resourceId: {
              kind: "youtube#video",
              videoId: id,
            },
          },
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(JSON.stringify(data));
    }

    console.log("✅ Added to YouTube:", data);
    return { title: "Linked from Spotify", id };
  } catch (err) {
    console.error("❌ YouTube Add Error:", err);
    throw err;
  }
}
