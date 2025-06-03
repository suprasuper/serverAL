//var
let games = [];
let gameIdCounter = 1;

//Creer la partie
function createGame(players = []) {
  const formattedPlayers = players.map(p => ({
    playerId: p.playerId,
    playerName: p.playerName,
    avatar: p.avatar,
    role: null
  }));

  const newGame = {
    id: gameIdCounter++,
    players: formattedPlayers,
    status: 'waiting',
    createdAt: new Date(),
  };
  games.push(newGame);
  return newGame;
}

//Assigner les roles
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

  // 👇 Garder les infos playerId et playerName
  return players.map((player, index) => ({
    playerId: player.playerId,
    playerName: player.playerName,
    role: rolesToAssign[index],
    avatar: player.avatar
  }));
}

//Ajouter un joueur à la partie
function addPlayerToGame(gameId, playerId, playerName, avatar) {
  const game = games.find(g => g.id === gameId);
  if (!game) throw new Error('Partie introuvable');
  if (game.players.find(p => p.playerId === playerId)) return game;
  if (game.players.length >= 5) throw new Error('Partie pleine');
  game.players.push({ playerId, playerName, role: null, avatar });
 
  return game;
}

//Avoir la game grace à son ID
function getGameById(gameId) {
  return games.find(g => g.id === gameId);
}

//Commencer la partie ( distribuer role)
function startGame(gameId) {
  const game = games.find(g => g.id === gameId);
  if (!game) throw new Error('Partie introuvable');
  if (game.status === 'started') throw new Error('Partie déjà démarrée');

  if (game.players.length !== 5) throw new Error("La partie doit contenir exactement 5 joueurs");

  game.players = assignRoles(game.players); // Ajoute les rôles
  game.status = 'started';
  return game;
}

//Remove un joueur de la partie
function removePlayerFromGames(playerId) {
  for (const game of games) {
    const index = game.players.findIndex(p => p.playerId === playerId);
    if (index !== -1) {
      game.players.splice(index, 1);

      const playersAfterRemoval = [...game.players];

      // Supprimer la partie si vide
      if (game.players.length === 0) {
        deleteGame(game.id);
      }

      return { gameId: game.id, updatedPlayers: playersAfterRemoval };
    }
  }
  return null;
}

//Supprimer la partie 
function deleteGame(gameId) {
  const index = games.findIndex(g => g.id === gameId);
  if (index !== -1) {
    games.splice(index, 1);
  }
}

//Renvoie le temps écoulé depuis le debut de la partie
function getElapsedSeconds(game) {
  if (!game.startTime) return 0;
  return Math.floor((Date.now() - game.startTime) / 1000);
}

// Renvoie les audios pertinents en fonction du temps écoulé dans la partie
function getAvailableAudioIds(seconds) {
  if (seconds < 300) return [5, 6]; // Moins de 5 minutes
  if (seconds < 900) return [2, 3, 7]; // Entre 5 et 15 minutes
  return [6, 7]; // Plus de 15 minutes
}

// Fonction utilitaire pour tirer un élément au hasard d’un tableau
function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Fonction principale pour démarrer les envois audio au robot
function startRobotAudioLoop(gameId, io, playerSocketMap) {
  const game = getGameById(gameId);
  if (!game) return;

  // Initialise le moment de départ s’il n’existe pas
  if (!game.startTime) {
    game.startTime = Date.now();
  }

  // Trouver le joueur avec le rôle "Robot"
  const robotPlayer = game.players.find(p => p.role === 'Robot');
  if (!robotPlayer) return;

  // Récupérer le socket ID du robot
  const robotSocketId = playerSocketMap.get(robotPlayer.playerId);
  if (!robotSocketId) return;

  // Stocker les IDs déjà envoyés
  const usedAudioIds = new Set();

  // Fonction pour envoyer un audio aléatoire non encore utilisé
  const sendRandomAudio = () => {
    const secondsElapsed = getElapsedSeconds(game);
    const available = getAvailableAudioIds(secondsElapsed);

    // Filtrer ceux déjà utilisés
    const remaining = available.filter(id => !usedAudioIds.has(id));

    if (remaining.length === 0) {
      console.log("Aucun nouvel audio à envoyer pour cette tranche de temps.");
      return;
    }

    const randomAudioId = getRandomElement(remaining);
    usedAudioIds.add(randomAudioId);

    io.to(robotSocketId).emit('robotAudioMessage', { audioId: randomAudioId });
    console.log(`Audio envoyé au robot (ID: ${randomAudioId})`);
  };

  // Envoi immédiat du premier audio
  io.to(robotSocketId).emit('robotAudioMessage', { audioId: 1 })
  setTimeout(() => {
    io.to(robotSocketId).emit('robotAudioMessage', { audioId: 4 });
  }, 30 * 1000);

  // Envoi toutes les 7 minutes
  const intervalId = setInterval(() => {
    sendRandomAudio();
  }, 7 * 60 * 1000); // 7 minutes

  // Stocker l'intervalle pour arrêt futur
  game.robotIntervalId = intervalId;

  console.log(`Loop audio démarrée pour Robot dans la partie ${gameId}`);
}

//Stop le robot sur le lobby
function stopRobotAudioLoop(gameId) {
  const game = getGameById(gameId);
  if (game?.robotIntervalId) {
    clearInterval(game.robotIntervalId);
    delete game.robotIntervalId;
    console.log(`Loop audio stoppée pour la partie ${gameId}`);
  }
}


module.exports = {
  createGame,
  getGameById,
  deleteGame,
  removePlayerFromGames,
  startGame,
  addPlayerToGame,
  startRobotAudioLoop,
  stopRobotAudioLoop
};
