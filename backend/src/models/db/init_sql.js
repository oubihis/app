const { existsSync, mkdirSync, writeFileSync } = require('fs')
const { execSync } = require('child_process')
const path = require('path')
const courses = require('./js/courses')
const subjects = require('./js/subjects')
const degreeData = require('../../../data/degrees')
const faculties = require('../../../data/faculties')
const {
    NUM_DUMMY_USERS,
    UNIVERSITY_ID,
    SAMPLE_QUESTIONS,
    SAMPLE_REVIEWS,
    SAMPLE_COMMENTS,
    SAMPLE_USERS
} = require('./test_constants')
const {
    TABLE_NAMES,
    DONT_RECOMMEND,
    RECOMMEND,
    MIN_ENJOY,
    MAX_ENJOY,
    MIN_OPTION,
    MAX_OPTION
} = require('../constants')

const testing = process.env.NODE_ENV === 'production' ? 0 : 1
const DB_NAME = testing ? path.join(__dirname, './test.db')
    : path.join(__dirname, '../../../db/smartcourse.db')

// Seed must be (0, 2147483647)
// PRNG taken from: https://gist.github.com/blixt/f17b47c62508be59987b
let seed = 1
let commentID = 1
const questions = []
const reviews = []
const questionsToLike = []
const reviewsToLike = []
const commentsToLike = []
const userRepMap = {}

// mega query begins here
const initialSQL = `\
BEGIN TRANSACTION;\n\
${
    // uni
    `INSERT INTO ${TABLE_NAMES.UNIVERSITY} (name) VALUES ("UNSW");`
}\n
${
    // faculties
    faculties.map(sqlFaculty).join('\n')
}\n
${
    // degrees
    degreeData.map(sqlDegree).join('\n')
}\n
${
    // subjects
    subjects.map(sqlSubject).join('\n')
}\n
${
    // courses
    courses.map(sqlCourse).join('\n')
    // '\n'
}\n
${
    // questions (only for testing)
    // TODO - Add default questions?
    testing ? courses.map(({ code }) =>
        SAMPLE_QUESTIONS.map(sqlQuestion(code)).join('\n') + '\n').join('')
        : ''
}\n
${
    // reviews (only for testing)
    testing ? courses.map(({ code }) =>
        SAMPLE_REVIEWS.map(sqlReview(code)).join('\n') + '\n').join('')
        : ''
}\n
${
    // comments (only for testing)
    testing ? sqlComments() : ''
}\n
${
    // likes (only for testing)
    testing ? sqlLikes() : ''
}\n
${
    // users (only for testing)
    testing ? sqlUsers() : ''
}\n
COMMIT;`

// Time testing
const timeList = [Date.now() / 1000]

// Change to a known directory
const OLD_DIR = process.cwd()
process.chdir(__dirname)

// Create the database and initialise data with no dependencies,
// if this is being run as a test database or the prod database doesn't exist.
if (testing || !existsSync(DB_NAME)) {
    runSQL(initialSQL, 'init')
}

timeList.push(Date.now() / 1000)
console.log(`Done creating test database! (${((timeList[1] - timeList[0])).toFixed(3)})`)
process.chdir(OLD_DIR)

// these will be hoisted
function sqlQuestion(code) {
    const questionColumns = ['userID', 'code', 'title', 'body', 'pinned'].join(',')
    const userID = nextValue(1, NUM_DUMMY_USERS)
    questions.push({ questionID: questions.length + 1 })
    questionsToLike.push({ objectType: TABLE_NAMES.QUESTIONS, objectID: questions.length, userID })
    return function (question) {
        return `INSERT INTO ${TABLE_NAMES.QUESTIONS} (${questionColumns})
        VALUES (${userID}, "${code}", "${question.title}", "${question.body}", 1);`
    }
}

function sqlReview(code) {
    const reviewColumns = ['userID', 'code', 'title', 'body', 'recommend', 'enjoy',
        'difficulty', 'teaching', 'workload'].join(',')
    const userID = nextValue(1, NUM_DUMMY_USERS)
    reviews.push({ reviewID: reviews.length + 1 })
    reviewsToLike.push({ objectType: TABLE_NAMES.REVIEWS, objectID: reviews.length, userID })
    return function(review) {
        return `INSERT INTO ${TABLE_NAMES.REVIEWS} (${reviewColumns})
        VALUES (${userID}, "${code}", "${review.title}", "${review.body}", 
        ${nextValue(DONT_RECOMMEND, RECOMMEND)}, ${nextValue(MIN_ENJOY, MAX_ENJOY)},
        ${nextValue(MIN_OPTION, MAX_OPTION)}, ${nextValue(MIN_OPTION, MAX_OPTION)},
        ${nextValue(MIN_OPTION, MAX_OPTION)});\n`
    }
}

function sqlFaculty(faculty) {
    return `INSERT INTO ${TABLE_NAMES.FACULTIES} (name) VALUES ("${faculty}");`
}

function sqlDegree(degree) {
    const columns = Object.keys(degree)
        .join(',')
    const placeholders = Object.values(degree)
        .map(item => typeof item === 'number' ? item : `"${item}"`).join(',')

    return `INSERT INTO ${TABLE_NAMES.DEGREES} (${columns}) VALUES (${placeholders});`
}

function sqlSubject(subject) {
    const subjectWithUni = { ...subject, universityID: UNIVERSITY_ID }
    // Prepare query
    const columns = Object.keys(subjectWithUni)
    const placeholders = Object.values(subjectWithUni)
        .map(item => typeof item === 'number' ? item : `"${item}"`).join(',')

    return `INSERT INTO ${TABLE_NAMES.SUBJECTS} (${columns}) VALUES (${placeholders});`
}

