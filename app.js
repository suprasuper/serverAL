const express = require('express');
const app = express();
const { createGame } = require('./game/gameManager'); // importer createGame
const cors = require('cors');

// Middleware pour parser JSON dans le body
app.use(cors()); 
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Serveur Socket.IO actif');
});

app.post('/api/games', (req, res) => {
  const { players } = req.body; 
  if (!players || !Array.isArray(players) || players.length === 0) {
    return res.status(400).json({ error: 'Il faut au moins un joueur pour créer la partie' });
  }

  try {
    const newGame = createGame(players);
    res.status(201).json(newGame);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


module.exports = app;
