# Quick Start Guide

Get SpotiSeek up and running in 5 minutes!

## Prerequisites Check

Before starting, ensure you have:
- ✅ Node.js (v14+) installed
- ✅ A Spotify account
- ✅ A Soulseek account
- ✅ slsk-batchdl downloaded

## 1. Automatic Setup

Run the setup script:
```bash
./setup.sh
```

This will:
- Install all dependencies
- Create the `.env` file
- Set up the downloads directory
- Check for slsk-batchdl

## 2. Configure Credentials

Edit the `.env` file with your credentials:

```bash
nano .env  # or use your preferred editor
```

Required fields:
```env
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
SOULSEEK_USERNAME=your_username
SOULSEEK_PASSWORD=your_password
```

## 3. Set Up Spotify App

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Click "Create an App"
3. Fill in the details:
   - **App name**: SpotiSeek (or any name)
   - **App description**: Personal music downloader
   - **Redirect URI**: `http://localhost:3000/callback`
4. Copy the Client ID and Client Secret to your `.env` file

## 4. Install slsk-batchdl

### Windows
1. Download from [GitHub Releases](https://github.com/fiso64/slsk-batchdl/releases)
2. Extract `sldl.exe` to a folder
3. Add the folder to your PATH or update `.env`:
   ```env
   SLDL_PATH=C:\path\to\sldl.exe
   ```

### macOS/Linux
1. Download the appropriate binary from [GitHub Releases](https://github.com/fiso64/slsk-batchdl/releases)
2. Make it executable: `chmod +x sldl`
3. Move to PATH: `sudo mv sldl /usr/local/bin/`

## 5. Start the Application

```bash
npm start
```

Open your browser and go to: `http://localhost:3000`

## 6. Connect and Download

1. Click "Connect with Spotify"
2. Authorize the app
3. Select playlists to track
4. Watch as new songs are automatically downloaded!

## Troubleshooting

### Common Issues

**"Module not found" errors**
```bash
npm install
```

**"sldl not found"**
- Check if slsk-batchdl is in your PATH
- Update `SLDL_PATH` in `.env` with the full path

**Spotify authentication fails**
- Double-check your Client ID and Secret
- Ensure redirect URI is exactly `http://localhost:3000/callback`

**No downloads happening**
- Verify Soulseek credentials
- Check console logs for errors
- Ensure Soulseek client is not running

### Getting Help

1. Check the full [README.md](README.md)
2. Review console logs for error messages
3. Ensure all credentials are correct
4. Test slsk-batchdl manually:
   ```bash
   sldl "test song" --user YOUR_USERNAME --pass YOUR_PASSWORD --print results
   ```

## What's Next?

Once everything is working:
- The app checks for new tracks every 30 minutes
- Downloads are saved to the `downloads/` folder
- View download history in the dashboard
- Add/remove tracked playlists as needed

Enjoy your automatically downloaded music! 🎵