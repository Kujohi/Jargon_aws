// This file ensures that certain modules are only imported on the server side
import 'server-only';

export { dbClient } from '@/services/awsDbClient';
export { 
  initializeUserJars,
  checkUserAccumulativeSetup,
  getAccumulativeDashboardData,
  getUserTransactions,
  formatCurrency,
  parseCurrencyToAmount,
  addMonthlyIncome,
  deleteAllUserData
} from '@/services/accumulativeFinancialService'; 