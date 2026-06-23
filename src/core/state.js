// core/state.js — estado global y persistencia local

export const D = {
  name: '', budget: 30, threshold: 25,
  hormis: [], goals: [], transactions: [],
  customCats: [], aliases: {},
  isPro: false, trialUsed: false, trialEndsAt: null,
  onboarded: false, guideSeen: false,
}

export function load() {
  try {
    const s = localStorage.getItem(SK)
    if (s) Object.assign(D, JSON.parse(s))
  } catch (e) {}
}

export function save() {
  try {
    const { isPro, trialUsed, trialEndsAt, ...rest } = D
    localStorage.setItem(SK, JSON.stringify(rest))
  } catch (e) {}
}

import { CATS } from './constants.js'

export function allCats() {
  return [...CATS, ...(D.customCats || []).map(c => ({ id: 'c_' + c.l, e: c.e, l: c.l }))]
}