import {
  getQuestions,
  getQuestion,
  postQuestion,
  getAnswers,
  postAnswer
} from '@/utils/api/questions'

export const ACTIONS = {
  GET_QUESTIONS: Symbol('getQuestions'),
  GET_QUESTION: Symbol('getQuestion'),
  POST_QUESTION: Symbol('postQuestion'),
  GET_ANSWERS: Symbol('getAnswers'),
  POST_ANSWER: Symbol('postAnswer')
}

export const REQUEST = {
  [ACTIONS.GET_QUESTIONS]: getQuestions,
  [ACTIONS.GET_QUESTION]: getQuestion,
  [ACTIONS.POST_QUESTION]: postQuestion,
  [ACTIONS.GET_ANSWERS]: getAnswers,
  [ACTIONS.POST_ANSWER]: postAnswer
}

export const COMMITS = {
  [ACTIONS.GET_QUESTIONS]: 'REFRESH_FEED',
  [ACTIONS.GET_QUESTION]: 'FOCUS_QUESTION',
  [ACTIONS.POST_QUESTION]: 'FOCUS_QUESTION',
  [ACTIONS.GET_ANSWERS]: 'FOCUS_ANSWERS',
  [ACTIONS.POST_ANSWER]: 'FOCUS_ANSWERS'
}
