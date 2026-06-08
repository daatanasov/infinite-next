# 🌀 Infinite Image Carousel

A showcase of **infinite image carousel** implementations built with **Next.js 16** (App Router), **React 19**, **TypeScript**, **TailwindCSS v4**, and **TanStack Virtual**.

The project demonstrates three distinct strategies for building smooth, performant, and reusable infinite carousels that handle datasets of any size—from a handful of images to thousands.

# Deployed via Vercel

`https://infinite-next-3enlfib37-daatanasov.vercel.app/`

---

## ✨ Features

- **Three unique infinite carousel techniques**  
  Static loop, circular buffer with pre-fetching, and on‑demand pagination scrolling.
- **Auto‑play & drag‑to‑scroll**  
  Each carousel auto‑scrolls smoothly and supports mouse/touch dragging.
- **Responsive & accessible**  
  Works on mobile and desktop; includes ARIA roles, keyboard support, and error handling.
- **Performance optimised**  
  TanStack Virtual renders only visible items; lazy image loading with shimmer skeletons.
- **Internationalisation**  
  Multi‑language UI via `next-intl` (English / Bulgarian).
- **Clean, typed code**  
  Fully written in TypeScript with reusable hooks and utilities.

---

## 🚀 Carousel Implementations

### 1. Static Carousel (`SmoothCarousel`)

- **Concept**: Duplicates the image set multiple times and smoothly wraps the scroll position.
- **Best for**: Small, fixed datasets (no API calls).
- **Key traits**: Zero fetching, instant loop illusion, simple hook‑free logic.

### 2. Infinite Carousel (`InfiniteCarousel`)

- **Concept**: A circular sliding window that pre‑fetches adjacent pages of images and recycles them using TanStack Virtual.
- **Best for**: Large, paginated API datasets.
- **Key traits**:
  - Pre‑fetches next/previous pages before they become visible.
  - Uses a circular buffer to avoid DOM thrashing.
  - Auto‑play pauses on hover/drag and resumes after inertia.
  - Error banner for failed fetches.

### 3. Pagination Carousel (`FetchCarousel`)

- **Concept**: Infinitely appends/prepends new pages as the user scrolls toward the edges.
- **Best for**: Very large lists where full pre‑loading is impractical.
- **Key traits**:
  - On‑demand fetching with `fetch` and custom caching.
  - Maintains unique keys even when the same page wraps around.
  - Virtualised with TanStack Virtual; auto‑play built‑in.

---

## 📦 Tech Stack

| Category       | Technology                  |
| -------------- | --------------------------- |
| Framework      | Next.js 16 (App Router)     |
| UI Library     | React 19                    |
| Language       | TypeScript                  |
| Styling        | TailwindCSS v4              |
| Virtualisation | @tanstack/react-virtual     |
| Data Fetching  | Native fetch (custom hooks) |
| i18n           | next-intl                   |
| Linting        | ESLint                      |
| Build Tool     | Vite (via Next.js)          |

---

## 📂 Project Structure

## 📂 Project Structure

```text
src/
├── _hooks/                      # Custom reusable hooks
│   ├── useAutoPlay.ts           # Auto-scroll with pause support
│   ├── useCircularCarousel.ts   # Circular buffer logic
│   ├── useDragScroll.ts         # Mouse/touch drag handlers
│   └── useInfiniteCarousel.ts   # Pagination-based infinite loader
│
├── _utils/                      # Shared utilities and helpers
│   ├── api.ts                   # Picsum Photos API wrapper
│   ├── carouselMath.ts          # Wrap/rotate/trigger calculations
│   └── const.ts                 # Constants (page size, buffer pages, etc.)
│
├── components/                  # Reusable UI components
│   ├── CarouselCard.tsx         # Image card with shimmer skeleton
│   ├── ErrorBanner.tsx          # Dismissible error alert
│   ├── FetchCarousel.tsx        # Pagination carousel (on-demand loading)
│   ├── Header.tsx               # Navigation bar with language switcher
│   ├── InfiniteCarousel.tsx     # Circular buffer carousel
│   ├── LanguageSwitcher.tsx     # i18n toggle
│   ├── Skeleton.tsx             # Placeholder skeleton
│   ├── SmoothCarousel.tsx       # Static loop carousel
│   └── StaticCard.tsx           # Simple card with hover effect
│
├── app/                         # Next.js App Router pages
│   ├── layout.tsx               # Root layout (fonts, metadata, global CSS)
│   ├── page.tsx                 # Home page
│   ├── static-carousel/         # Static carousel demo
│   └── infinite-carousel/       # Infinite & pagination carousel demos
│
└── i18n/                        # next-intl translations & routing
```

---

## 🏁 Getting Started

### Prerequisites

Before running the project locally, ensure you have:

- **Node.js** v22 or later
- **npm**, **yarn**, **pnpm**, or **bun**

### Installation

```bash
git clone <repository-url>
cd infinite-carousel
npm install
```

### Development

Start the development server:

```bash
npm run dev
```

Open your browser and navigate to:

```text
http://localhost:3000
```

