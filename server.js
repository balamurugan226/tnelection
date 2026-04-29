const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 15 major Tamil Nadu political parties
const VALID_PARTIES = [
  'DMK', 'AIADMK', 'Congress', 'BJP', 'CPIM',
  'CPI', 'VCK', 'MDMK', 'DMDK', 'PMK',
  'TMK', 'NTK', 'MNM', 'TVK', 'DP'
];

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Schema
const voteSchema = new mongoose.Schema({
  votes: {
    type: Map,
    of: Number,
    default: {}
  },
  totalVotes: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now }
});

const ElectionData = mongoose.model('ElectionData', voteSchema);

// Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI;

if (MONGO_URI) {
  mongoose.connect(MONGO_URI)
    .then(() => {
      console.log('✅ Connected to MongoDB Atlas');
      initDB();
    })
    .catch(err => console.error('❌ MongoDB Connection Error:', err));
} else {
  console.log('⚠️  WARNING: MONGO_URI is missing in .env file.');
  console.log('    The server will run but voting will be disabled until the database is configured.');
}

// Initialize database with default values if empty
async function initDB() {
  try {
    let data = await ElectionData.findOne();
    if (!data) {
      const initialVotes = Object.fromEntries(VALID_PARTIES.map(p => [p, 0]));
      data = new ElectionData({ votes: initialVotes, totalVotes: 0 });
      await data.save();
      console.log('🌱 Initialized new election data in MongoDB');
    } else {
      // Migrate missing parties just in case
      let changed = false;
      VALID_PARTIES.forEach(p => {
        if (!data.votes.has(p)) {
          data.votes.set(p, 0);
          changed = true;
        }
      });
      if (changed) {
        let total = 0;
        data.votes.forEach(v => total += v);
        data.totalVotes = total;
        await data.save();
        console.log('🔄 Migrated existing data to include all 15 parties');
      }
    }
  } catch (err) {
    console.error('Error initializing DB:', err);
  }
}

// GET /api/votes — Return current vote data
app.get('/api/votes', async (req, res) => {
  try {
    if (!MONGO_URI) {
      return res.json({ votes: Object.fromEntries(VALID_PARTIES.map(p => [p, 0])), totalVotes: 0 });
    }
    const data = await ElectionData.findOne();
    if (!data) return res.status(404).json({ error: 'No data found' });
    
    // Convert Map to regular object for JSON response
    const votesObj = Object.fromEntries(data.votes);
    res.json({ votes: votesObj, totalVotes: data.totalVotes, lastUpdated: data.lastUpdated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read votes from DB' });
  }
});

// POST /api/vote — Submit a vote
app.post('/api/vote', async (req, res) => {
  const { party } = req.body;

  if (!party || !VALID_PARTIES.includes(party)) {
    return res.status(400).json({ error: 'Invalid party selection' });
  }

  try {
    if (!MONGO_URI) {
      return res.status(500).json({ error: 'Database not configured yet. Please set MONGO_URI in .env' });
    }

    const data = await ElectionData.findOne();
    if (!data) return res.status(404).json({ error: 'Database not initialized' });

    // Increment vote
    const currentVotes = data.votes.get(party) || 0;
    data.votes.set(party, currentVotes + 1);
    
    // Recalculate total
    let total = 0;
    data.votes.forEach(v => total += v);
    data.totalVotes = total;
    data.lastUpdated = new Date();

    await data.save();
    
    // Return updated data
    const votesObj = Object.fromEntries(data.votes);
    res.json({ success: true, data: { votes: votesObj, totalVotes: data.totalVotes } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record vote' });
  }
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🗳️  Tamil Nadu Election Predictor`);
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   Network: http://0.0.0.0:${PORT}\n`);
});
