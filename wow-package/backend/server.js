const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

const API_KEY = process.env.GOOGLE_API_KEY;

app.post('/translate', async (req, res) => {
  const { text, targetLanguage = 'en' } = req.body;
  if (!text) return res.status(400).json({ error: 'No text provided' });
  if (!API_KEY || API_KEY === 'YOUR_API_KEY_HERE') {
    return res.status(500).json({ error: 'API key not configured. Edit .env and restart.' });
  }
  try {
    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: text, target: targetLanguage, format: 'text' })
      }
    );
    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Translation API error' });
    }
    const translation = data.data?.translations?.[0];
    res.json({
      translatedText: translation?.translatedText || '',
      detectedLanguage: translation?.detectedSourceLanguage || ''
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3001, () => console.log('WoW Translate backend running on port 3001'));
