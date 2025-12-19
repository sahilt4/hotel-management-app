# Hotel POS (Cashier) — Simple Web + Node backend

This project is a minimal hotel/café Point-Of-Sale (cashier) app. It includes a client-side UI and a simple Node/Express backend to persist state to `data/state.json`.

Features
- 20 tables
- Add/remove items per table
- Open multiple small table panels at once (dblclick a table)
- Print bills with hotel header, address and QR code
- Settings for hotel name, address and tax rate
- Optional backend persistence via `/api/state`

Run locally
1. Install dependencies:

```bash
npm install
```

2. Start the server:

```bash
npm start
```

3. Open http://localhost:3000 in your browser.

Notes
- The client will try to load and save state to `/api/state`. If the server is not running, it falls back to `localStorage` in the browser.
- The backend writes the JSON state to `data/state.json`.
