import express from "express";
import dotenv from "dotenv";
import { google } from "googleapis";
import fetch from "node-fetch";

dotenv.config();

const app = express();
app.use(express.static("public"));

// --- 🧩 YOUTUBE AUTH --- //
const youtubeOAuth2 = new google.auth.OAuth2(
  process.env.YOUTUBE_CLIENT_ID,
  process.env.YOUTUBE_CLIENT_SECRET,
  process.env.YOUTUBE_REDIRECT_URI
);
let youtubeTokens = null;

// --- 🎧 SPOTIFY AUTH --- //
let spotifyTokens = null;

// Root route
app.get("/", (req, res) => {
  res.sendFile("index.html", { root: "public" });
});

// ✅ LOGIN TO YOUTUBE
app.get("/login/youtube", (req, res) => {
  const scopes = ["https://www.googleapis.com/auth/youtube"];
  const url = youtubeOAuth2.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
  });
  res.redirect(url);
});

// ✅ YOUTUBE CALLBACK
app.get("/oauth2callback", async (req, res) => {
  try {
    const { code } = req.query;
    const { tokens } = await youtubeOAuth2.getToken(code);
    youtubeTokens = tokens;
    youtubeOAuth2.setCredentials(tokens);
    res.send("✅ YouTube authenticated! You can close this tab.");
  } catch (err) {
    console.error("YouTube OAuth error:", err);
    res.status(500).send("YouTube authentication failed.");
  }
});

// ✅ LOGIN TO SPOTIFY
app.get("/login/spotify", (req, res) => {
  const scopes = "playlist-modify-public playlist-modify-private";
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.SPOTIFY_CLIENT_ID,
    scope: scopes,
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
  });
  res.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
});

// ✅ SPOTIFY CALLBACK
app.get("/spotify_callback", async (req, res) => {
  try {
    const { code } = req.query;
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
    });

    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(
            `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
          ).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const data = await response.json();
    spotifyTokens = data;
    res.send("✅ Spotify authenticated! You can close this tab.");
  } catch (err) {
    console.error("Spotify OAuth error:", err);
    res.status(500).send("Spotify authentication failed.");
  }
});

// 🎵 ADD TRACK TO BOTH PLATFORMS
app.get("/add", async (req, res) => {
  const spotifyUrl = req.query.track;
  if (!spotifyUrl) return res.status(400).send("Missing ?track=<spotify_url>");

  try {
    const trackId = spotifyUrl.split("/track/")[1]?.split("?")[0];
    if (!trackId) throw new Error("Invalid Spotify track URL");

    const spotifyTrackRes = await fetch(
      `https://api.spotify.com/v1/tracks/${trackId}`,
      {
        headers: {
          Authorization: `Bearer ${spotifyTokens?.access_token}`,
        },
      }
    );

    const trackData = await spotifyTrackRes.json();
    const songTitle = trackData.name;
    const artist = trackData.artists?.[0]?.name;
    const searchQuery = `${songTitle} ${artist}`;

    const youtube = google.youtube({ version: "v3", auth: youtubeOAuth2 });
    const ytSearch = await youtube.search.list({
      q: searchQuery,
      part: "snippet",
      maxResults: 1,
      type: "video",
    });

    if (!ytSearch.data.items.length)
      throw new Error("No YouTube video found for this track");

    const videoId = ytSearch.data.items[0].id.videoId;

    await youtube.playlistItems.insert({
      part: "snippet",
      requestBody: {
        snippet: {
          playlistId: process.env.YOUTUBE_PLAYLIST_ID,
          resourceId: {
            kind: "youtube#video",
            videoId: videoId,
          },
        },
      },
    });

    await fetch(
      `https://api.spotify.com/v1/playlists/${process.env.SPOTIFY_PLAYLIST_ID}/tracks`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${spotifyTokens?.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ uris: [`spotify:track:${trackId}`] }),
      }
    );

    res.send(`🎶 Added "${songTitle}" by ${artist} to both playlists!`);
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).send("Failed to add track.");
  }
});

// ✅ Export handler for Vercel
export default app;
export const config = {
  api: {
    bodyParser: false,
  },
};