function sqlCourse(course) {
    const courseWithUni = { ...course, universityID: UNIVERSITY_ID }
    // Prepare query
    const columns = Object.keys(courseWithUni)
        .join(',')
    const placeholders = Object.values(courseWithUni)
        .map(item => typeof item === 'number' ? item : `"${item
            .replace(/"/g, /'/)
        }"`).join(',')

    return `INSERT INTO ${TABLE_NAMES.COURSES} (${columns}) VALUES (${placeholders});`
}

function genComments(parent) {
    const commentTypes = SAMPLE_COMMENTS
    const minRange = 1
    const maxRange = 3
    const numCommentTypes = commentTypes.length
    const comments = []
    const numComments = nextValue(minRange, maxRange)
    for (let i = 0; i < numComments; i++) {
        const index = nextValue(0, numCommentTypes - 1)
        const uid = nextValue(1, NUM_DUMMY_USERS)
        const comment = {
            ...parent,
            commentParent: 1,
            userID: uid,
            ...commentTypes[index]
        }
        comments.push(comment)
        commentsToLike.push({ objectType: TABLE_NAMES.COMMENTS, objectID: commentID++, userID: uid })
    }
    return comments
}

function sqlComments() {
    let comments = []
    let data = ''

    // Question comments
    for (let parent of questions) {
        comments = comments.concat(genComments(parent))
    }
    data += bulkInsertDB(TABLE_NAMES.COMMENTS, comments)
    comments = []

    // Review comments
    for (let parent of reviews) {
        comments = comments.concat(genComments(parent))
    }
    data += bulkInsertDB(TABLE_NAMES.COMMENTS, comments)

    return data
}

function sqlUsers() {
    const userNames = SAMPLE_USERS
    const suffixes = ['XxX', '!', 's', '!!', '_', '__', 'x']

    let users = []

    for (let i = 1; i <= NUM_DUMMY_USERS; i++) {
        const uid = 'userID' + i
        const displayName =
            userNames[i % userNames.length] +
            // only append a number if we've run out of names
            (i < userNames.length
                ? ''
                // then choose between a simulated birth year and a 'cool' suffix
                : (i % 2
                    ? (90 + Math.trunc(i / userNames.length))
                    // only add a number on the suffix if we're past possible combinations without numbers..
                    // multiply i by 3 to make it look like a birthdate or something
                    : (suffixes[i % suffixes.length] + (i < (userNames.length + suffixes.length * 2) ? '' : i * 2))
                )
            )
        const email = displayName + '@test.com.au'
        const degree = degreeData[nextValue(0, degreeData.length - 1)].name

        users.push({
            id: i,
            uid: uid,
            displayName: displayName,
            email: email,
            degree: degree,
            reputation: userRepMap[i] || 0
        })
    }

    return bulkInsertDB(TABLE_NAMES.USERS, users)
}

function genLikes(parent) {
    const likes = []
    const numLikes = nextValue(-2, 5)
    if (numLikes <= 0) return []
    // choose numLikes consecutive users for these likes...
    const startIndex = nextValue(1, NUM_DUMMY_USERS)

    for (let i = startIndex; i < startIndex + numLikes; ++i) {
        const like = {
            userID: (i % NUM_DUMMY_USERS) + 1,
            // more likely to be positive!
            value: nextValue(1, 10) > 7 ? -1 : 1,
            objectType: parent.objectType,
            objectID: parent.objectID
        }
        // update user reputation for the liked object's user, to be used in initUserTable
        if (parent.userID in userRepMap) {
            userRepMap[parent.userID] += like.value
        } else {
            userRepMap[parent.userID] = like.value
        }
        likes.push(like)
    }
    return likes
}

function sqlLikes() {
    let likes = []
    let data = ''
    for (let parent of questionsToLike) {
        likes = likes.concat(genLikes(parent))
    }
    data += bulkInsertDB(TABLE_NAMES.LIKES, likes)
    likes = []

    for (let parent of reviewsToLike) {
        likes = likes.concat(genLikes(parent))
    }
    data += bulkInsertDB(TABLE_NAMES.LIKES, likes)
    likes = []

    for (let parent of commentsToLike) {
        likes = likes.concat(genLikes(parent))
    }
    data += bulkInsertDB(TABLE_NAMES.LIKES, likes)

    return data
}

/*
 * Returns the value from the PRNG and constraining it from [min, max]
 */
function nextValue(min, max) {
    seed = seed * 16807 % 2147483647
    const range = max - min + 1
    return (seed % range) + min
}

/*
 * Generates an SQL statement to insert multiple rows into a given table.
 * Note: This is vulnerable to SQL injection and should only be used testing.
 */
function bulkInsertDB(table, data) {
    const values = data.map(row => Object.values(row))
    const columns = Object.keys(data[0])
    const SQL_MAX_INSERT = 500
    let sql = ''
    for (var i = 0; i < values.length; i += SQL_MAX_INSERT) {
        sql += `INSERT INTO ${table} (${columns})
        VALUES ${values.slice(i, i + SQL_MAX_INSERT)
        .map(rowValues => `("${rowValues.join('","')}")`).join()};\n`
    }
    return sql
}

/*
 * Writes SQL into a file which is directly piped to sqlite3 via a bash script.
 */
function runSQL(data, stage) {
    const dirname = path.dirname(`./sql/test/${stage}.sql`)
    if (!existsSync(dirname)) {
        mkdirSync(dirname)
    }
    writeFileSync(path.join(__dirname, `./sql/test/${stage}.sql`), data)
    execSync(`bash ${path.join(__dirname, './init.sh')} ${DB_NAME} ${stage}`)
}