# Natimpo Points

A small internal tool that turns a points-balance export into payout sheets
per area manager.

**Flow:**

1. Upload the **Points** file — columns `Phone`, `Name`, `Points`.
2. Upload the **Dials** file — columns `CUSTOMER_DIAL`, `shop_name`.
3. Natimpo matches each phone number to a shop, then looks up that shop's
   area manager in the **Map** (Shop Name → Area Manager), which you maintain
   on the *Shop & manager map* page.
4. Download either:
   - a single workbook with one sheet per area manager (`Phone`, `Name`,
     `Points`, `Amount`, `Shop Name`), plus a `Summary` sheet, or
   - a ZIP with one `.xlsx` file per area manager.

`Amount` is calculated as `Points × rate`, where rate defaults to **0.04%**
and is editable on the payout run page before you download.

Rows whose phone number isn't found in the Dials file, or whose shop isn't
yet in the map, are grouped under **Unassigned** so nothing silently gets
dropped — fix the mapping on the map page and re-check the run.

Everything runs client-side in the browser (the spreadsheets are parsed and
generated with SheetJS in JavaScript); no file is uploaded to a server. The
shop/manager map is saved in the browser's local storage, seeded on first
run with the map you supplied, and can be exported/imported as `.xlsx` to
back it up or share it with a teammate.

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000.

```bash
npm run build   # production build
npm start       # serve the production build
```

## Deploying

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/natimpo-points.git
git push -u origin main
```

### 2. Deploy on Vercel

- Go to https://vercel.com/new and import the GitHub repository.
- Framework preset: **Next.js** (auto-detected). No environment variables
  are required.
- Click **Deploy**.

Or from the CLI:

```bash
npm i -g vercel
vercel        # preview deploy
vercel --prod # production deploy
```

## Project structure

```
app/
  page.js          Payout run: upload, match, download
  map/page.js       Shop & manager map editor
  layout.js, globals.css
components/
  NavBar.js
  UploadCard.js
lib/
  matching.js       Phone normalization + Points/Dials/Map join logic
  xlsxUtils.js       Reading/writing .xlsx with SheetJS
  mapStore.js        localStorage persistence for the map
  mapSeedData.json   Initial shop → area manager map
```

## Notes on matching

- Phone numbers are normalized by stripping non-digits and a leading `0` or
  country code `20`, so `01207777944`, `1207777944`, and `201207777944` all
  match the same dial.
- Shop names are matched case-insensitively and trimmed of extra spaces.
- If the same `CUSTOMER_DIAL` appears with two different shop names in the
  Dials file, the first one encountered is used.
