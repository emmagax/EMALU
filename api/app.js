import express from "express";
import dotenv from "dotenv";
import { google } from "googleapis";

dotenv.config();

const app = express();

// ✅ Serve frontend files from /public
app.use(express.static("public"));

// ✅ Root route serves index.html
app.get("/", (req, res) => {
  res.sendFile("index.html", { root: "public" });
});

// --- example route for testing ---
app.get("/api/test", (req, res) => {
  res.json({ status: "Server is running 🚀" });
});

// --- 🧩 YOUTUBE AUTH --- //
const youtubeOAuth2 = new google.auth.OAuth2(
  process.env.YOUTUBE_CLIENT_ID,
  process.env.YOUTUBE_CLIENT_SECRET,
  process.env.YOUTUBE_REDIRECT_URI
);
let youtubeTokens = null;

// --- 🎧 SPOTIFY AUTH --- //
let spotifyTokens = null;

// ✅ LOGIN TO YOUTUBE
app.get("/api/login/youtube", (req, res) => {
  const scopes = ["https://www.googleapis.com/auth/youtube"];
  const url = youtubeOAuth2.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
  });
  res.redirect(url);
});

// ✅ YOUTUBE CALLBACK
app.get("/api/oauth2callback", async (req, res) => {
  const { code } = req.query;
  const { tokens } = await youtubeOAuth2.getToken(code);
  youtubeTokens = tokens;
  youtubeOAuth2.setCredentials(tokens);
  res.send("✅ YouTube authenticated! You can close this tab.");
});

// ✅ LOGIN TO SPOTIFY
app.get("/api/login/spotify", (req, res) => {
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
app.get("/api/spotify_callback", async (req, res) => {
  const { code } = req.query;
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(
          process.env.SPOTIFY_CLIENT_ID + ":" + process.env.SPOTIFY_CLIENT_SECRET
        ).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
    }),
  });

  const data = await response.json();
  spotifyTokens = data;
  res.send("✅ Spotify authenticated! You can close this tab.");
});

// 🎵 ADD TRACK TO BOTH PLAYLISTS
app.get("/api/add", async (req, res) => {
  const spotifyUrl = req.query.track;
  if (!spotifyUrl) return res.status(400).send("Missing ?track=<spotify_url>");

  try {
    const trackId = spotifyUrl.split("/track/")[1].split("?")[0];
    const spotifyTrackRes = await fetch(
      `https://api.spotify.com/v1/tracks/${trackId}`,
      {
        headers: { Authorization: `Bearer ${spotifyTokens.access_token}` },
      }
    );
    const trackData = await spotifyTrackRes.json();

    const songTitle = trackData.name;
    const artist = trackData.artists[0].name;
    const searchQuery = `${songTitle} ${artist}`;

    const youtube = google.youtube({ version: "v3", auth: youtubeOAuth2 });
    const ytSearch = await youtube.search.list({
      q: searchQuery,
      part: "snippet",
      maxResults: 1,
      type: "video",
    });

    const videoId = ytSearch.data.items[0].id.videoId;

    await youtube.playlistItems.insert({
      part: "snippet",
      requestBody: {
        snippet: {
          playlistId: process.env.YOUTUBE_PLAYLIST_ID,
          resourceId: { kind: "youtube#video", videoId },
        },
      },
    });

    await fetch(
      `https://api.spotify.com/v1/playlists/${process.env.SPOTIFY_PLAYLIST_ID}/tracks`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${spotifyTokens.access_token}`,
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

export default app;
