require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const LEVEL_PROMPTS = {
  beginner: 'Use very simple, short sentences and basic vocabulary (CEFR A1-A2 level).',
  intermediate: 'Use natural everyday English with moderate vocabulary (CEFR B1-B2 level).',
  advanced: 'Use natural, idiomatic English including some advanced vocabulary (CEFR C1 level).'
};

app.post('/api/chat', async (req, res) => {
  try {
    const { message, history, level } = req.body;

    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'サーバーにGEMINI_API_KEYが設定されていません。.envファイルを確認してください。' });
    }

    const levelInstruction = LEVEL_PROMPTS[level] || LEVEL_PROMPTS.intermediate;

    const systemPrompt = `You are "JARVIS", a friendly English conversation coach.
Rules:
- Have a natural spoken conversation in English with the user.
- ${levelInstruction}
- Keep each reply short (max 3 sentences) so the conversation flows naturally.
- If the user made a grammar or word-choice mistake, add ONE short correction tip in Japanese at the end, formatted exactly like: [FEEDBACK] 日本語での指摘
- If there was no mistake, do not include a [FEEDBACK] line.
- Always add ONE more natural / native-like way to express what the user just said in English, even if their sentence was already correct, formatted exactly like: [BETTER] a more natural English version of what they said
- Always add a natural Japanese translation of YOUR OWN reply (the spoken part only), formatted exactly like: [JA] 日本語訳
- If the user's latest message is a real spoken utterance from them (not an internal system note), also add a natural Japanese translation of what THE USER said, formatted exactly like: [USER_JA] 日本語訳
- If the user's latest message was the very first message of the conversation (a greeting/topic starter, an internal system note) rather than something they said, omit both [BETTER] and [USER_JA].`;

    const contents = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: 'Understood. I will act as JARVIS, your English coach.' }] },
      ...(history || []),
      { role: 'user', parts: [{ text: message }] }
    ];

    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents })
    });

    const SILENCE_TIMEOUT_MS = 900; // ここの数値(ミリ秒)を大きくすると、より長く待ってくれます

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini API error:', data);
      return res.status(500).json({ error: data?.error?.message || 'Gemini APIエラー' });
    }

    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text
      || 'すみません、うまく返答できませんでした。もう一度話しかけてください。';

    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`JARVIS server running: http://localhost:${PORT}`));
