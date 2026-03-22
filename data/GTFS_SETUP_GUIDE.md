# GTFS Setup Guide for EcoRoute-UVA

## Current Status

✅ GTFS integration is fully implemented. ZIP files are in `data/gtfs-raw/` and parsed JSON in `data/gtfs-parsed/`.

## Quick Start

```bash
# Parse GTFS feeds (after updating ZIPs or first clone)
npm run parse-gtfs

# Start development
npm run dev
```

---

## File Structure

```
data/
├── routes.json              # Friendly route name mappings
├── gtfs-raw/               # Original ZIP files (git-ignored)
│   ├── University_Transit_Service_GTFS.zip
│   ├── Charlottesville_Area_Transit_GTFS.zip
│   └── Jaunt_Connect_Charlottesville_GTFS.zip
└── gtfs-parsed/           # Parsed JSON (git-ignored)
    ├── uva-gtfs.json       # 217 stops, 16 routes
    ├── cat-gtfs.json       # 366 stops, 12 routes
    └── jaunt-gtfs.json     # 39 stops, 9 routes
```

---

## Updating Route Names

Edit `data/routes.json` to change friendly names or colors:

```json
{
  "uva-gtfs": {
    "TL-57": { "name": "Gold Line", "color": "#B45309" }
  }
}
```

---

## Updating GTFS Feeds

1. Download fresh ZIP files from transit agencies
2. Place in `data/gtfs-raw/`
3. Run `npm run parse-gtfs`

---

## Troubleshooting

| Issue | Solution |
|-------|---------|
| No transit options | Check if stops exist within ~1 mile of origin/destination |
| Missing departure times | Verify day of week - service may not run on weekends |
| Parse errors | Ensure ZIP files are valid GTFS feeds |

---

For full GTFS documentation, see [GTFS_README.md](../GTFS_README.md).