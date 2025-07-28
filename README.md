# SpotiSeek - Spotify to Soulseek Downloader

An easy-to-use web application that connects your Spotify account and automatically downloads your playlist songs via Soulseek, optimizing for high-quality FLAC files. Every new song added to your tracked playlists is automatically downloaded.

![SpotiSeek Screenshot](https://via.placeholder.com/800x400/667eea/ffffff?text=SpotiSeek+Dashboard)

## Features

- 🎵 **Automatic Sync**: Monitor your Spotify playlists for new additions
- 🎧 **High Quality**: Prioritizes FLAC downloads, falls back to MP3
- ⚡ **Real-time Monitoring**: Checks for new tracks every 30 minutes (configurable)
- 🎨 **Modern UI**: Beautiful, responsive web interface
- 📊 **Download History**: Track successful and failed downloads
- 🔄 **Background Processing**: Downloads happen automatically in the background
- 🎯 **Smart Search**: Uses optimized search queries for better Soulseek results

## Prerequisites

Before setting up SpotiSeek, make sure you have:

1. **Node.js** (v14 or higher)
2. **Spotify Developer Account** and app credentials
3. **Soulseek Account** with username and password
4. **slsk-batchdl** installed and accessible in your PATH

### Installing slsk-batchdl

Download the latest release from [fiso64/slsk-batchdl](https://github.com/fiso64/slsk-batchdl/releases) and ensure it's in your system PATH or specify the path in your `.env` file.

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd spotify-soulseek-downloader
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit the `.env` file with your credentials:
   ```env
   # Spotify API Credentials
   SPOTIFY_CLIENT_ID=your_spotify_client_id_here
   SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
   SPOTIFY_REDIRECT_URI=http://localhost:3000/callback

   # Soulseek Credentials
   SOULSEEK_USERNAME=your_soulseek_username
   SOULSEEK_PASSWORD=your_soulseek_password

   # Application Settings
   PORT=3000
   NODE_ENV=development

   # Download Settings
   DOWNLOAD_PATH=./downloads
   PREFERRED_FORMAT=flac
   BACKUP_FORMAT=mp3
   CHECK_INTERVAL_MINUTES=30

   # slsk-batchdl path (if not in PATH)
   SLDL_PATH=sldl
   ```

## Spotify App Setup

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Set the redirect URI to: `http://localhost:3000/callback`
4. Copy the Client ID and Client Secret to your `.env` file

## Usage

1. **Start the application**
   ```bash
   npm start
   ```
   
   For development with auto-restart:
   ```bash
   npm run dev
   ```

2. **Open your browser**
   
   Navigate to `http://localhost:3000`

3. **Connect your Spotify account**
   
   Click "Connect with Spotify" and authorize the application

4. **Select playlists to track**
   
   Browse your playlists and click "Track" on the ones you want to monitor

5. **Automatic downloads**
   
   The app will automatically check for new tracks every 30 minutes and download them via Soulseek

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SPOTIFY_CLIENT_ID` | Your Spotify app client ID | Required |
| `SPOTIFY_CLIENT_SECRET` | Your Spotify app client secret | Required |
| `SPOTIFY_REDIRECT_URI` | OAuth redirect URI | `http://localhost:3000/callback` |
| `SOULSEEK_USERNAME` | Your Soulseek username | Required |
| `SOULSEEK_PASSWORD` | Your Soulseek password | Required |
| `PORT` | Server port | `3000` |
| `DOWNLOAD_PATH` | Directory for downloaded files | `./downloads` |
| `PREFERRED_FORMAT` | Preferred audio format | `flac` |
| `CHECK_INTERVAL_MINUTES` | How often to check for new tracks | `30` |
| `SLDL_PATH` | Path to slsk-batchdl executable | `sldl` |

### Download Behavior

The application uses the following strategy for downloads:

1. **Search Query**: Combines artist and track title (e.g., "Artist Name - Track Title")
2. **Format Preference**: Prioritizes FLAC, accepts MP3 as fallback
3. **Quality Optimization**: Uses `--fast-search` for quicker results
4. **File Naming**: Uses format `{artist} - {title}` for consistency

## API Endpoints

### Authentication
- `GET /login` - Initiate Spotify OAuth flow
- `GET /callback` - OAuth callback handler
- `GET /dashboard` - Dashboard page (requires auth)

### Playlists
- `GET /api/playlists` - Get user's Spotify playlists
- `POST /api/track-playlist` - Start tracking a playlist
- `GET /api/tracked-playlists` - Get currently tracked playlists
- `DELETE /api/tracked-playlists/:id` - Stop tracking a playlist

### Downloads
- `GET /api/download-history` - Get download history

## File Structure

```
spotify-soulseek-downloader/
├── public/
│   ├── index.html          # Landing page
│   ├── dashboard.html      # Dashboard interface
│   ├── styles.css          # Styles for both pages
│   └── dashboard.js        # Dashboard functionality
├── downloads/              # Downloaded music files (created automatically)
├── server.js              # Main server application
├── package.json           # Node.js dependencies
├── .env.example          # Environment variables template
└── README.md             # This file
```

## Troubleshooting

### Common Issues

1. **"slsk-batchdl not found"**
   - Ensure slsk-batchdl is installed and in your PATH
   - Or specify the full path in `SLDL_PATH` environment variable

2. **Spotify authentication fails**
   - Check your Spotify app credentials
   - Ensure the redirect URI matches exactly
   - Make sure your Spotify app is not in development mode restrictions

3. **No downloads happening**
   - Verify your Soulseek credentials
   - Check that Soulseek is not running (can cause conflicts)
   - Review the console logs for error messages

4. **Downloads fail**
   - Some tracks may not be available on Soulseek
   - Check your internet connection
   - Verify Soulseek account is working

### Logs

The application logs important information to the console, including:
- Playlist tracking status
- Download attempts and results
- Error messages and debugging info

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Credits

This project builds upon and integrates:
- [slsk-batchdl](https://github.com/fiso64/slsk-batchdl) by fiso64 - Advanced Soulseek downloader
- [spotifyseek](https://github.com/bdavs3/spotifyseek) by bdavs3 - Original inspiration
- Spotify Web API for playlist access
- Express.js for the web server

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

This tool is for educational and personal use only. Make sure you comply with:
- Spotify's Terms of Service
- Soulseek's Terms of Service  
- Your local copyright laws
- Only download music you have the right to access

The developers are not responsible for any misuse of this software.