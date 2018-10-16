/* All inputs should be validated in this class that are comment related */
class Comment {
    constructor(db) {
        console.log('initialising ORM Comment object')
        this.db = db
    }

    /**
     * Post a new comment
     * @param   {object} queryObject   Contains the type of id and its value
     * @param   {number} pageNumber
     * @returns {Array}
     */
    postComment(queryObject, { body, userID }) {
        const [ key, value ] = Object.entries(queryObject)[0]
        return this.db
            .insert('comment', { [key]: value, body, userID })
            /* Still not sure on this, seems wasteful to send all new data */
            .then((id) => ({ body, userID, id, timestamp: Date.now() }))
    }

    /**
     * Get all of dem comments for a specific question
     * @param   {object} queryObject
     * @param   {number} pageNumber
     * @returns {Array}
     */
    getComments(queryObject, pageNumber, pageSize) {
        const [ key, value ] = Object.entries(queryObject)[0]
        const offset = (pageSize * pageNumber) - pageSize
        return this.db
            .queryAll(`SELECT * FROM comment WHERE ${key}=? ORDER BY timestamp DESC LIMIT ?, ?`,
                [value, offset, pageSize])
    }

    /**
     * Gets the total number of comments for a question/review
     * @param   {string} code        The code of the course
     * @returns {object}
     */
    getCommentCount(queryObject) {
        const [key, value] = Object.entries(queryObject)[0]
        return this.db
            .queryAll(`SELECT COUNT() FROM comment WHERE ${key}=?`,
                [value])
    }

    /**
     * Edit a comment
     * @param {number} id           Id of the comment to be edited
     * @param {object} data         Relevant fields that need to be updated
     */
    editComment(id, data) {
        return Promise.resolve({ id, data })
    }
}

let Singleton = null

/**
 * @param {object} db defaults to the db instance
 */
module.exports = function(db) {
    if (!db) {
        /* app environment, dev or prod */
        return (Singleton = Singleton ? Singleton : new Comment(require('./db'))) // eslint-disable-line
    }
    /* to allow injection */
    return new Comment(db)
}
