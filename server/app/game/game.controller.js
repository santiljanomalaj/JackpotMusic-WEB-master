const _ = require('lodash');
const Game = require('./game.model');
const utils = require('../../components/utils');
const Promise = require('bluebird');
const moment = require('moment');
const shortid = require('shortid');
const Song = require('../song/song.model');
const Card = require('../card/card.model');
const User = require('../user/user.model');
const Settings = require('../settings/settings.model');
const Mailer = require('../../components/mailer');
const { DateTime } = require('luxon');
const CronJob = require('cron').CronJob;
const stripe = require('stripe')(process.env.STRIPE_CLIENT_SECRET);

const adminEmails = process.env.adminEmails;
const CURRENCY = 'usd';

const WHITELIST_ATTRIBUTES = [
  '_id',
  'category',
  'startTime',
  'url',
  'gameFormData',
  '_createdBy',
  'gameUrl',
  'lobbyMusicUrl',
  'numberOfPlayers',
  'cost',
  'roundData',
  'master',
  '_winningCard',
  'prize',
  'isTest',
  'jackpotWinnerEventPublished',
];

const WHITELIST_REQUEST_ATTRIBUTES = [
  'gameObjects',
  'startTime',
  'isAdmin',
  'category',
  'jackpotWinnerEventPublished',
];

const PLAYER_WHITELIST_ATTRIBUTES = [
  'jackpotWinnerEventPublished',
];

async function chargeForGames() {
  try {
    console.log('Starting cron job for payments...');

    // Get all games that have yet to be paid and are finished or terminated
    const unpaidGames = await Game.find({
      paymentAt: null,
      isTest: { $ne: true },
      $or: [
        { finishedAt: { $ne: null } },
        { terminatedAt: { $ne: null } },
      ],
    });

    if (!unpaidGames.length) {
      console.log('No unpaid games found.');
      return;
    }

    // Group games by location
    const groupedGames = _.groupBy(unpaidGames, '_location');
    const locationIds = Object.keys(groupedGames);
    const unpaidCount = locationIds.reduce((total, groupKey) => total + groupedGames[groupKey].length, 0);
    console.log(`Found ${unpaidCount} unpaid games at ${locationIds.length} locations. Starting charges.`);

    // Track the total amount to know how much to update the Jackpot
    let jackpotTotalAmount = 0;

    // Loop through locations and charge user for unpaid games
    await Promise.each(locationIds, async(locationId) => {
      const user = await User.findOne({ _location: locationId });

      // Collect the amounts from the games
      const totalGames = groupedGames[locationId].length;

      // Collect game ids for query
      const gameIds = groupedGames[locationId].map(o => o._id);

      // Get the total cards (users) for this game
      const cards = await Card.find({ _gameId: { $in: gameIds } });
      const totalCards = cards.length;

      // Create total to be charged
      const pricePerGame = await Settings.findOne({ name: 'price_per_game' });
      const pricePerUser = await Settings.findOne({ name: 'price_per_user' });
      const totalCharge = (totalGames * pricePerGame.value) + (totalCards * pricePerUser.value);

      // Add log info for reference
      console.log(`Charging user: ${user.email} at location: ${locationId}`);
      console.log(`Total Games: ${totalGames}`);
      console.log(`Total Users: ${totalCards}`);
      console.log(`Total amount: ${totalCharge}`);

      // Charge the user this amount
      // Stripe transaction
      // All amounts must be in cents
      try {
        const charge = await stripe.charges.create({
          amount: +(totalCharge * 100).toFixed(2), // Total charge amount in cents
          currency: CURRENCY,
          customer: user.stripeCustomerId, // Stripe customer to be charged
          receipt_email: user.email,
        });

        console.log('Charge object: ', charge);
        if (charge && !charge.failure_message) {
          console.log(`Charge was succesful: ${charge.id}`);

          // Update the jackpot total
          jackpotTotalAmount += totalCharge;

          // Purchase was successful - create the purchase in database
          // Save payment history to user
          user.paymentHistory.push({
            paymentTotal: totalCharge,
            transactionId: charge.id,
            _games: gameIds,
          });
          await user.save();

          // Update all of the games's paid at times
          await Promise.each(groupedGames[locationId], async(game) => {
            console.log('Updating payment date on game id: ', game._id);
            game.paymentAt = new Date();
            await game.save();
          });
        } else {
          console.error('Transaction error: ', charge);
        }
      } catch (error) {
        console.error('Transaction error, in nested catch block: ', error);
        switch (error.type) {
          case 'StripeCardError':
            // A declined card error
            break;
          case 'StripeInvalidRequestError':
            // Invalid parameters were supplied to Stripe's API
            console.log('hit the correct case (StripeInvalidRequestError)');
            break;
          case 'StripeAPIError':
            // An error occurred internally with Stripe's API
            break;
          case 'StripeConnectionError':
            // Some kind of error occurred during the HTTPS communication
            break;
          case 'StripeAuthenticationError':
            // You probably used an incorrect API key
            break;
          case 'StripeRateLimitError':
            // Too many requests hit the API too quickly
            break;
          default:
            console.log('hit the default case');
        }
      }
    });

    // Done with everything
    console.log('Done creating payments.');
    console.log('Now updating Jackpot amount...');

    // Check for jackpot games within the last 24 hours
    const jackpotWinningGames = await Game.find({
      startTime: {
        $lt: new Date(),
        $gte: new Date(new Date().setDate(new Date().getDate() - 1)),
      },
      jackpotWinnerData: {
        $exists: true,
        $ne: null,
      },
    });

    if (jackpotWinningGames && jackpotWinningGames.length) {
      // Reset the Jackpot amount
      Settings.resetJackpot();

      console.log('Done resetting Jackpot amount.');
    } else {
      // Update total jackpot amount
      // Add 10% of the day's earnings to the jackpot
      const jackpotUpdatedAmount = Math.round(jackpotTotalAmount * 0.1);
      console.log('Jackpot increase:', jackpotUpdatedAmount);
      const settings = await Settings.findOne({ name: 'jackpot_amount' });
      console.log('Original Jackpot Amount:', settings.value);
      settings.value += jackpotUpdatedAmount;
      console.log('New Jackpot Amount:', settings.value);
      await settings.save();

      // Done with everything
      console.log('Done updating Jackpot amount.');
    }
  } catch (error) {
    console.error('Error creating payments:', error);
  }
}

