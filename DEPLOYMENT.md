# Deployment Guide

## AI Studio - Free AI Image & Video Generator

This application uses the z-ai-web-dev-sdk for AI generation features, which requires Node.js runtime.

---

## 🚀 Deployment Options

### Option 1: Vercel (Recommended - Free Tier)

**Why Vercel?**
- Native Next.js support with zero configuration
- Free tier includes serverless functions
- Automatic HTTPS and CDN
- Best compatibility with API routes

**Steps:**
1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your GitHub repository
5. Click "Deploy"

That's it! Your app will be live in minutes.

---

### Option 2: Cloudflare Pages (Static + Functions)

**Limitation:** API routes may require additional configuration due to Node.js runtime requirements.

**Steps:**
1. Install the Cloudflare adapter:
```bash
npm install -D @cloudflare/next-on-pages
```

2. Update `next.config.ts`:
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Remove standalone for Cloudflare
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
```

3. Build for Cloudflare:
```bash
npx @cloudflare/next-on-pages
```

4. Deploy:
```bash
npx wrangler pages deploy .vercel/output/static
```

---

### Option 3: Docker / Any Node.js Hosting

**Build and run:**
```bash
npm install
npm run build
npm run start
```

**Dockerfile example:**
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

## 📁 Project Structure

```
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── generate-image/route.ts  # Image generation API
│   │   │   ├── generate-video/route.ts  # Video generation API
│   │   │   └── video-status/route.ts    # Video status polling
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx                     # Main UI
│   └── components/ui/                   # UI components
├── package.json
├── next.config.ts
└── README.md
```

---

## 🔧 Environment Variables

No environment variables needed! The z-ai-web-dev-sdk is pre-configured.

---

## 🌐 Features

- **Image Generation**: Create stunning AI images from text prompts
- **Video Generation**: Generate AI videos with quality/duration options
- **Dark Mode**: Toggle between light and dark themes
- **Responsive Design**: Works on mobile, tablet, and desktop
- **Free to Use**: No API keys or signup required

---

## 📊 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/generate-image` | POST | Generate image from prompt |
| `/api/generate-video` | POST | Create video generation task |
| `/api/video-status?taskId=xxx` | GET | Check video generation status |

---

## 🎨 Supported Sizes

**Images:**
- 1024x1024 (Square)
- 768x1344 (Portrait)
- 864x1152 (Portrait)
- 1344x768 (Landscape)
- 1152x864 (Landscape)
- 1440x720 (Wide)
- 720x1440 (Tall)

**Videos:**
- Duration: 5 or 10 seconds
- Quality: Speed or Quality mode
- FPS: 30 or 60

---

## 📝 License

MIT License - Free to use and modify.
