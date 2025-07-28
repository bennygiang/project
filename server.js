const express = require('express');
const axios = require('axios');
const querystring = require('querystring');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const bodyParser = require('body-parser');
const cron = require('node-cron');
const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');
const csvParser = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static('public'));

// Spotify API configuration
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;

// Soulseek configuration
const SOULSEEK_USERNAME = process.env.SOULSEEK_USERNAME;
const SOULSEEK_PASSWORD = process.env.SOULSEEK_PASSWORD;
const DOWNLOAD_PATH = process.env.DOWNLOAD_PATH || './downloads';
const PREFERRED_FORMAT = process.env.PREFERRED_FORMAT || 'flac';
const SLDL_PATH = process.env.SLDL_PATH || 'sldl';

// In-memory storage (in production, use a database)
let userSessions = {};
let trackedPlaylists = {};
let downloadQueue = [];
let downloadHistory = [];

// Ensure download directory exists
fs.ensureDirSync(DOWNLOAD_PATH);

// Utility functions
const generateRandomString = (length) => {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let text = '';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

const getSpotifyToken = async (code) => {
  const authOptions = {
    method: 'POST',
    url: 'https://accounts.spotify.com/api/token',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    data: querystring.stringify({
      code: code,
      redirect_uri: SPOTIFY_REDIRECT_URI,
      grant_type: 'authorization_code'
    })
  };

  try {
    const response = await axios(authOptions);
    return response.data;
  } catch (error) {
    console.error('Error getting Spotify token:', error.response?.data || error.message);
    throw error;
  }
};

const refreshSpotifyToken = async (refresh_token) => {
  const authOptions = {
    method: 'POST',
    url: 'https://accounts.spotify.com/api/token',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    data: querystring.stringify({
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    })
  };

  try {
    const response = await axios(authOptions);
    return response.data;
  } catch (error) {
    console.error('Error refreshing Spotify token:', error.response?.data || error.message);
    throw error;
  }
};

const getSpotifyPlaylistTracks = async (playlistId, accessToken) => {
  try {
    const response = await axios.get(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    return response.data.items;
  } catch (error) {
    console.error('Error fetching playlist tracks:', error.response?.data || error.message);
    throw error;
  }
};

const downloadTrackViaSoulseek = async (track) => {
  return new Promise((resolve, reject) => {
    const artist = track.track.artists[0].name;
    const title = track.track.name;
    const searchQuery = `${artist} - ${title}`;
    
    console.log(`Downloading: ${searchQuery}`);
    
    const sldlArgs = [
      searchQuery,
      '--user', SOULSEEK_USERNAME,
      '--pass', SOULSEEK_PASSWORD,
      '--path', DOWNLOAD_PATH,
      '--pref-format', PREFERRED_FORMAT,
      '--name-format', '{artist} - {title}',
      '--fast-search'
    ];

    const sldlProcess = spawn(SLDL_PATH, sldlArgs);
    
    let output = '';
    let errorOutput = '';
    
    sldlProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    sldlProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    sldlProcess.on('close', (code) => {
      if (code === 0) {
        console.log(`Successfully downloaded: ${searchQuery}`);
        resolve({ success: true, track: searchQuery, output });
      } else {
        console.error(`Failed to download: ${searchQuery}. Exit code: ${code}`);
        console.error('Error output:', errorOutput);
        resolve({ success: false, track: searchQuery, error: errorOutput });
      }
    });
    
    sldlProcess.on('error', (error) => {
      console.error(`Error spawning sldl process: ${error.message}`);
      reject(error);
    });
  });
};

const processDownloadQueue = async () => {
  if (downloadQueue.length === 0) return;
  
  console.log(`Processing ${downloadQueue.length} tracks in download queue...`);
  
  for (const track of downloadQueue) {
    try {
      const result = await downloadTrackViaSoulseek(track);
      downloadHistory.push({
        ...result,
        timestamp: new Date(),
        trackId: track.track.id
      });
    } catch (error) {
      console.error('Error downloading track:', error);
      downloadHistory.push({
        success: false,
        track: `${track.track.artists[0].name} - ${track.track.name}`,
        error: error.message,
        timestamp: new Date(),
        trackId: track.track.id
      });
    }
  }
  
  downloadQueue = [];
};

const checkForNewTracks = async () => {
  console.log('Checking for new tracks in monitored playlists...');
  
  for (const [playlistId, playlistData] of Object.entries(trackedPlaylists)) {
    try {
      // Refresh token if needed
      let accessToken = playlistData.accessToken;
      if (playlistData.tokenExpiry < Date.now()) {
        const tokenData = await refreshSpotifyToken(playlistData.refreshToken);
        accessToken = tokenData.access_token;
        playlistData.accessToken = accessToken;
        playlistData.tokenExpiry = Date.now() + (tokenData.expires_in * 1000);
      }
      
      const currentTracks = await getSpotifyPlaylistTracks(playlistId, accessToken);
      const currentTrackIds = new Set(currentTracks.map(item => item.track.id));
      const previousTrackIds = new Set(playlistData.trackIds || []);
      
      // Find new tracks
      const newTracks = currentTracks.filter(item => !previousTrackIds.has(item.track.id));
      
      if (newTracks.length > 0) {
        console.log(`Found ${newTracks.length} new tracks in playlist ${playlistId}`);
        downloadQueue.push(...newTracks);
        playlistData.trackIds = Array.from(currentTrackIds);
      }
      
    } catch (error) {
      console.error(`Error checking playlist ${playlistId}:`, error.message);
    }
  }
  
  if (downloadQueue.length > 0) {
    await processDownloadQueue();
  }
};

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
  const state = generateRandomString(16);
  const scope = 'playlist-read-private playlist-read-collaborative';
  
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: SPOTIFY_CLIENT_ID,
      scope: scope,
      redirect_uri: SPOTIFY_REDIRECT_URI,
      state: state
    }));
});

