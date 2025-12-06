# 🎬 3D Model Animator - Dokumentace

## 🎯 Přehled

Kompletní systém pro animaci a nahrávání 3D modelů s exportem do videa. Funguje pouze s **AI Mode** (GLB modely).

---

## ✨ Funkce

### 🎥 Nahrávání videa
- **WebM format** (VP9 codec)
- Customizable FPS: 15, 30, 60
- Délka: 2-30 sekund
- Real-time progress bar
- Automatický download po dokončení

### 🔄 Typy animací
1. **Rotate Y** - Horizontální rotace (turntable)
2. **Rotate X** - Vertikální rotace (flip)
3. **Turntable** - Kombinace rotace + dynamická kamera

### ⚙️ Ovládání animace
- **Rychlost**: 0.1x - 5x
- **Směr**: Doprava / Doleva
- **Délka**: 2-30 sekund
- **FPS**: 15, 30, 60

### 📷 Camera Presets
- **Orbital** - 45° úhel (ideální pro produkty)
- **Top** - Pohled shora
- **Side** - Boční pohled
- **Front** - Čelní pohled
- **Angle** - Custom 45° úhel

### 💡 Lighting Controls
- **Ambient Light**: 0-2 (obecné osvětlení)
- **Directional Light**: 0-3 (hlavní světlo)
- **Light Position**: X, Y, Z (-10 až +10)

### 🎨 Background Options
1. **Solid** - Jednolitá barva
2. **Gradient** - Lineární gradient (horní → spodní)
3. **Transparent** - Průhledné pozadí (ideální pro composite)

### 📸 Screenshot Capture
- PNG format
- High quality
- Okamžitý download
- Current camera view

---

## 🚀 Jak použít

### Základní workflow:
1. Vygeneruj 3D model v **AI Mode**
2. Klikni na **fialové tlačítko s ikonou filmu** 🎬
3. Otevře se Animator interface
4. Nastav animaci:
   - Tab "Animace" → typ, rychlost, směr, délka
   - Tab "Kamera" → pozice kamery
   - Tab "Světlo" → intenzita světel
   - Tab "Pozadí" → barvy a typ
5. **Play** → zkontroluj preview
6. **Nahrát Video** → počká nastavenou dobu a stáhne WebM
7. **Screenshot** → okamžitý screenshot aktuálního view

---

## 🎬 UI Layout

```
┌─────────────────────────────────────────────────┐
│  [Film] 3D Model Animator              [X]      │
├─────────────────────────────────────────────────┤
│                                        │ Tabs:  │
│                                        │ • Animace│
│         Canvas Preview (800x600)       │ • Kamera │
│                                        │ • Světlo │
│                                        │ • Pozadí │
│                                        │         │
│   [▶ Play] [■ Stop] │ [🎥 Nahrát]     │ Settings│
│           Progress bar                 │  Panel  │
│                                        │         │
├─────────────────────────────────────────────────┤
│  Estimated size • Duration             [Zavřít] │
└─────────────────────────────────────────────────┘
```

---

## 🎛️ Všechny ovládací prvky

### Tab 1: Animace
```
Typ animace:
  [Rotace Y] [Rotace X]
  [Turntable (360° + camera)]

Rychlost: ----●---- (0.1x - 5x)

Směr:
  [Doprava →] [← Doleva]

Délka videa: ----●---- (2-30s)

FPS: ----●---- (15, 30, 60)
```

### Tab 2: Kamera
```
Preset pozice kamery:
  [Orbital] [Shora]
  [Z boku] [Zepředu]
  [Úhel 45°]

💡 Tip: Orbital pohled je ideální pro turntable
```

### Tab 3: Světlo
```
Ambient Light: ----●---- (0-2)
Directional Light: ----●---- (0-3)

Pozice světla:
  X: ----●---- (-10 až +10)
  Y: ----●---- (-10 až +10)
  Z: ----●---- (-10 až +10)
```

### Tab 4: Pozadí
```
Typ pozadí:
  [Solid] [Gradient] [Průhledné]

Barva 1: [🎨 #1e293b] [#1e293b]
Barva 2: [🎨 #334155] [#334155]

💡 Průhledné pozadí je ideální pro kompozice
```

---

## 💾 Export formáty

### Video
- **Format**: WebM (VP9)
- **Bitrate**: 5 Mbps
- **Fallback**: WebM (základní codec)
- **Naming**: `animation-{timestamp}.webm`

### Screenshot
- **Format**: PNG
- **Quality**: Maximum
- **Naming**: `model-screenshot-{timestamp}.png`

---

## 🎯 Use Cases

### E-commerce
- **Turntable animace** produktů
- **360° view** pro detail
- Solid pozadí (#ffffff)

### Marketing
- **Dynamické animace** pro sociální sítě
- **Gradient pozadí** pro premium feel
- 30 FPS, 6 sekund

### Portfolio
- **Custom camera angles**
- **Dramatic lighting**
- Screenshot pro thumbnail

### Presentation
- **Transparent background**
- **Slow rotation** (0.5x speed)
- 60 FPS pro smooth playback

---

## 🔧 Technické detaily

### Canvas Recording
- Používá `HTMLCanvasElement.captureStream()`
- `MediaRecorder API` pro nahrávání
- `preserveDrawingBuffer: true` pro screenshot

### Three.js Integration
- Standalone scene (nezávislý na GLBViewer)
- Vlastní camera & lighting setup
- ObjectLoader pro GLB import

### Performance
- 800x600 canvas (optimální kvalita/výkon)
- Configurable FPS
- Real-time rendering

---

## ⚠️ Omezení

1. **Pouze AI Mode** - Basic mode není podporován (nemá GLB URL)
2. **Browser support** - Vyžaduje MediaRecorder API
3. **WebM codec** - Ne všechny browsery podporují VP9
4. **File size** - 30s @ 60 FPS ≈ 5-10 MB

---

## 🎁 Tipy & Triky

### Pro nejlepší výsledky:
1. ✅ Použij **Orbital camera** pro produkty
2. ✅ **30 FPS** je sweet spot (kvalita vs. file size)
3. ✅ **Gradient background** vypadá profesionálně
4. ✅ **Turntable** typ pro klasickou 360° prezentaci
5. ✅ **6 sekund** je ideální délka pro web

### Pro sociální sítě:
- **Instagram**: 6s, 30 FPS, gradient bg
- **Twitter**: 4s, 30 FPS, solid bg
- **LinkedIn**: 8s, 30 FPS, professional lighting

### Pro web:
- **Homepage hero**: 10s loop, 30 FPS, transparent
- **Product page**: 6s turntable, 30 FPS, white bg
- **Portfolio**: Custom angles, 60 FPS, dramatic lighting

---

## 🚀 Budoucí vylepšení

Možná rozšíření:
1. **GIF export** - pro širší kompatibilitu
2. **MP4 export** - univerzální format
3. **Custom keyframes** - manuální animace
4. **Camera path editor** - vlastní trajektorie
5. **Multiple models** - animace více objektů
6. **Audio support** - hudba v pozadí
7. **Watermark** - branding overlay

---

## 📊 Estimovaná velikost souborů

| Délka | FPS | Estimated Size |
|-------|-----|----------------|
| 2s    | 15  | ~300 KB        |
| 6s    | 30  | ~2 MB          |
| 10s   | 30  | ~3.5 MB        |
| 6s    | 60  | ~4 MB          |
| 30s   | 60  | ~18 MB         |

---

Hotovo! 🎉
