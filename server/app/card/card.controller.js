const _ = require('lodash');
const Card = require('./card.model');
const utils = require('../../components/utils');
const Game = require('../game/game.model');
const Settings = require('../settings/settings.model');

const WHITELIST_ATTRIBUTES = [
  '_id',
  '_gameId',
  'roundOne',
  'roundTwo',
  'roundThree',
  '_song',
  'clickedAt',
  'isDisabled',
  'selectionStatus',
];

const WHITELIST_REQUEST_ATTRIBUTES = [
  '_id',
  '_gameId',
  'roundOne',
  'roundTwo',
  'roundThree',
  '_song',
  'clickedAt',
  'isDisabled',
  'selectionStatus',
];

// helper methods for song shuffling and game card generation
/**
 * shuffles an array in place using Fisher-Yates Shuffle
 * https://bost.ocks.org/mike/shuffle/
 * @param {*} array the array to be shuffled
 * @returns the shuffled array
 */

function shuffleArray(array) {
  let arrayLength = array.length;
  let currentElement;
  let otherElement;

  while (arrayLength) {
    otherElement = Math.floor(Math.random() * arrayLength--);

    currentElement = array[arrayLength];
    array[arrayLength] = array[otherElement];
    array[otherElement] = currentElement;
  }

  return array;
}

/**
 * randomly generates player card when a player joins the game
 * @param {*} roundsObject in this case, the individual round on a Card
 * @param {*} arrayToShuffle a Game's round's master 'card'
 * @param {*} cardSize rounds one and two contain 10 songs, round three contains 15 songs
 * .slice() is used here as we DO NOT want to alter the master list
 */

function generatePlayerCards(roundsObject, cardSize, arrayToShuffle, isTestGame = false) {
  if (roundsObject) {
    // If this is a test game, don't shuffle the card
    const randomObjects = !isTestGame ? shuffleArray(arrayToShuffle) : arrayToShuffle;

    for (let i = 0; i < cardSize; i++) {
      const randomSong = randomObjects.shift();
      const newSongObject = {
        _song: randomSong._song,
      };
      roundsObject.push(newSongObject);
    }
  }
}

const SELECTION_STATUSES = {
  default: 'default',
  correct: 'correct',
  incorrect: 'incorrect',
};

const ROUND_LIMITS = {
  roundsOneAndTwo: 10,
  roundThree: 15,
  jackpot: 15,
};

