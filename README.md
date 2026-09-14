# Global Road Traffic Monitor & Navigator

Autonomous global road traffic monitor and turn-by-turn navigator powered by Google Maps JavaScript API, Google Places API, and Gemini AI. Features worldwide city monitoring, live congestion alerts, alternative detour routing, audio-guided navigation, and AI traffic intelligence.

## Key Features

### 1. Interactive Worldwide Traffic Map
- **Live Google Traffic Layer**: Real-time traffic congestion visualization with color-coded flow speeds (green, orange, red, dark red).
- **Multi-Map Modes**: Seamlessly switch between standard roadmap, night mode, terrain, and satellite views.
- **Dynamic Camera Controls**: Pan, zoom, center on vehicle, and re-orient on active arterial corridors.

### 2. Global City Search & Selection
- **68+ Preloaded Global Metropolises**: Spanning North America, Europe, Asia, South America, Africa, Oceania, and the Middle East.
- **Search Any City Worldwide**: Powered by the Google Places API (`/api/places/search`) proxy, enabling geocoding and live traffic monitoring for any town or city globally.
- **Accents & Diacritics Normalization**: Fast, accent-insensitive search (e.g., Baku/Bakı, São Paulo, Tokyo, Paris).
- **Portal Overlay**: Rendered with React Portals at document root with `z-[9999]` for guaranteed visibility above all map tiles, controls, and sidebars.

### 3. Smart Alternative Detour & Bypass Engine
- **Congestion Detection**: Continuously monitors arterial bottlenecks, average corridor speeds, and delay percentages.
- **Autonomous Detours**: Calculates and highlights alternative bypasses and perimeter roads to avoid gridlock.
- **Savings Analysis**: Compares primary congested routes against recommended bypasses with estimated time, fuel, and CO₂ savings.

### 4. Turn-by-Turn Navigator HUD & Voice Guidance
- **Heads-Up Display (HUD)**: Displays next maneuver instructions, distance remaining, current road speed, and estimated arrival time.
- **Audio Navigator**: Integrated Web Speech API synthesized turn-by-turn alerts and traffic condition announcements (muteable).

### 5. Gemini AI Traffic Intelligence
- **AI Corridor Analysis**: Powered by Google Gemini (`gemini-3.8-flash` / `gemini-3.6-flash`) via the server-side `@google/genai` SDK.
- Provides actionable commuter recommendations, bottleneck summaries, and detour optimizations based on active weather, peak hours, and road incidents.

## Architecture & Tech Stack
- **Frontend**: React 18/19, TypeScript, Tailwind CSS, Lucide React icons
- **Backend / API**: Node.js, Express, Vite middleware (`server.ts`)
- **Map & Geocoding**: Google Maps Platform JavaScript API (`TrafficLayer`, `DirectionsRenderer`), Google Places API
- **AI Intelligence**: Google Gen AI SDK (`@google/genai`)
- **Speech Engine**: Web Speech Synthesis API

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation
```bash
npm install
```

### Environment Variables
Copy `.env.example` to `.env` or configure via Settings:
```env
# Google Maps API Key for Maps JavaScript API and Places API
GOOGLE_MAPS_API_KEY="your-google-maps-api-key"

# Gemini API Key for AI traffic analysis (server-side only)
GEMINI_API_KEY="your-gemini-api-key"

# App URL (automatically provided on Cloud Run / preview)
APP_URL="http://localhost:3000"
```

### Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build
```bash
npm run build
npm start
```