The application supports hot reloading, so changes will be reflected immediately.

### Production Build

Create an optimized production build:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

---

### Docker Development

Create an docker image:

```bash
docker-compose up app-dev
```

---

## 🎮 Usage

Each carousel is designed as a reusable React component and can be integrated into any page or application.

### SmoothCarousel

Best suited for small, static datasets.

```tsx
<SmoothCarousel
  images={myImageArray}
  height={240}
  width={150}
  gap={12}
  speed={1}
  direction="right"
/>
```

### InfiniteCarousel

Ideal for large paginated APIs where seamless looping is required.

```tsx
<InfiniteCarousel
  totalItems={500}
  pageSize={20}
  height={240}
  width={150}
  gap={14}
  speed={0.6}
  direction="right"
/>
```

### FetchCarousel

Recommended for very large datasets where loading everything up front is impractical.

```tsx
<FetchCarousel
  totalItems={1000}
  pageSize={20}
  height={240}
  width={150}
  gap={14}
  speed={0.7}
/>
```

### Shared Props

All carousel implementations support a common set of configuration options:

| Prop         | Type                | Description                         |
| ------------ | ------------------- | ----------------------------------- |
| `width`      | `number`            | Width of each card                  |
| `height`     | `number`            | Height of each card                 |
| `gap`        | `number`            | Space between cards                 |
| `speed`      | `number`            | Auto-play scrolling speed           |
| `direction`  | `"left" \| "right"` | Scroll direction                    |
| `pageSize`   | `number`            | Number of images fetched per page   |
| `totalItems` | `number`            | Total images available from the API |

---

## 🔍 How It Works

### Virtualisation

The project uses **TanStack Virtual** to render only the items visible in the viewport plus a small overscan buffer.

**Benefits:**

- Reduced DOM size
- Lower memory usage
- Better scrolling performance
- Smooth handling of thousands of images

---

### Circular Buffer

The `useCircularCarousel` hook maintains a fixed-size rotating window of pages.

As users scroll:

1. Pages leaving one side are recycled.
2. New data is inserted on the opposite side.
3. The virtual index space remains stable.

This creates the illusion of infinite scrolling without continuously growing memory usage.

---

### Infinite Pagination

The `useInfiniteCarousel` hook monitors the viewport position and automatically:

- Appends pages near the end
- Prepends pages near the beginning
- Preserves smooth scrolling continuity

This approach allows the carousel to scale efficiently to very large datasets.

---

### Auto-Play

Auto-scrolling is powered by `requestAnimationFrame`.

Features include:

- Smooth continuous movement
- Pause on hover
- Pause during dragging
- Resume after interaction
- Inertia-aware behaviour

This prevents auto-play from competing with user input.

---

### Drag Scrolling

The `useDragScroll` hook translates:

- Mouse events
- Touch gestures
- Pointer movement

into horizontal scrolling behaviour for a natural carousel experience across devices.

---

### Picsum Photos Integration

Images are loaded dynamically from **Picsum Photos**.

The utility layer handles:

- Image URL generation
- Responsive sizing
- Pagination
- Error handling
- Loading states

---

## 📜 Available Scripts

| Script          | Description              |
| --------------- | ------------------------ |
| `npm run dev`   | Start development server |
| `npm run build` | Create production build  |
| `npm run start` | Start production server  |
| `npm run lint`  | Run ESLint               |

---

## 🌍 Internationalisation

The project supports multiple languages using **next-intl**.

### Available Languages

- 🇺🇸 English
- 🇧🇬 Bulgarian

### Features

- Route-aware translations
- Client-side language switching
- Shared translation dictionaries
- Type-safe message access

Language selection can be changed from the header navigation.

---

## ⚡ Performance Considerations

Several optimisations are included to ensure smooth behaviour even with large datasets:

- Virtualised rendering via TanStack Virtual
- Lazy-loaded images
- Skeleton loading placeholders
- Circular page recycling
- Request deduplication and caching
- Stable React keys
- Minimal re-renders through memoisation

These techniques keep memory usage predictable and scrolling responsive.

---

## 🔮 Future Plans

Planned improvements include:

- Convert carousels into standalone Micro Frontends (MFE)
- Add Jest and React Testing Library coverage
- Improve Server-Side Rendering (SSR) support
- Implement masonry-style carousel layouts
- Support additional image providers
- Add configurable autoplay controls
- Improve keyboard accessibility
- Publish as an installable npm package
- Create own virtualization without library
- Create React Native compunent that will be usable for mobile application and web

---

## 🤝 Contributing

Contributions, ideas, and feedback are welcome.

To contribute:

1. Fork the repository
2. Create a feature branch

```bash
git checkout -b feature/my-feature
```

3. Commit your changes

```bash
git commit -m "feat: add awesome feature"
```

4. Push the branch

```bash
git push origin feature/my-feature
```

5. Open a Pull Request

Please ensure code follows the existing TypeScript, ESLint, and formatting conventions.

---

## 📄 License

This project is licensed under the MIT License.

See the `LICENSE` file for more information.
