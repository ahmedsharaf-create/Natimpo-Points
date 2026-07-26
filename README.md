# Natimpo Points

A small internal tool that turns a points-balance export, or a stock export,
into sheets split by area manager (or region).

The home page has two modes, **Points** and **Stock**.

## Points mode

1. Upload the **Points** file — columns `Phone`, `Name`, `Points`.
2. Upload the **Dials** file — columns `CUSTOMER_DIAL`, `shop_name`.
3. Natimpo matches each phone number to a shop, then looks up that shop's
   area manager in the **Map** (Shop Name → Area Manager → Region), which
   you maintain on the *Shop & manager map* page.
4. Download either:
   - a single workbook with one sheet per area manager (`Phone`, `Name`,
     `Points`, `Amount`, `Shop Name`), plus a `Summary` sheet, or
   - a ZIP with one `.xlsx` file per area manager.

`Amount` is calculated as `Points × rate`, where rate defaults to **0.04%**
and is editable on the payout run page before you download.

## Stock mode

1. Upload a **Stock** export — columns `ITEM_CODE`, `ITEM_NAME`, `QUANTITY`,
   `CUST_PRICE`, `total price`, `SHOP_NAME`, `SHOP_CODE`, `STOCK_NAME`,
   `PARTNER_CODE`. Headers are matched case-insensitively and tolerate stray
   spaces (e.g. `" QUANTITY "`), since `SHOP_NAME` is already on each row.
2. Natimpo looks up each shop's area manager and region in the Map.
3. Choose whether to group the exported sheets by **area manager** or by
   **region**, then download the workbook (one sheet per group, plus a
   `Summary` sheet) or a ZIP with one file per group. Every sheet includes
   both the `Area Manager` and `Region` columns regardless of grouping.

## The shop & manager map

The map now has three columns: **Shop Name**, **Area Manager**, and
**Region**. Region is used by Stock exports; Points exports only need the
manager. Edit rows inline, add new ones, import an updated map `.xlsx`
(rows with a matching shop name are overwritten), or export the current map
to back it up or share with a teammate. The map ships seeded with the shops
you originally supplied — regions start blank and can be filled in on the
page or via a bulk import.

Rows that can't be resolved (phone not in Dials, or shop not yet in the
map) are grouped under **Unassigned** in both modes, so nothing silently
gets dropped — fix the mapping on the map page and re-check the run.

Everything runs client-side in the browser (the spreadsheets are parsed and
generated with SheetJS in JavaScript); no file is uploaded to a server. The
shop/manager map is saved in the browser's local storage and can be
exported/imported as `.xlsx`.

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
  page.js           Mode switcher: Points / Stock
  map/page.js        Shop & manager map editor (Shop, Manager, Region)
  layout.js, globals.css
components/
  NavBar.js
  UploadCard.js
  PointsFlow.js       Points mode: upload, match, download
  StockFlow.js        Stock mode: upload, group by manager/region, download
lib/
  matching.js        Phone normalization + Points/Dials/Map and Stock/Map join logic
  xlsxUtils.js        Reading/writing .xlsx with SheetJS (Points, Dials, Map, Stock)
  mapStore.js         localStorage persistence for the map
  mapSeedData.json    Initial shop → area manager → region map
```

## Notes on matching

- Phone numbers are normalized by stripping non-digits and a leading `0` or
  country code `20`, so `01207777944`, `1207777944`, and `201207777944` all
  match the same dial.
- Shop names are matched case-insensitively and trimmed of extra spaces.
- If the same `CUSTOMER_DIAL` appears with two different shop names in the
  Dials file, the first one encountered is used.
