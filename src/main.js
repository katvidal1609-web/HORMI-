// main.js — solo expone funciones nuevas, legacy.js maneja todo lo demás
import { saveBudget, openBudgetModal } from './features/settings/budget.js'
import { saveEditProfile } from './features/settings/profile.js'
import { exportCSV } from './features/analysis/export.js'

// Exponer funciones nuevas globalmente
window.saveBudget = saveBudget
window.openBudgetModal = openBudgetModal
window.saveEditProfile = saveEditProfile
window.exportCSV = exportCSV
