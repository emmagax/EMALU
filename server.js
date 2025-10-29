// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";
import { addSpotifySong, searchAndAddSpotifySong } from "./lib/spotify.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Helper to extract YouTube video ID
function extractYouTubeId(url) {
  try {
    if (url.includes("youtu.be")) return url.split("youtu.be/")[1].split("?")[0];
    if (url.includes("v=")) return new URL(url).searchParams.get("v");
  } catch {
    return null;
  }
  return null;
}

// Add route
app.post("/add", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "Missing URL" });

  try {
    let spotifyResult = null;
    let youtubeResult = null;

    // --- If user pasted a Spotify song ---
    if (url.includes("spotify.com/track")) {
      console.log("🎧 Detected Spotify URL");
      spotifyResult = await addSpotifySong(url);
      console.log("🎵 Spotify track info:", spotifyResult);


    // Ensure proper Spotify metadata
const trackName =
  spotifyResult?.name ||
  spotifyResult?.track?.name ||
  spotifyResult?.title ||
  "";
const artistName =
  spotifyResult?.artists?.[0]?.name ||
  spotifyResult?.artist ||
  spotifyResult?.track?.artists?.[0]?.name ||
  "";
const albumName =
  spotifyResult?.album?.name ||
  spotifyResult?.track?.album?.name ||
  spotifyResult?.album_name ||
  "";

// Construct YouTube search query
const searchQuery = [trackName, artistName, albumName]
  .filter(Boolean)
  .join(" ")
  .trim();


console.log("🔍 YouTube search query:", searchQuery);





      const ytRes = await fetch("http://127.0.0.1:5000/ytmusic/search_add", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    playlistId: process.env.YOUTUBE_PLAYLIST_ID,
    query: searchQuery,
  }),
});

    youtubeResult = await ytRes.json();
    }

    // --- If user pasted a YouTube Music link ---
    else if (url.includes("youtube.com") || url.includes("youtu.be")) {
      console.log("📺 Detected YouTube URL");
      const videoId = extractYouTubeId(url);
      if (!videoId) throw new Error("Invalid YouTube URL");

      // Add to YTMusic playlist
      const ytRes = await fetch("http://127.0.0.1:5000/ytmusic/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playlistId: process.env.YOUTUBE_PLAYLIST_ID,
          videoId,
        }),
      });
      youtubeResult = await ytRes.json();

      // Search same song title on Spotify
      const title = youtubeResult?.title || "Unknown";
      spotifyResult = await searchAndAddSpotifySong(title);
    } else {
      throw new Error("Invalid URL type");
    }

    res.json({
      success: true,
      message: "✅ Added to both Spotify and YouTube Music!",
      spotify: spotifyResult,
      youtube: youtubeResult,
    });
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () =>
  console.log("✅ Unified server running on http://localhost:3000")
);