const CardController = {
  /**
   * Create a new card
   */
  create: async (req, res, next) => {
    try {
      const cardId = req.body.cardId;
      const gameId = req.body._gameId;

      // if a cardId exists, find the card and populate it
      if (cardId && gameId) {
        const playerCard = await Card.findOne({ _id: cardId, _gameId: gameId })
          .populate('roundOne._song roundTwo._song roundThree._song');

        // if the populated player card exists, send it back to the client
        if (playerCard) {
          const response = utils.sanitizeObject(playerCard, WHITELIST_ATTRIBUTES);
          return utils.respondWithResult(res)(response);
        }
      }

      // otherwise, create a new player card, populate it, and send it to the client
      const newCard = utils.sanitizeObject(req.body, WHITELIST_REQUEST_ATTRIBUTES);
      const card = await Card.create(newCard);

      const updatedCard = await Card.findOne({ _id: card._id });
      const currentGame = await Game.findOne({ _id: updatedCard._gameId });

      if (currentGame && updatedCard) {
        generatePlayerCards(updatedCard.roundOne, 10, currentGame.roundData.roundOne.master, currentGame.isTest);
        generatePlayerCards(updatedCard.roundTwo, 10, currentGame.roundData.roundTwo.master, currentGame.isTest);
        generatePlayerCards(updatedCard.roundThree, 15, currentGame.roundData.roundThree.master, currentGame.isTest);
      }

      await updatedCard.save();

      const populatedCard = await Card.findOne({ _id: updatedCard._id })
        .populate('roundOne._song roundTwo._song roundThree._song');

      const response = utils.sanitizeObject(populatedCard, WHITELIST_ATTRIBUTES);
      return utils.respondWithResult(res)(response);
    } catch (err) {
      return utils.handleError(next)(err);
    }
  },

  addSongTimestamp: async (req, res, next) => {
    try {
      const cardId = req.params.cardId;
      const songId = req.params.songId;
      // get the current player's card
      const playerCard = await Card.findOne({ _id: cardId })
        .populate('roundOne._song roundTwo._song roundThree._song _gameId _gameId.roundData.roundOne.master _gameId.roundData.roundTwo.master _gameId.roundData.roundThree.master');

      console.log('ADD TIMESATAMP');
      if (!playerCard) {
        return utils.respondWithError('This card does not exist.');
      }

      // get the current game
      const currentGame = await Game.findOne({ _id: playerCard._gameId._id });

      // get the current round
      const currentRound = currentGame.currentRound();

      // add clickedAt timestamp to clicked song on player's card
      const selectedSong = playerCard[currentRound.name].find(songToUpdate => String(songToUpdate._song._id) === songId);

      if (!selectedSong) {
        return utils.respondWithError(res)('This song does not exist.');
      }

      // add timestamp to song on click
      selectedSong.clickedAt = new Date();

      // currently playing song has startedAt but not a finishedAt
      const masterSongReference = playerCard._gameId.roundData[currentRound.name].master.find(songToFind => songToFind.startedAt && !songToFind.finishedAt);

      if (!masterSongReference) {
        return utils.respondWithError(res)('There is no currently playing song.');
      }

      const playedSongs = currentGame.roundData[currentRound.name].master.map((song) => {
        if (song.startedAt) {
          return String(song._song);
        }
      });

      // mark a song on a player's card as either correct or incorrect
      if (playedSongs.includes(String(selectedSong._song._id))) {
        selectedSong.selectionStatus = SELECTION_STATUSES.correct;

        // Check for a winning card:
        // If there is already a winner for this round, skip the check for a winner
        if (!currentGame.roundData[currentRound.name]._winningCard) {
          // keeps a running tally of correct selections from a player's card
          let numberCorrect = 0;

          for (let i = 0; i < playerCard[currentRound.name].length; i++) {
            if (playerCard[currentRound.name][i].selectionStatus === SELECTION_STATUSES.correct) {
              ++numberCorrect;
            }
          }

          // Logic for round three of the game
          if (currentRound.name === Game.roundInfo().ROUND_THREE && numberCorrect === ROUND_LIMITS.roundThree) {
            // Check for the Jackpot in the third round:
            // If there is already a jackpot winner skip the logic

            if (!currentGame.roundData[currentRound.name]._jackpotCard) {
              // find the index of the currently playing song
              const masterSongReferenceIndex = playerCard._gameId.roundData[currentRound.name].master.indexOf(masterSongReference);
              // check to see if the number correct meets round three criteria and if the currently playing song is within the jackpot limit
              // to win the jackpot, you must get all fifteen of your songs within the first 27 songs played (out of 50)
              const jackpotThreshold = await Settings.findOne({ name: 'jackpot_threshold' });
              const jackpotRequiredSongCount = await Settings.findOne({ name: 'jackpot_required_song_count' });

              if (masterSongReferenceIndex + 1 >= jackpotRequiredSongCount.value && masterSongReferenceIndex <= jackpotThreshold.value && masterSongReferenceIndex > -1) {
                // save reference to the winning card for jackpot
                currentGame.roundData[currentRound.name]._jackpotCard = playerCard._id;
              }
            }

            // Round is over
            currentGame.roundData[currentRound.name].finishedAt = new Date();

            // Game is over
            currentGame.finishedAt = new Date();

            // save the ID of the winning card on the round object in the current game (used for UI changes on the front-end)
            currentGame.roundData[currentRound.name]._winningCard = playerCard._id;

            // Create a random code for the winning card to confirm a winner
            currentGame.roundData[currentRound.name].winningCode = Card.generateWinningCode();

          // Logic for rounds one and two of the game
          } else if (currentRound.name !== Game.roundInfo().ROUND_THREE && numberCorrect === ROUND_LIMITS.roundsOneAndTwo) {
            // round is over
            currentGame.roundData[currentRound.name].finishedAt = new Date();

            // save the ID of the winning card on the round object in the current game (used for UI changes on the front-end)
            currentGame.roundData[currentRound.name]._winningCard = playerCard._id;

            // Create a random code for the winning card to confirm a winner
            currentGame.roundData[currentRound.name].winningCode = Card.generateWinningCode();
          }
        }

        // These can save at the same time
        await Promise.all([
          playerCard.save(),
          currentGame.save(),
        ]);

        // Repopulate the _gameId since the game now has new data
        await playerCard.populate('_gameId').execPopulate();
      } else {
        selectedSong.selectionStatus = SELECTION_STATUSES.incorrect;
        await playerCard.save();
      }

      // Remove the winningCodes from any non-winning clicks
      if (String(currentGame.roundData[currentRound.name]._winningCard) !== String(playerCard._id)) {
        playerCard._gameId.roundData.roundOne.winningCode = null;
        playerCard._gameId.roundData.roundTwo.winningCode = null;
        playerCard._gameId.roundData.roundThree.winningCode = null;
        playerCard._gameId.roundData.roundOne._winningCard = null;
        playerCard._gameId.roundData.roundTwo._winningCard = null;
        playerCard._gameId.roundData.roundThree._winningCard = null;
        playerCard._gameId.roundData.roundThree._jackpotCard = null;
      }

      const response = utils.sanitizeObject(playerCard, WHITELIST_ATTRIBUTES);
      utils.respondWithResult(res)(response);
    } catch (error) {
      utils.handleError(next)(error);
    }
  },

};

module.exports = CardController;
