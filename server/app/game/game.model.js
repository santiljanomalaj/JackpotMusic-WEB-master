const mongoose = require('mongoose');

const Song = require('../song/song.model');

const ROUND_INFO = {
  roundData: 'roundData',
  roundOne: 'roundOne',
  roundTwo: 'roundTwo',
  roundThree: 'roundThree',
  startedAt: 'startedAt',
  finshedAt: 'finishedAt',
};

const GameSchema = new mongoose.Schema({
  category: { type: String },
  startTime: { type: Date },
  _createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  _location: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
  gameUrl: { type: String },
  lobbyMusicUrl: { type: String },
  terminatedAt: { type: Date },
  startedAt: { type: Date },
  finishedAt: { type: Date },
  jackpotWinnerEventPublished: { type: Boolean },
  jackpotWinnerData: {
    firstName: String,
    phone: String,
  },
  roundData: {
    roundOne: {
      master: [
        {
          _song: { type: mongoose.Schema.Types.ObjectId, ref: 'Song' },
          startedAt: { type: Date, default: null },
          finishedAt: { type: Date, default: null },
        },
      ],
      _winningCard: { type: mongoose.Schema.Types.ObjectId, ref: 'Card' },
      winningCode: { type: String },
      prize: { type: String },
      startedAt: { type: Date, default: null },
      finishedAt: { type: Date, default: null },
    },
    roundTwo: {
      master: [
        {
          _song: { type: mongoose.Schema.Types.ObjectId, ref: 'Song' },
          startedAt: { type: Date, default: null },
          finishedAt: { type: Date, default: null },
        },
      ],
      _winningCard: { type: mongoose.Schema.Types.ObjectId, ref: 'Card' },
      winningCode: { type: String },
      prize: { type: String },
      startedAt: { type: Date, default: null },
      finishedAt: { type: Date, default: null },
    },
    roundThree: {
      master: [
        {
          _song: { type: mongoose.Schema.Types.ObjectId, ref: 'Song' },
          startedAt: { type: Date, default: null },
          finishedAt: { type: Date, default: null },
        },
      ],
      _winningCard: { type: mongoose.Schema.Types.ObjectId, ref: 'Card' },
      winningCode: { type: String },
      _jackpotCard: { type: mongoose.Schema.Types.ObjectId, ref: 'Card' },
      prize: { type: String },
      startedAt: { type: Date, default: null },
      finishedAt: { type: Date, default: null },
    },
  },
  paymentAt: { type: Date },
  isTest: { type: Boolean },
}, { timestamps: true });

/**
 * Pre-save hooks
 */

// Add the other file urls for any images
// GameSchema.pre('save', function(next) {

// });

/**
 * Methods
 */