app.get('/callback', async (req, res) => {
  const code = req.query.code || null;
  const state = req.query.state || null;
  
  if (state === null) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    try {
      const tokenData = await getSpotifyToken(code);
      const sessionId = generateRandomString(32);
      
      userSessions[sessionId] = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenExpiry: Date.now() + (tokenData.expires_in * 1000)
      };
      
      res.cookie('session_id', sessionId);
      res.redirect('/dashboard');
    } catch (error) {
      res.redirect('/#' +
        querystring.stringify({
          error: 'invalid_token'
        }));
    }
  }
});

app.get('/dashboard', (req, res) => {
  const sessionId = req.cookies.session_id;
  if (!sessionId || !userSessions[sessionId]) {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/api/playlists', async (req, res) => {
  const sessionId = req.cookies.session_id;
  if (!sessionId || !userSessions[sessionId]) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    let session = userSessions[sessionId];
    
    // Check if token needs refresh
    if (session.tokenExpiry < Date.now()) {
      const tokenData = await refreshSpotifyToken(session.refreshToken);
      session.accessToken = tokenData.access_token;
      session.tokenExpiry = Date.now() + (tokenData.expires_in * 1000);
    }
    
    const response = await axios.get('https://api.spotify.com/v1/me/playlists', {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`
      }
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching playlists:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch playlists' });
  }
});

app.post('/api/track-playlist', async (req, res) => {
  const sessionId = req.cookies.session_id;
  if (!sessionId || !userSessions[sessionId]) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const { playlistId } = req.body;
  if (!playlistId) {
    return res.status(400).json({ error: 'Playlist ID is required' });
  }
  
  try {
    const session = userSessions[sessionId];
    const tracks = await getSpotifyPlaylistTracks(playlistId, session.accessToken);
    
    trackedPlaylists[playlistId] = {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      tokenExpiry: session.tokenExpiry,
      trackIds: tracks.map(item => item.track.id),
      addedAt: new Date()
    };
    
    // Queue existing tracks for download
    downloadQueue.push(...tracks);
    
    res.json({ success: true, message: 'Playlist is now being tracked', trackCount: tracks.length });
    
    // Process the download queue
    processDownloadQueue();
    
  } catch (error) {
    console.error('Error tracking playlist:', error.message);
    res.status(500).json({ error: 'Failed to track playlist' });
  }
});

app.get('/api/tracked-playlists', (req, res) => {
  const sessionId = req.cookies.session_id;
  if (!sessionId || !userSessions[sessionId]) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const playlists = Object.keys(trackedPlaylists).map(id => ({
    id,
    trackCount: trackedPlaylists[id].trackIds?.length || 0,
    addedAt: trackedPlaylists[id].addedAt
  }));
  
  res.json(playlists);
});

app.get('/api/download-history', (req, res) => {
  const sessionId = req.cookies.session_id;
  if (!sessionId || !userSessions[sessionId]) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  res.json(downloadHistory.slice(-50)); // Return last 50 downloads
});

app.delete('/api/tracked-playlists/:id', (req, res) => {
  const sessionId = req.cookies.session_id;
  if (!sessionId || !userSessions[sessionId]) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const playlistId = req.params.id;
  if (trackedPlaylists[playlistId]) {
    delete trackedPlaylists[playlistId];
    res.json({ success: true, message: 'Playlist removed from tracking' });
  } else {
    res.status(404).json({ error: 'Playlist not found' });
  }
});

// Schedule periodic checks for new tracks (every 30 minutes by default)
const checkInterval = process.env.CHECK_INTERVAL_MINUTES || 30;
cron.schedule(`*/${checkInterval} * * * *`, checkForNewTracks);

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log('Make sure to:');
  console.log('1. Set up your .env file with Spotify and Soulseek credentials');
  console.log('2. Install slsk-batchdl and ensure it\'s accessible in your PATH');
  console.log('3. Configure your Spotify app with the correct redirect URI');
});