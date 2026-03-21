# Agent Instructions for EcoRoute-UVA

## Project Overview
EcoRoute-UVA is a Next.js 14 (App Router) + TypeScript application for sustainable transportation routing at UVA. It calculates and compares carbon emissions for different transportation modes, providing behavioral nudges for low-carbon commuting.

## Build/Lint/Test Commands

```bash
# Development
npm run dev              # Start Next.js dev server on port 3000
npm run build            # Build for production
npm run start            # Start production server

# Linting
npm run lint             # Run Next.js built-in linter

# Scripts
npm run parse-gtfs       # Parse GTFS transit feeds to JSON (node scripts/parse-gtfs.js)
```

### Running Single Tests
No test framework is currently configured (no Jest/Vitest). The project uses Next.js's built-in linting only. When adding tests:
- Use `npm test` (standard) or `npm run test:watch` for watch mode
- Run single test file: `npm test -- ComponentName.test.tsx`
- Run specific test: `npm test -- --testNamePattern="test description"`

## Code Style Guidelines

### TypeScript Conventions

**1. Type Definitions**
- Use `interface` for object shapes (preferred over `type`)
- Use `Partial<T>`, `Record<K,V>`, `Pick<T,K>`, `Omit<T,K>` for complex types
- Always define prop interfaces for components

```typescript
interface ModeScore {
  mode: string;
  label: string;
  gCO2e: number;
  timeMin: number;
  costUSD: number;
  recommended: boolean;
  icon: string;
  color: string;
  warning?: string;  // Optional properties use ?
}

interface ModeCardProps {
  mode: ModeScore;
  isSelected: boolean;
  baseline: number;
  onSelect: () => void;
  onLogTrip: () => void;
}
```

**2. Generic Type Guards**
Use type predicates for filtering null values:
```typescript
.filter((s): s is ModeScore => s !== null)
```

**3. Strict Mode**
- TypeScript strict mode is enabled (`"strict": true` in tsconfig.json)
- Avoid `any` types; use proper typing
- If `any` is unavoidable (e.g., Leaflet event handlers), document with `// eslint-disable-next-line`

### React/Next.js Patterns

**1. Client Components**
All components using hooks must have `'use client'` at the top:
```typescript
'use client';

import { useState, useEffect } from 'react';

export default function MyComponent() {
  // ...
}
```

**2. Component Export**
Use default exports for page/component files:
```typescript
export default function ModeCard({ ... }: ModeCardProps) {
  // ...
}
```

**3. Dynamic Imports for Client-Side Libraries**
Leaflet and similar browser-only libraries must be dynamically imported:
```typescript
import dynamic from 'next/dynamic';

const MapSelector = dynamic(() => import('@/components/MapSelector'), {
  ssr: false,
});
```

Or within the component:
```typescript
const [L, setL] = useState<any>(null);

useEffect(() => {
  import('leaflet').then((module) => {
    setL(module.default);
  });
}, []);
```

**4. API Routes (App Router)**
Use the new Request/Response pattern:
```typescript
export async function POST(req: Request) {
  try {
    const body = await req.json();
    // ... process
    return Response.json({ data });
  } catch (error) {
    console.error("Error:", error);
    return Response.json({ error: "Message" }, { status: 500 });
  }
}
```

### Import Conventions

**1. Ordering (grouped by purpose)**
```typescript
// 1. React core
import { useState, useEffect } from 'react';

// 2. Next.js
import dynamic from 'next/dynamic';
import Image from 'next/image';

// 3. Third-party libraries
import axios from 'axios';
import { clsx } from 'clsx';

// 4. Components (use @ alias)
import MapSelector from '@/components/MapSelector';
import ModeCard from '@/components/ModeCard';

// 5. Types
import type { ModeScore } from '@/types';
```

**2. Path Aliases**
Use `@/` to reference project root:
```typescript
import { Button } from '@/components/ui/Button';
import { API_BASE } from '@/lib/constants';
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `ModeCard.tsx`, `StreakDisplay.tsx` |
| Interfaces | PascalCase | `ModeScore`, `ModeCardProps` |
| Functions | camelCase | `calculateDistance()`, `getEmissionColor()` |
| Variables | camelCase | `isSelected`, `baselineGCO2e` |
| Constants | UPPER_SNAKE | `EMISSION_FACTORS`, `MAX_SPEED` |
| Files (JS/TS) | camelCase or PascalCase | `carbonService.js`, `ModeCard.tsx` |
| CSS Classes | kebab-case (Tailwind) | `bg-green-500`, `text-center` |

### Styling Guidelines

**1. Tailwind CSS**
- Use utility classes for all styling (no custom CSS unless necessary)
- Custom theme colors available:
```typescript
colors: {
  'uva-primary': '#232D4B',
  'uva-accent': '#00A3E0',
  'eco-green': '#10B981',
  'eco-amber': '#F59E0B',
  'eco-red': '#EF4444',
}
```

**2. Common Patterns**
```typescript
// Spacing
<div className="p-4 m-3 mt-2 mb-6 gap-3">

// Typography
<p className="text-lg font-bold text-slate-900">

// Conditional classes
<div className={isSelected ? 'border-green-500' : 'border-slate-200'}>

// Responsive
<div className="sm:px-6 lg:px-8 md:grid-cols-2">
```

### Error Handling

**1. API Routes**
```typescript
export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    if (!body.distance_miles || body.distance_miles <= 0) {
      return Response.json({ error: "Invalid distance" }, { status: 400 });
    }
    
    // ... process
    
    return Response.json({ success: true, data });
  } catch (error) {
    console.error("Score API error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**2. Frontend Fetch Calls**
```typescript
const response = await fetch('/api/score', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});

if (!response.ok) {
  throw new Error(`HTTP error! status: ${response.status}`);
}

const data = await response.json();
```

### File Structure

```
EcoRoute-UVA/
├── app/                      # Next.js 14 App Router
│   ├── api/
│   │   └── [endpoint]/
│   │       └── route.ts     # API route handlers
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Main page
├── components/              # React components (PascalCase)
│   ├── ModeCard.tsx
│   └── MapSelector.tsx
├── backend/                 # Express.js backend (legacy)
│   ├── routes/             # Route handlers
│   └── services/           # Business logic
├── lib/                     # Utilities, constants
├── types/                   # Shared TypeScript types
├── scripts/                # Build/utility scripts
└── public/                 # Static assets
```

### State Management
- Use React `useState` for local component state
- Use `zustand` for global state (already installed)
- Consider `localStorage` for persistence needs

### Database/Storage
- Primary: Supabase (Postgres) via `@supabase/supabase-js`
- Fallback: `localStorage` for client-side persistence
- Environment variables for configuration (see `.env.example`)