GameSchema.methods = {

  /**
   * Builds the current round object that gets returned
   * Optionally set isGameOwner to true to return the winningCodes
   * @param {Boolean} isGameOwner Add more info if true
   */
  currentRound(isGameOwner = false) {
    const currentRoundObject = {
      name: null,
      currentlyPlayingSong: null,
      currentlyPlayingSongIndex: null,
      currentRoundPrize: null,
      terminatedAt: null,
      playerCount: null,
      roundData: {
        roundOne: {
          startedAt: null,
          finishedAt: null,
        },
        roundTwo: {
          startedAt: null,
          finishedAt: null,
        },
        roundThree: {
          startedAt: null,
          finishedAt: null,
        },
      },
    };

    // Check to see if game has been terminated by the host
    if (this.terminatedAt) {
      currentRoundObject.terminatedAt = this.terminatedAt;
    }

    // Round one check
    if (this.roundData[ROUND_INFO.roundOne].startedAt && !this.roundData[ROUND_INFO.roundOne].finishedAt) {
      currentRoundObject.name = ROUND_INFO.roundOne;
      // send back currently playing song for player song info button
      currentRoundObject.currentlyPlayingSongIndex = this.roundData[ROUND_INFO.roundOne].master.findIndex(songToFind => songToFind.startedAt && !songToFind.finishedAt);
      currentRoundObject.currentlyPlayingSong = this.roundData[ROUND_INFO.roundOne].master[currentRoundObject.currentlyPlayingSongIndex];
      currentRoundObject.currentRoundPrize = this.roundData[ROUND_INFO.roundOne].prize;
    }

    // Round two check
    // If roundTwo has started but not finished or
    // If round one has finished, but round two has not started yet is also roundTwo
    if ((this.roundData[ROUND_INFO.roundTwo].startedAt && !this.roundData[ROUND_INFO.roundTwo].finishedAt) ||
      (this.roundData[ROUND_INFO.roundOne].finishedAt && !this.roundData[ROUND_INFO.roundTwo].startedAt)) {
      currentRoundObject.name = ROUND_INFO.roundTwo;
      // send back currently playing song for player song info button
      currentRoundObject.currentlyPlayingSongIndex = this.roundData[ROUND_INFO.roundTwo].master.findIndex(songToFind => songToFind.startedAt && !songToFind.finishedAt);
      currentRoundObject.currentlyPlayingSong = this.roundData[ROUND_INFO.roundTwo].master[currentRoundObject.currentlyPlayingSongIndex];
      currentRoundObject.currentRoundPrize = this.roundData[ROUND_INFO.roundTwo].prize;
    }

    // Round three check
    // If roundThree has started but not finished or
    // If round two has finished, but round two has not started yet is also roundTwo
    if ((this.roundData[ROUND_INFO.roundThree].startedAt && !this.roundData[ROUND_INFO.roundThree].finishedAt) ||
      (this.roundData[ROUND_INFO.roundTwo].finishedAt && !this.roundData[ROUND_INFO.roundThree].startedAt)) {
      currentRoundObject.name = ROUND_INFO.roundThree;
      // send back currently playing song for player song info button
      currentRoundObject.currentlyPlayingSongIndex = this.roundData[ROUND_INFO.roundThree].master.findIndex(songToFind => songToFind.startedAt && !songToFind.finishedAt);
      currentRoundObject.currentlyPlayingSong = this.roundData[ROUND_INFO.roundThree].master[currentRoundObject.currentlyPlayingSongIndex];
      currentRoundObject.currentRoundPrize = this.roundData[ROUND_INFO.roundThree].prize;
    }

    // Set round data
    // This will match the master round data
    currentRoundObject.roundData[ROUND_INFO.roundOne].name = this.roundData[ROUND_INFO.roundOne].name;
    currentRoundObject.roundData[ROUND_INFO.roundOne].startedAt = this.roundData[ROUND_INFO.roundOne].startedAt;
    currentRoundObject.roundData[ROUND_INFO.roundOne].finishedAt = this.roundData[ROUND_INFO.roundOne].finishedAt;
    currentRoundObject.roundData[ROUND_INFO.roundOne]._winningCard = this.roundData[ROUND_INFO.roundOne]._winningCard;
    currentRoundObject.roundData[ROUND_INFO.roundTwo].name = this.roundData[ROUND_INFO.roundTwo].name;
    currentRoundObject.roundData[ROUND_INFO.roundTwo].startedAt = this.roundData[ROUND_INFO.roundTwo].startedAt;
    currentRoundObject.roundData[ROUND_INFO.roundTwo].finishedAt = this.roundData[ROUND_INFO.roundTwo].finishedAt;
    currentRoundObject.roundData[ROUND_INFO.roundTwo]._winningCard = this.roundData[ROUND_INFO.roundTwo]._winningCard;
    currentRoundObject.roundData[ROUND_INFO.roundThree].name = this.roundData[ROUND_INFO.roundThree].name;
    currentRoundObject.roundData[ROUND_INFO.roundThree].startedAt = this.roundData[ROUND_INFO.roundThree].startedAt;
    currentRoundObject.roundData[ROUND_INFO.roundThree].finishedAt = this.roundData[ROUND_INFO.roundThree].finishedAt;
    currentRoundObject.roundData[ROUND_INFO.roundThree]._winningCard = this.roundData[ROUND_INFO.roundThree]._winningCard;
    currentRoundObject.roundData[ROUND_INFO.roundThree]._jackpotCard = this.roundData[ROUND_INFO.roundThree]._jackpotCard;

    // Winning codes should only be returned if this user is the game creator
    if (isGameOwner) {
      currentRoundObject.roundData[ROUND_INFO.roundOne].winningCode = this.roundData[ROUND_INFO.roundOne].winningCode;
      currentRoundObject.roundData[ROUND_INFO.roundTwo].winningCode = this.roundData[ROUND_INFO.roundTwo].winningCode;
      currentRoundObject.roundData[ROUND_INFO.roundThree].winningCode = this.roundData[ROUND_INFO.roundThree].winningCode;
    }

    return currentRoundObject;
  },

  /**
   * Returns the filenames of the songs of each round.
   */
  async getFilenamesByRounds() {
    // Current round is gotten
    const { name, currentlyPlayingSongIndex } = this.currentRound(false);
    const roundNames = [ROUND_INFO.roundOne, ROUND_INFO.roundTwo, ROUND_INFO.roundThree];
    const indexOfCurrentRound = roundNames.indexOf(name);

    const roundsUsed =
      indexOfCurrentRound === -1
        ? roundNames
        : roundNames
          .slice(indexOfCurrentRound);

    const roundsData =
      roundsUsed
        .map(roundName => this.roundData[roundName].master);

    // Filenames are gotten for each round
    const rounds = [];
    let index = currentlyPlayingSongIndex === null ? 0 : currentlyPlayingSongIndex;

    for (let i = 0; i < roundsData.length; i++) {
      const round = [];
      const current = roundsData[i];

      for (let j = index; j < current.length; j++) {
        const { _song } = current[j];
        // eslint-disable-next-line no-await-in-loop
        const { filename } = await Song.findOne({ _id: _song });
        round.push(filename);
      }

      rounds.push(round);
      index = 0;
    }

    return rounds;
  },
};

GameSchema.statics = {

  roundInfo() {
    return {
      ROUND_ONE: 'roundOne',
      ROUND_TWO: 'roundTwo',
      ROUND_THREE: 'roundThree',
    };
  },

  populateForAdmin() {
    return '_locations _createdBy _relationship';
  },

};

module.exports = mongoose.model('Game', GameSchema);
