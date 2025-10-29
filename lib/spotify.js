// lib/spotify.js
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const SPOTIFY_BASE_URL = "https://api.spotify.com/v1";

// 🔑 Get access token (make sure this function works in your setup)
async function getAccessToken() {
  const res = await fetch("https://accounts.spotify.com/api/token", {
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
      grant_type: "refresh_token",
      refresh_token: process.env.SPOTIFY_REFRESH_TOKEN,
    }),
  });

  const data = await res.json();
  return data.access_token;
}

// 🟢 Add Spotify track to your playlist & return full metadata
export async function addSpotifySong(url) {
  const accessToken = await getAccessToken();
  const trackId = url.split("/track/")[1].split("?")[0];
  const playlistId = process.env.SPOTIFY_PLAYLIST_ID;

  // ✅ Fetch track metadata
  const trackRes = await fetch(`${SPOTIFY_BASE_URL}/tracks/${trackId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const trackData = await trackRes.json();

  // ✅ Add track to playlist
  const addRes = await fetch(`${SPOTIFY_BASE_URL}/playlists/${playlistId}/tracks`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ uris: [`spotify:track:${trackId}`] }),
  });

  const addData = await addRes.json();

  // ✅ Return complete info
  return {
    snapshot_id: addData.snapshot_id,
    name: trackData.name,
    artist: trackData.artists?.[0]?.name || "Unknown Artist",
    album: trackData.album?.name || "Unknown Album",
  };
}

// 🧠 Search and add song on Spotify
export async function searchAndAddSpotifySong(query) {
  const accessToken = await getAccessToken();
  const playlistId = process.env.SPOTIFY_PLAYLIST_ID;

  const searchRes = await fetch(
    `${SPOTIFY_BASE_URL}/search?q=${encodeURIComponent(query)}&type=track&limit=1`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const searchData = await searchRes.json();
  const track = searchData.tracks?.items?.[0];
  if (!track) return { error: "No Spotify match found" };

  const addRes = await fetch(`${SPOTIFY_BASE_URL}/playlists/${playlistId}/tracks`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ uris: [`spotify:track:${track.id}`] }),
  });

  const addData = await addRes.json();

  return {
    snapshot_id: addData.snapshot_id,
    name: track.name,
    artist: track.artists?.[0]?.name,
    album: track.album?.name,
  };
}
