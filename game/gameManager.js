let games = [];
let gameIdCounter = 1;

function createGame(players = []) {

  const formattedPlayers = players.map(playerName => ({ player: playerName, role: null }));
  const newGame = {
    id: gameIdCounter++,
    players: formattedPlayers,
    status: 'waiting',
    createdAt: new Date(),
  };
  games.push(newGame);
  return newGame;
}




function assignRoles(players) {
  if (!Array.isArray(players) || players.length !== 5) {
    throw new Error('La fonction attend un tableau de 5 joueurs');
  }

  const allRoles = [
    'Imposteur',
    'Robot',
    'Superheros',
    'Double face',
    'La légende',
    'Le farmeur',
  ];

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  const rolesToAssign = shuffle([...allRoles]).slice(0, 5);

  return players.map((player, index) => ({
    player,
    role: rolesToAssign[index],
  }));
}

// Ajoute un joueur à une partie et démarre la partie si complet
function addPlayerToGame(gameId, playerName) {
  const game = games.find(g => g.id === gameId);
  if (!game) throw new Error('Partie introuvable');
  if (game.players.find(p => p.player === playerName)) return game; 
  if (game.players.length >= 5) throw new Error('Partie pleine');

  game.players.push({ player: playerName, role: null });
  console.log("partie mise à jour : ",game)
  if (game.players.length === 5 && game.status !== 'started') {
    game.players = assignRoles(game.players.map(p => p.player));
    game.status = 'started';
    console.log("partie demarré")
    console.log(game)
  }

  return game;
}

module.exports = {
  createGame,
  addPlayerToGame,
};
