# WoW Chat OCR Translator

## Current State
Empty project. No existing frontend or backend code.

## Requested Changes (Diff)

### Add
- Screen capture via `navigator.mediaDevices.getDisplayMedia()` with live preview
- Click-and-drag region selection overlay on the preview (save/load presets)
- OCR using Tesseract.js worker (chi_sim+chi_tra, optional eng toggle)
- Optional grayscale/threshold image preprocessing toggle
- Two operation modes:
  - Snap Translate: single frame on button click or Ctrl+Shift+Y hotkey
  - Live Translate: loop at configurable FPS (default 2), with hash-based dedupe
- Translation via backend proxy endpoint `/translate` (text, targetLanguage -> translatedText, detectedLanguage)
- Backend proxy calls Google Cloud Translation API v3 via HTTP outcalls
- Translation feed UI: original + translated text, newest on top, copy, clear, pause live
- "Open Display Window" button to pop out feed into separate window (for Monitor 2)
- Layout: left panel = preview + region overlay + controls; right panel = translation feed

### Modify
N/A

### Remove
N/A

## Implementation Plan
1. Select `http-outcalls` Caffeine component
2. Generate Motoko backend with `/translate` HTTP endpoint that proxies Google Translation API v3; accepts `text` and `targetLanguage`, returns `translatedText` and `detectedLanguage`; API key stored as environment/config variable
3. Frontend:
   - Install `tesseract.js` npm dependency
   - `CapturePanel`: getDisplayMedia, video preview, start/stop controls
   - `RegionOverlay`: canvas overlay on preview for click-drag rect selection; preset save/load in localStorage
   - `OcrEngine`: Tesseract.js worker manager (chi_sim+chi_tra), preprocessing toggle, expose `recognizeRegion(imageData)` -> text
   - `TranslationFeed`: scrollable feed of {original, translated, timestamp} entries; copy, clear, pause
   - `DisplayWindow`: `window.open` popup with mirrored feed for Monitor 2
   - `useCapture` hook: manages capture loop, FPS setting, dedupe via MD5/hash of OCR result
   - App layout: two-column split, left=capture+controls, right=feed
   - Hotkey: Ctrl+Shift+Y triggers snap translate when tab focused
   - Target language selector: English (default) / German