/**
 * Start a cron job to charge users for games every night
 * Since we want to run this in the morning in Central time, use noon UTC (~6 am CT)
 */
const cronJob = new CronJob('0 12 * * *', chargeForGames);
cronJob.start();

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
    otherElement = Math.floor(Math.random() * arrayLength);
    arrayLength -= 1;

    currentElement = array[arrayLength];
    array[arrayLength] = array[otherElement];
    array[otherElement] = currentElement;
  }

  return array;
}

/**
 * randomly generates a master playlist for a single round
 * @param {object} roundObject a single round object from game.roundData (i.e. game.roundData.roundOne, etc.)
 * @param {number} listSize rounds one and two contain 25 songs, round three contains 50
 * @param {array} arrayToShuffle an array of song ID's grabbed from a database query by category
 */
function generateMasterPlaylist(roundObject, listSize, arrayToShuffle) {
  if (roundObject) {
    const randomObjects = shuffleArray(arrayToShuffle);
    for (let i = 0; i < listSize; i += 1) {
      const randomSong = randomObjects.shift();
      const newSongObject = {
        _song: randomSong,
      };
      roundObject.push(newSongObject);
    }
  }
}

const GameController = {
  /**
   * Create a new game
   */
  create: async(req, res, next) => {
    try {
      
      const newGames = req.body.gameObjects;
      const startTime = req.body.startTime;
      const isTest = req.body.isTest;
      const games = [];

      // Make sure the user has their billing and location set
      if (!req.user._location || !req.user.stripeCustomerId) {
        return utils.respondWithError(res)('You must add a location and credit card to your account before you may create a game');
      }

      // Make sure the user doesn't have any unpaid games over 24 hours
      const unpaidGames = await req.user.unpaidGames();

      // if (unpaidGames.length && !adminEmails.includes(req.user.email)) {
      //   return utils.respondWithError(res)(
      //     'You have too many unpaid games. Please update your payment method or contact support.'
      //   );
      // }

      await Promise.each(newGames, (async(game, index) => {
        // the following logic creates the master game cards
        // to be used when generating player cards on game start

        // find songs by category
        const songs = await Song.find({ categories: newGames[index].category });

        // shuffle songs in place
        const shuffledSongs = shuffleArray(songs);

        // explictly lay out the structure of the object to be
        // returned in the server response
        const rounds = {
          roundOne: {
            master: [],
            _winningCard: null,
            prize: newGames[index].roundOnePrize,
          },
          roundTwo: {
            master: [],
            _winningCard: null,
            prize: newGames[index].roundTwoPrize,
          },
          roundThree: {
            master: [],
            _winningCard: null,
            prize: newGames[index].roundThreePrize,
          },
        };

        /**
         * App task 6 - Change round 3 from 50 songs to 40
         */
        // create individual rounds ("master lists")
        // .splice() is used here to avoid the possiblity of duplicate entries
        generateMasterPlaylist(rounds.roundOne.master, 25, shuffledSongs.splice(0, 25));
        generateMasterPlaylist(rounds.roundTwo.master, 25, shuffledSongs.splice(0, 25));
        generateMasterPlaylist(rounds.roundThree.master, 40, shuffledSongs.splice(0, 40));

        // Increase the game times by one hour for each index
        const newStartTime = moment(startTime).add(index, 'hours');

        // Build the game object
        const gameObject = {
          category: newGames[index].category,
          startTime: newStartTime,
          gameUrl: `${shortid.generate()}`,
          lobbyMusicUrl: `https://jackpot-music-game.s3.amazonaws.com/category-playlists/${newGames[index].category}.mp3`,
          roundData: rounds,
          _createdBy: req.user,
          _location: req.user._location,
        };

        // Check to see if the this user is an admin to allow a test game
        if (isTest && req.user.isAdmin()) {
          gameObject.isTest = true;
        }

        // Create the new game
        const newGame = await Game.create(gameObject);
        
        // Mail notification for game creating
        
        const mailOptions = [{
            to: process.env.ADMIN_EMAIL1,
            from: process.env.FROM_EMAIL,
            subject: 'Jackpot Game Schedule',
            html: ('../app/game/views/jackpotGame.html'),
          },
          {
            to: process.env.ADMIN_EMAIL2,
            from: process.env.FROM_EMAIL,
            subject: 'Jackpot Game Schedule',
            html: ('../app/game/views/jackpotGame.html'),
          }
        ];
        let month = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
        const user = await User.findById(req.user._doc._id).populate('_location');
        let hours = parseInt(req.body.hours) >= 12 ?  parseInt(req.body.hours)-12 +":" + req.body.minutes + " PM": req.body.hours + ":" + req.body.minutes +" AM"
        const data = {
          location: user._location._doc.location.formatted_address,
          name:  user.displayName,
          email: user.email,
          timezone:req.body.local_timezone,
          month: month[parseInt(req.body.mon)-1],
          date: req.body.date,
          hours: hours
        };
        
        mailOptions.forEach((mailOption) => {
          const mailer = new Mailer(mailOption);
          mailer.sendMail(data);
        })
        games.push(newGame);
      }));

      const response = utils.sanitizeObject(games, WHITELIST_ATTRIBUTES);

      return utils.respondWithResult(res)(response);
    } catch (err) {
      return utils.handleError(next)(err);
    }
  },

  /**
   * Gets a single game
   */
  show: async(req, res, next) => {
    try {
      const game = await Game.findOne({ _id: req.params.id });

      if (game) {
        const response = utils.sanitizeObject(game, PLAYER_WHITELIST_ATTRIBUTES);
        utils.respondWithResult(res)(response);
      } else {
        utils.handleEntityNotFound(res);
      }
    } catch (err) {
      utils.handleError(next)(err);
    }
  },

  /**
   * Start game logic
   * Set the game, first round, and first song's startedAt
   */
  startGame: async(req, res, next) => {
    try {
      const gameId = req.query.gameId;
      const populatedGame = await Game.findOne({ _id: gameId })
        .populate('roundData.roundOne.master._song roundData.roundTwo.master._song roundData.roundThree.master._song');

      // Make sure the game exists
      if (!populatedGame) {
        return utils.respondWithError(res)('This game does not exist');
      }

      // Make sure the user is the creator of the game
      if (String(populatedGame._createdBy) !== String(req.user._id)) {
        return utils.respondWithError(res)('You are not the owner of this game');
      }

      // If game has already started, don't reset the start times
      if (!populatedGame.startedAt) {
        populatedGame.roundData.roundOne.startedAt = new Date();
        populatedGame.roundData.roundOne.master[0].startedAt = new Date();
        populatedGame.startedAt = new Date();
        await populatedGame.save();
      }

      const response = utils.sanitizeObject(populatedGame, WHITELIST_ATTRIBUTES);
      return utils.respondWithResult(res)(response);
    } catch (error) {
      return utils.handleError(next)(error);
    }
  },

  startRound: async(req, res, next) => {
    try {
      const gameId = req.query.gameId;

      // populate songs to find currently playing song and send back with rest of round data
      const populatedGame = await Game.findOne({ _id: gameId })
        .populate('roundData.roundOne.master._song roundData.roundTwo.master._song roundData.roundThree.master._song');

      // Get the current round and start the next round
      const currentRound = populatedGame.currentRound();

      // TODO: make sure startedAt does not already exist so that we don't overwrite it
      populatedGame.roundData[currentRound.name].startedAt = new Date();
      populatedGame.roundData[currentRound.name].master[0].startedAt = new Date();

      await populatedGame.save();

      const response = utils.sanitizeObject(populatedGame, WHITELIST_ATTRIBUTES);

      utils.respondWithResult(res)(response);
    } catch (error) {
      utils.handleError(next)(error);
    }
  },

  /**
   * Update an existing item
   */
  update: async(req, res, next) => {
    try {
      const prizes = [];
      prizes.push(req.body.roundData.roundOne.prize);
      prizes.push(req.body.roundData.roundTwo.prize);
      prizes.push(req.body.roundData.roundThree.prize);
      const updatedItem = utils.sanitizeObject(req.body, WHITELIST_REQUEST_ATTRIBUTES);

      const currentUser = req.user;
      const game = await Game.findOne({ _id: req.params.id });

      if (!game) {
        utils.respondWithError(res)('There was an error finding the game.');
      }

      if (game && currentUser._location._id === game._location._id) {
        _.assign(game, updatedItem);
        game.roundData.roundOne.prize = prizes[0];
        game.roundData.roundTwo.prize = prizes[1];
        game.roundData.roundThree.prize = prizes[2];
        game.lobbyMusicUrl = `https://jackpot-music-game.s3.amazonaws.com/category-playlists/${game.category}.mp3`;
        await game.save();

        const response = utils.sanitizeObject(game, WHITELIST_ATTRIBUTES);
        utils.respondWithResult(res)(response);
      } else {
        utils.handleEntityNotFound(res);
      }
    } catch (err) {
      utils.handleError(next)(err);
    }
  },

  /**
   * Delete an item
   */
  destroy: async(req, res, next) => {
    try {
      const game = await Game.findOne({ _id: req.params.id });

      if (game) {
        await game.remove();
        res.status(204).end();
      } else {
        utils.handleEntityNotFound(res);
      }
    } catch (err) {
      utils.handleError(next)(err);
    }
  },

  addStartAndEndTimestamps: async(req, res, next) => {
    try {
      const gameId = req.params.gameId;
      const songId = req.params.songId;

      const currentGame = await Game.findOne({ _id: gameId })
        .populate('roundData.roundOne.master._song roundData.roundTwo.master._song roundData.roundThree.master._song');

      const currentRound = currentGame.currentRound();

      const master = currentGame.roundData[currentRound.name].master;
      const currentSongIndex = master.findIndex(songToUpdate => String(songToUpdate._song._id) === songId);
      const currentSong = master[currentSongIndex];

      if (currentSongIndex < 0) {
        return utils.respondWithError(res)('This song does not exist.');
      }

      if (currentSongIndex < currentGame.roundData[currentRound.name].master.length - 1) {
        currentSong.finishedAt = new Date();
        master[currentSongIndex + 1].startedAt = new Date();
      } else {
        currentSong.finishedAt = new Date();
        currentGame.roundData[currentRound.name].finishedAt = new Date();

        // Check to see if the game is finishing (last song plays in round three) and set game finishedAt
        if (currentRound.name === Game.roundInfo().ROUND_THREE) {
          currentGame.finishedAt = new Date();
        }
      }

      await currentGame.save();

      const response = utils.sanitizeObject(currentGame, WHITELIST_ATTRIBUTES);
      return utils.respondWithResult(res)(response);
    } catch (error) {
      return utils.handleError(next)(error);
    }
  },

  currentRound: async(req, res, next) => {
    try {
      const gameId = req.params.gameId;

      const currentGame = await Game.findOne({ _id: gameId })
        .populate('roundData.roundOne.master._song roundData.roundTwo.master._song roundData.roundThree.master._song');

      // Build the current round data
      // Check if this is the game owner to return extra info
      const isGameOwner = req.user && String(req.user._location) === String(currentGame._location);
      const currentRound = currentGame.currentRound(isGameOwner);

      // Add total players to the response (total number of "cards" for this game)
      const totalCards = await Card.find({ _gameId: currentGame._id }).count();
      currentRound.playerCount = totalCards || 0;

      utils.respondWithResult(res)(currentRound);
    } catch (error) {
      utils.handleError(next)(error);
    }
  },

  terminateGame: async(req, res, next) => {
    try {
      const gameId = req.params.gameId;

      const currentGame = await Game.findOne({ _id: gameId });

      currentGame.terminatedAt = new Date();

      currentGame.save();

      const response = currentGame;
      utils.respondWithResult(res)(response);
    } catch (error) {
      utils.handleError(next)(error);
    }
  },

  resetGame: async(req, res, next) => {
    try {
      const gameId = req.params.gameId;

      const currentGame = await Game.findOne({ _id: gameId })
        .populate('roundData.roundOne.master._song roundData.roundTwo.master._song roundData.roundThree.master._song');
      const rounds = ['roundOne', 'roundTwo', 'roundThree'];

      rounds.forEach((round) => {
        for (let i = 0; i < currentGame.roundData[round].master.length; i += 1) {
          currentGame.roundData[round].master[i].startedAt = null;
          currentGame.roundData[round].master[i].finishedAt = null;
        }

        if (currentGame.roundData[round]._jackpotCard) {
          currentGame.roundData[round]._jackpotCard = null;
        }

        if (currentGame.terminatedAt) {
          currentGame.terminatedAt = null;
        }

        currentGame.jackpotWinnerData = null;
        currentGame.startedAt = null;
        currentGame.finishedAt = null;

        currentGame.roundData[round]._winningCard = null;
        currentGame.roundData[round].startedAt = null;
        currentGame.roundData[round].finishedAt = null;
      });

      await currentGame.save();
      const response = currentGame;
      utils.respondWithResult(res)(response);
    } catch (error) {
      utils.handleError(next)(error);
    }
  },

  saveJackpotWinnerEvent: async(req, res, next) => {
    try {
      const gameId = req.params.gameId;

      // Get the game to make sure it's real
      const game = await Game.findOne({ _id: gameId });

      game.jackpotWinnerEventPublished = true;

      await game.save();

      return utils.respondWithSuccess(res)('Jackpot winner event has been published!');
    } catch (error) {
      return utils.handleError(next)(error);
    }
  },

  /**
   * Save the jackpot winner data to the game card
   * This expects a gameId, cardId and the user data
   * If the cardId must match the winning card id already saved to the game
   */
  saveJackpotWinnerData: async(req, res, next) => {
    try {
      const gameId = req.params.gameId;
      const cardId = req.body.cardId;
      const firstName = req.body.firstName;
      const phone = req.body.phone;

      // Catch any missing data an return an error
      if (!gameId || !cardId || !firstName || !phone) {
        return utils.respondWithError(res)('You are missing data. Please contact Jackpot.');
      }

      // Get the game to make sure it's real
      const game = await Game.findOne({ _id: gameId });

      // There shouldn't be any winner data yet
      // Since this is an object, check to see if email exists since it is required
      if (game.jackpotWinnerData.email) {
        return utils.respondWithError(res)('Jackpot winner data has already been entered for this game.');
      }

      // Compare the _jackpotCard with the user's card
      // Right now the jackpot only happens on round three
      const jackpotCardId = game.roundData.roundThree._jackpotCard;

      // If all checks out, save user data to the game and notify client
      if (jackpotCardId && String(cardId) === String(jackpotCardId)) {
        game.jackpotWinnerData.firstName = firstName;
        game.jackpotWinnerData.phone = phone;

        await game.save();

        const settings = await Settings.findOne({ name: 'jackpot_amount' });
        const jackpotAmount = settings.value;

        // Notify user the admin the information was received
        const mailOptions = {
          to: process.env.ADMIN_EMAIL,
          from: process.env.FROM_EMAIL,
          subject: 'Jackpot Winner Info',
          html: ('../app/game/views/jackpotWinner.html'),
        };

        const data = {
          data: game.jackpotWinnerData,
          jackpot: jackpotAmount,
        };

        const mailer = new Mailer(mailOptions);
        await mailer.sendMail(data);

        return utils.respondWithSuccess(res)('We have received your info and will follow up soon!');
      }

      return utils.respondWithError(res)('This is not a winning card.');
    } catch (error) {
      return utils.handleError(next)(error);
    }
  },


  sendJacpotWinnerDataWithMail: async(req, res, next) => {
    // Notify user the admin the information was received
    const mailOptions = [{
        to: process.env.ADMIN_EMAIL1,
        from: process.env.FROM_EMAIL,
        subject: 'Jackpot Winner Info',
        html: ('../app/game/views/jackpotWinner.html'),
      },
      {
        to: process.env.ADMIN_EMAIL2,
        from: process.env.FROM_EMAIL,
        subject: 'Jackpot Winner Info',
        html: ('../app/game/views/jackpotWinner.html'),
      }
    ];

    const data = {
      location: req.body.location,
      jackpotPrize: req.body.jackpotPrize,
      name: req.body.name,
      phoneNumber: req.body.phoneNumber,
      email: req.body.email
    };

    mailOptions.forEach((mailOption) => {
      const mailer = new Mailer(mailOption);
      mailer.sendMail(data);
    })

  },
  /**
   * Get the filenames of each round
   * @param req Request
   * @param res Response
   * @param next Next
   */
  getFilenamesByRounds: async({ params: { gameId } }, res, next) => {
    try {
      if (!gameId) {
        return utils.respondWithError(res)('You are missing data. Please contact Jackpot.');
      }

      const game = await Game.findOne({ _id: gameId });

      if (!game) {
        return utils.respondWithError(res)('This game does not exits');
      }

      const filenames = await game.getFilenamesByRounds();

      return utils.respondWithResult(res)(filenames);
    } catch (err) {
      return utils.handleError(next)(err);
    }
  },

};

module.exports = GameController;