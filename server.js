const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'state.json');

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// serve static client files from project root
app.use(express.static(path.join(__dirname)));

async function ensureDataFile() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
      await fs.access(DATA_FILE);
    } catch (err) {
      // create empty initial state
      await fs.writeFile(DATA_FILE, JSON.stringify({}, null, 2), 'utf8');
    }
  } catch (e) {
    console.error('Failed to ensure data file', e);
  }
}

app.get('/api/state', async (req, res) => {
  try {
    await ensureDataFile();
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    const json = raw ? JSON.parse(raw) : {};
    res.json(json);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to read state' });
  }
});

app.post('/api/state', async (req, res) => {
  try {
    await ensureDataFile();
    const body = req.body || {};
    await fs.writeFile(DATA_FILE, JSON.stringify(body, null, 2), 'utf8');
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to write state' });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
