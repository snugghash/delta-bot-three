const _ = require('lodash')

const {
  checkCommentForDelta,
  generateDeltaBotCommentFromDeltaComment,
  getDeltaBotReply,
  parseHiddenParams,
  getLastValidCommentId,
  getNewCommentsBeforeCommentId,
} = require('./../utils')
const { verifyThenAward } = require('./../index')
const DeltaBotModule = require('./delta-bot-module')

class CheckUnseenComments extends DeltaBotModule {
  constructor(legacyRedditApi) {
    super(__filename, legacyRedditApi, { lastParsedCommentIDs: [] })
  }
  async bootstrap() {
    await super.bootstrap()
    this.startCron()
  }
  async startCron() {
    try {
      console.log(`${this.moduleName}: Starting Cron Job`)

      const { subredditDriver } = this

      const { lastParsedCommentIDs } = this.state

      // if there isn't a state, bootstrap it
      if (!lastParsedCommentIDs.length) {
        const comments = await subredditDriver.getNewComments()
        this.state = {
          lastParsedCommentIDs: comments.map(comment => comment.name),
        }
      }
      const commentIdToStartBefore = await getLastValidCommentId({
        lastParsedCommentIDs,
        subredditDriver,
      })
      const comments = await getNewCommentsBeforeCommentId({
        atLeastMinutesOld: 5,
        commentId: commentIdToStartBefore,
        subredditDriver,
      })
      for (const comment of comments) {
        if (checkCommentForDelta(comment)) {
          console.log(`There is a delta in comment: ${comment.name}! Check if Delta Bot replied!`)
          const commentWithReplies = await this.reddit
            .getComment(comment.id)
            .fetch()
          const commentReplies = await commentWithReplies.replies.fetchAll({})
          const dbReply = getDeltaBotReply(this.botUsername, commentReplies)
          if (!dbReply) await verifyThenAward(comment)
          else {
            const oldHiddenParems = parseHiddenParams(dbReply.body)
            // TODO make it so it doens't drop an error into the console when undefined
            console.log(`Is it defined ${oldHiddenParems.issues}`)
            const oldIssueCount = Object.keys(oldHiddenParems.issues).length
            const {
              hiddenParams: newHiddenParams,
            } = await generateDeltaBotCommentFromDeltaComment({
              botUsername: this.botUsername,
              subreddit: this.subreddit,
              reddit: this.legacyRedditApi,
              comment,
            })
            if (oldIssueCount > 0 && !_.isEqual(newHiddenParams, oldHiddenParems)) {
              await this.reddit
                .getComment(dbReply.id)
                .delete()
              await verifyThenAward(comment)
            }
          }
        }
      }

      // now update the state
      if (lastParsedCommentIDs[0] !== (_.get(comments, '[0].name') || commentIdToStartBefore)) {
        const alreadyParsedComments = await subredditDriver.getNewComments({
          after: _.get(comments, '[0].name') || commentIdToStartBefore,
        })
        this.state = {
          lastParsedCommentIDs: [_.get(comments, '[0].name') || commentIdToStartBefore].concat(
            alreadyParsedComments.map(comment => comment.name)
          ),
        }
      }
    } catch (err) {
      console.log(err)
    }

    // set the timeout here in case it takes long or hangs,
    // so it doesn't fire off multiple time at once
    setTimeout(() => this.startCron(), 30000)
  }
}

module.exports = CheckUnseenComments
