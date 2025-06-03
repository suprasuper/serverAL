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
  console.log("jajoute ", playerName)
  const game = games.find(g => g.id === gameId);
  if (!game) throw new Error('Partie introuvable');
  if (game.players.find(p => p.playerId === playerId)) return game;
  if (game.players.length >= 5) throw new Error('Partie pleine');
  game.players.push({ playerId, playerName, role: null, avatar });
  console.log("nouvelle lsite de joueurs : ", game.players)
  // if (game.players.length === 5 && game.status !== 'started') {
  //   game.players = assignRoles(game.players); // 👈 passe les objets complets
  //   game.status = 'started';
  // }
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

//Commencer le robot sur le lobby
function startRobotAudioLoop(gameId, io, playerSocketMap) {
  const game = getGameById(gameId);
  if (!game) return;

  //On cherche dans la partie qui est le robot
  const robotPlayer = game.players.find(p => p.role === 'Robot');
  console.log("robot trouvé : ", robotPlayer)
  if (!robotPlayer) return;

  //Cherche l'id socket du robot dans mon playerSocketMap
  const robotSocketId = playerSocketMap.get(robotPlayer.playerId);
  if (!robotSocketId) return;

  let audioIndex = 0;
  const audioIds = [1, 2, 3, 4, 5];


  // Envoi immédiat du premier message
  io.to(robotSocketId).emit('robotAudioMessage', { audioId: audioIds[0] });
  audioIndex++;

  //Envoie tte les 7 minutes 
  const intervalId = setInterval(() => {
    const audioId = audioIds[audioIndex % audioIds.length];
    io.to(robotSocketId).emit('robotAudioMessage', { audioId });
    audioIndex++;
  }, 7 * 60 * 1000); // 7 minutes

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
