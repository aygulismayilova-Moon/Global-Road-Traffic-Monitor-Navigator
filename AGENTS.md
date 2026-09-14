# Agent Guidelines & Project Conventions

This file provides context, rules, and guidelines for AI coding agents modifying or extending this application.

## 1. Project Overview & Architecture
- **Full-Stack Application**: Express backend (`server.ts`) hosting Vite middleware in development and serving static assets in production.
- **Port Requirement**: The application **MUST** run on port `3000` bound to host `0.0.0.0` (required for container ingress routing). Never change the port.
- **Single Entry Point**: All server logic resides in `server.ts`. Frontend lives in `/src`.

## 2. API Key Security & Server-Side Proxying
- **Server-Side API Keys**:
  - `GEMINI_API_KEY`: Kept strictly server-side in `server.ts` or backend routes. Never expose to client bundles or prefix with `VITE_`.
  - `GOOGLE_MAPS_API_KEY`: Loaded from `process.env.GOOGLE_MAPS_API_KEY` with fallback to the configured public key. Server proxies calls like `/api/places/search` to protect headers and handle field masking.
- **Public Client Variables**: Only variables prefixed with `VITE_` can be consumed via `import.meta.env`.

## 3. UI, Stacking & Z-Index Conventions
- **Header Backdrop Filter Caveat**: The top `<header>` bar has `backdrop-blur-xl`. CSS backdrop-filter creates a new stacking context and containing block.
- **Portal Rule for Menus & Modals**:
  - Any dropdown, floating modal, or autocomplete popup triggered from the header or sidebars **MUST** use `createPortal(element, document.body)`.
  - Use high z-index values (`z-[9998]` for backdrops, `z-[9999]` for menus) so overlays are never clipped by sidebars, panels, or map controls.
- **Responsive Layout**:
  - Desktop-first layout with responsive mobile breakpoints (`sm:`, `md:`, `lg:`).
  - Touch targets must be at least 44px on mobile devices.

## 4. Google Maps & Navigation Best Practices
- **Google Maps JavaScript API**:
  - Loaded via `@vis.gl/react-google-maps`.
  - Maintain reference to `google.maps.Map`, `google.maps.TrafficLayer`, and `google.maps.Polyline`.
  - Avoid creating duplicate map instances on city switches; instead call `map.panTo()` and `map.setZoom()`.
- **Search Worldwide Places**:
  - Use the server proxy `POST /api/places/search` with Places Text Search (`places.googleapis.com/v1/places:searchText`).
  - Required fields in FieldMask: `places.displayName,places.location,places.formattedAddress,places.addressComponents`.

## 5. Gemini AI Integration
- Use the official `@google/genai` TypeScript SDK.
- Preferred models: `gemini-2.5-flash` with graceful fallback to `gemini-3.8-flash`.
- Always wrap model calls in `try/catch` and provide deterministic, sensible fallback traffic advice if the AI model is temporarily rate-limited or unavailable.

## 6. Build and Verification Workflow
- **Linting**: Run `npm run lint` (`tsc --noEmit`) to ensure type safety.
- **Building**: `npm run build` bundles the client with Vite and the backend with `esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs`.
- **Icons**: Import all UI icons from `lucide-react`. Never construct custom SVGs inline.
