import 'server-only';
import { dbClient } from './awsDbClient';

// Database Refresh Functions (for table-based approach)
export const refreshJarDashboardData = async () => {
  try {
    const { error } = await dbClient.rpc('refresh_jar_dashboard_data');
    if (error) throw error;
  } catch (error) {
    console.error('Error refreshing jar dashboard data:', error);
    throw error;
  }
};

export const refreshCurrentJarBalances = async () => {
  try {
    const { error } = await dbClient.rpc('refresh_current_jar_balances');
    if (error) throw error;
  } catch (error) {
    console.error('Error refreshing current jar balances:', error);
    throw error;
  }
};

export const refreshMonthlyIncomeSummary = async () => {
  try {
    const { error } = await dbClient.rpc('refresh_monthly_income_summary');
    if (error) throw error;
  } catch (error) {
    console.error('Error refreshing monthly income summary:', error);
    throw error;
  }
};

// User Management Functions
export const getUserById = async (userId) => {
  try {
    const { data, error } = await dbClient.select('users', {
      where: { id: userId }
    });

    if (error) throw error;
    return data[0] || null;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
};

export const getUserByEmail = async (email) => {
  try {
    const { data, error } = await dbClient.select('users', {
      where: { email: email }
    });

    if (error) throw error;
    return data[0] || null;
  } catch (error) {
    console.error('Error fetching user by email:', error);
    throw error;
  }
};

// Jar Categories Functions
export const getJarCategories = async () => {
  try {
    const { data, error } = await dbClient.select('jar_categories', {
      orderBy: 'name'
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching jar categories:', error);
    throw error;
  }
};

export const getJarCategoryById = async (categoryId) => {
  try {
    const { data, error } = await dbClient.select('jar_categories', {
      where: { id: categoryId }
    });

    if (error) throw error;
    return data[0] || null;
  } catch (error) {
    console.error('Error fetching jar category:', error);
    throw error;
  }
};

// Monthly Income Functions
export const addMonthlyIncome = async (userId, monthYear, totalIncomeCents, allocationPercentages) => {
  try {
    // Check if entry already exists for this user and month
    const { data: existingEntry, error: checkError } = await dbClient.select('monthly_income_entries', {
      where: { user_id: parseInt(userId), month_year: monthYear }
    });

    if (checkError) throw checkError;

    let incomeEntry;
    if (existingEntry && existingEntry.length > 0) {
      // Delete existing transactions for this month and user to prevent duplicates
      const { error: deleteTransactionsError } = await dbClient.query(
        'DELETE FROM transactions WHERE user_id = $1 AND monthly_income_entry_id = $2',
        [parseInt(userId), existingEntry[0].id]
      );
      
      if (deleteTransactionsError) throw deleteTransactionsError;

      // Update existing entry
      const { data: updateData, error: updateError } = await dbClient.update(
        'monthly_income_entries',
        {
          total_income_cents: totalIncomeCents,
          allocation_percentages: JSON.stringify(allocationPercentages)
        },
        { user_id: parseInt(userId), month_year: monthYear },
        { returning: '*' }
      );

      if (updateError) throw updateError;
      incomeEntry = updateData[0];
    } else {
      // Create new entry
      const { data: insertData, error: incomeError } = await dbClient.insert(
        'monthly_income_entries',
        {
          user_id: parseInt(userId),
          month_year: monthYear,
          total_income_cents: totalIncomeCents,
          allocation_percentages: JSON.stringify(allocationPercentages)
        },
        { returning: '*' }
      );

      if (incomeError) throw incomeError;
      incomeEntry = insertData[0];
    }

    // Add income transactions to each jar based on allocation
    const jarCategories = await getJarCategories();
    const transactions = [];

    // Set transaction date to start of the month using UTC to avoid timezone issues
    const [year, month] = monthYear.split('-');
    const transactionDate = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, 1, 0, 0, 0, 0));

    for (const category of jarCategories) {
      const percentage = allocationPercentages[category.name];
      if (percentage && percentage > 0) {
        const allocatedAmount = Math.round((totalIncomeCents * percentage) / 100);
        
        // Create transaction for this jar with the start of month date
        const { error: transactionError } = await dbClient.insert('transactions', {
          user_id: parseInt(userId),
          jar_category_id: category.id,
          amount_cents: allocatedAmount,
          description: `Monthly income allocation for ${category.name}`,
          source: 'monthly_income',
          monthly_income_entry_id: incomeEntry.id,
          occurred_at: transactionDate.toISOString() // Set to start of month
        });

        if (transactionError) throw transactionError;
        transactions.push({
          categoryName: category.name,
          amount: allocatedAmount
        });
      }
    }

    // Trigger refresh of the dashboard data tables
    try {
      await dbClient.query('SELECT refresh_jar_dashboard_data()');
    } catch (refreshError) {
      console.warn('Warning: Failed to refresh dashboard data:', refreshError);
    }

    return { incomeEntry, transactions };
  } catch (error) {
    console.error('Error adding monthly income:', error);
    throw error;
  }
};

// Initialize user jars for new users
export const initializeUserJars = async (userId) => {
  const startTime = Date.now();
  try {
    console.log(`[${new Date().toISOString()}] Starting jar initialization for user ${userId}`);
    // Check if user already has jars
    const { data: existingJars, error: checkError } = await dbClient.select('user_jars', {
      where: { user_id: parseInt(userId) }
    });

    if (checkError) throw checkError;

    if (existingJars && existingJars.length > 0) {
      console.log('User already has jars initialized');
      return;
    }

    // Get all jar categories
    const { data: categories, error: categoriesError } = await dbClient.select('jar_categories');

    if (categoriesError) throw categoriesError;

    // Create user_jars entries in a single batch insert
    const jarEntries = categories.map(category => ({
      user_id: parseInt(userId),
      category_id: category.id
    }));

    const { error: jarError } = await dbClient.query(
      `INSERT INTO user_jars (user_id, category_id) 
       SELECT * FROM UNNEST($1::int[], $2::int[])`,
      [
        Array(categories.length).fill(parseInt(userId)),
        categories.map(c => c.id)
      ]
    );

      if (jarError) throw jarError;
    const duration = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] Initialized ${categories.length} jars for user ${userId} in ${duration}ms`);
  } catch (error) {
    console.error('Error initializing user jars:', error);
    throw error;
  }
};

// Jar Dashboard Functions
export const getJarDashboardData = async (userId) => {
  try {
    const { data, error } = await dbClient.select('jar_dashboard_data', {
      where: { user_id: parseInt(userId) },
      orderBy: 'category_name'
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching jar dashboard data:', error);
    throw error;
  }
};

export const getCurrentJarBalances = async (userId) => {
  try {
    const { data, error } = await dbClient.select('current_jar_balances', {
      where: { user_id: parseInt(userId) },
      orderBy: 'category_name'
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching current jar balances:', error);
    throw error;
  }
};

export const getMonthlyIncomeSummary = async (userId, monthYear = null) => {
  try {
    const whereClause = { user_id: parseInt(userId) };
    if (monthYear) {
      whereClause.month_year = monthYear;
    }

    const { data, error } = await dbClient.select('monthly_income_summary', {
      where: whereClause,
      orderBy: 'month_year DESC, category_name'
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching monthly income summary:', error);
    throw error;
  }
};

// Transaction Functions
export const addTransaction = async (userId, jarCategoryId, amountCents, description, source = 'manual') => {
  try {
    const { data, error } = await dbClient.insert(
      'transactions',
      {
        user_id: parseInt(userId),
        jar_category_id: jarCategoryId,
        amount_cents: amountCents,
        description: description,
        source: source
      },
      { returning: '*' }
    );

    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error('Error adding transaction:', error);
    throw error;
  }
};

export const getUserTransactions = async (userId, options = {}) => {
  try {
    const {
      jarCategoryId = null,
      limit = null, // Default to no limit for analytics
      offset = 0,
      startDate = null,
      endDate = null,
      searchKeywords = []
    } = options;

    let query = `
      SELECT t.*, jc.name as category_name 
      FROM transactions t
      JOIN jar_categories jc ON t.jar_category_id = jc.id
      WHERE t.user_id = $1
    `;
    const params = [parseInt(userId)];
    let paramIndex = 2;

    if (jarCategoryId) {
      query += ` AND t.jar_category_id = $${paramIndex}`;
      params.push(jarCategoryId);
      paramIndex++;
    }

    if (startDate) {
      query += ` AND t.occurred_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND t.occurred_at <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    if (searchKeywords && searchKeywords.length > 0) {
      const keywordConditions = searchKeywords.map(() => {
        const condition = `t.description ILIKE $${paramIndex}`;
        params.push(`%${searchKeywords[paramIndex - 2]}%`);
        paramIndex++;
        return condition;
      });
      query += ` AND (${keywordConditions.join(' OR ')})`;
    }

    query += ` ORDER BY t.occurred_at DESC`;
    
    // Only add LIMIT and OFFSET if limit is specified
    if (limit !== null) {
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);
    }

    const { data, error } = await dbClient.query(query, params);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching user transactions:', error);
    throw error;
  }
};

// Transaction Analytics
export const getTransactionSummary = async (userId, days = 30) => {
  try {
    const { data: allTransactions, error: txError } = await dbClient.query(`
      SELECT 
        t.amount_cents,
        t.occurred_at,
        jc.name as category_name
      FROM transactions t
      JOIN jar_categories jc ON t.jar_category_id = jc.id
      WHERE t.user_id = $1 
        AND t.occurred_at >= NOW() - INTERVAL '${days} days'
      ORDER BY t.occurred_at DESC
    `, [parseInt(userId)]);

    if (txError) throw txError;

    // Get the first transaction date for this user
    const { data: firstTransaction } = await dbClient.query(`
      SELECT occurred_at 
      FROM transactions 
      WHERE user_id = $1 
      ORDER BY occurred_at ASC 
      LIMIT 1
    `, [parseInt(userId)]);

    const hasHistoricalData = firstTransaction && firstTransaction.length > 0;
    const firstTransactionDate = hasHistoricalData ? firstTransaction[0].occurred_at : null;

    // Process transactions for summary
    const summary = {
      totalIncome: 0,
      totalExpenses: 0,
      netAmount: 0,
      transactionCount: allTransactions.length,
      hasHistoricalData,
      firstTransactionDate,
      categoryBreakdown: {}
    };

    allTransactions.forEach(tx => {
      const amount = tx.amount_cents;
      if (amount > 0) {
        summary.totalIncome += amount;
      } else {
        summary.totalExpenses += Math.abs(amount);
      }
      summary.netAmount += amount;

      // Category breakdown
      if (!summary.categoryBreakdown[tx.category_name]) {
        summary.categoryBreakdown[tx.category_name] = {
          income: 0,
          expenses: 0,
          net: 0,
          count: 0
        };
      }

      const catData = summary.categoryBreakdown[tx.category_name];
      if (amount > 0) {
        catData.income += amount;
      } else {
        catData.expenses += Math.abs(amount);
      }
      catData.net += amount;
      catData.count++;
    });

    return summary;
  } catch (error) {
    console.error('Error getting transaction summary:', error);
    throw error;
  }
};

export const getSavingsProjection = async (userId, targetAmountCents, forecastPeriods = 24) => {
  try {
    // Get historical transactions for the user
    const { data: allTransactions, error } = await dbClient.query(`
      SELECT 
        amount_cents,
        occurred_at,
        jar_category_id
      FROM transactions
      WHERE user_id = $1
        AND jar_category_id = 6  -- Savings jar
      ORDER BY occurred_at ASC
    `, [parseInt(userId)]);

    if (error) throw error;

    if (!allTransactions || allTransactions.length === 0) {
      return {
        canReachTarget: false,
        message: "No savings history found. Start saving to get projections.",
        monthsToTarget: null,
        projectedDate: null
      };
    }

    // Calculate monthly savings rate
    const now = new Date();
    const monthsBack = 6; // Look at last 6 months
    const cutoffDate = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
    
    const recentTransactions = allTransactions.filter(tx => 
      new Date(tx.occurred_at) >= cutoffDate && tx.amount_cents > 0
    );

    if (recentTransactions.length === 0) {
      return {
        canReachTarget: false,
        message: "No recent savings activity found.",
        monthsToTarget: null,
        projectedDate: null
      };
    }

    const totalSavings = recentTransactions.reduce((sum, tx) => sum + tx.amount_cents, 0);
    const avgMonthlySavings = totalSavings / monthsBack;

    // Get current savings balance
    const { data: currentBalance } = await dbClient.select('current_jar_balances', {
      where: { user_id: parseInt(userId), category_id: 6 }
    });

    const currentSavings = currentBalance && currentBalance.length > 0 
      ? currentBalance[0].current_balance_cents 
      : 0;

    const remainingAmount = targetAmountCents - currentSavings;

    if (remainingAmount <= 0) {
      return {
        canReachTarget: true,
        message: "You have already reached your target!",
        monthsToTarget: 0,
        projectedDate: now.toISOString().split('T')[0]
      };
    }

    if (avgMonthlySavings <= 0) {
      return {
        canReachTarget: false,
        message: "Based on current savings rate, target cannot be reached.",
        monthsToTarget: null,
        projectedDate: null
      };
    }

    const monthsToTarget = Math.ceil(remainingAmount / avgMonthlySavings);
    const projectedDate = new Date(now.getFullYear(), now.getMonth() + monthsToTarget, 1);

    return {
      canReachTarget: true,
      message: `Based on your average monthly savings of ${(avgMonthlySavings/100).toLocaleString()} VND`,
      monthsToTarget,
      projectedDate: projectedDate.toISOString().split('T')[0],
      currentSavings: currentSavings / 100,
      targetAmount: targetAmountCents / 100,
      avgMonthlySavings: avgMonthlySavings / 100
    };

  } catch (error) {
    console.error('Error getting savings projection:', error);
    throw error;
  }
};

// Savings Target Functions
export const getUserSavingTarget = async (userId) => {
  try {
    const { data, error } = await dbClient.select('user_saving_targets', {
      where: { user_id: parseInt(userId) },
      orderBy: { created_at: 'desc' },
      limit: 1
    });

    if (error) throw error;
    return data[0]?.target_amount_cents || 0;
  } catch (error) {
    console.error('Error fetching user saving target:', error);
    throw error;
  }
};

export const setSavingTarget = async (userId, targetAmountCents) => {
  try {
    const { data, error } = await dbClient.insert(
      'user_saving_targets',
      {
        user_id: parseInt(userId),
        target_amount_cents: targetAmountCents
      },
      { returning: '*' }
    );

    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error('Error setting user saving target:', error);
    throw error;
  }
};

// Utility Functions
export const formatCurrency = (amount, currency = 'VND') => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

export const parseCurrencyToAmount = (currencyString) => {
  // Remove all non-numeric characters except decimal point
  const numericString = currencyString.replace(/[^\d.-]/g, '');
  return parseFloat(numericString) || 0;
};

// Main dashboard function
export const getAccumulativeDashboardData = async (userId) => {
  try {
    // Get user data
    const user = await getUserById(parseInt(userId));
    if (!user) {
      throw new Error('User not found');
    }

    // Get all dashboard data in parallel
    const [jarData, incomeHistory] = await Promise.all([
      getJarDashboardData(parseInt(userId)),
      // Fetch income history directly from monthly_income_entries table instead of summary view
      dbClient.select('monthly_income_entries', {
        where: { user_id: parseInt(userId) },
        orderBy: 'month_year DESC'
      }).then(result => {
        if (result.error) throw result.error;
        return result.data;
      })
    ]);
    
    // Process jar data to ensure numeric values
    const processedJarData = jarData.map(jar => ({
      ...jar,
      total_income_cents: parseInt(jar.total_income_cents) || 0,
      total_spent_cents: parseInt(jar.total_spent_cents) || 0,
      current_balance_cents: parseInt(jar.current_balance_cents) || 0,
      latest_allocation_percentage: parseFloat(jar.latest_allocation_percentage) || 0,
      allocated_amount_this_month: parseInt(jar.allocated_amount_this_month) || 0,
      income_this_month: parseInt(jar.income_this_month) || 0,
      spent_this_month: parseInt(jar.spent_this_month) || 0
    }));

    // Process income history - since we're fetching from entries table, no need for deduplication
    const processedIncomeHistory = incomeHistory.map(entry => ({
      id: entry.id,
      user_id: entry.user_id,
      month_year: entry.month_year,
      total_income_cents: parseInt(entry.total_income_cents) || 0,
      allocation_percentages: entry.allocation_percentages,
      created_at: entry.created_at
    }));
    
    // Calculate lifetime balance from processed data
    const lifetimeBalance = {
      totalIncome: processedJarData.reduce((sum, jar) => sum + jar.total_income_cents, 0),
      totalSpent: processedJarData.reduce((sum, jar) => sum + jar.total_spent_cents, 0),
      currentBalance: processedJarData.reduce((sum, jar) => sum + jar.current_balance_cents, 0)
    };
    
    return {
      user,
      jars: processedJarData,
      incomeHistory: processedIncomeHistory,
      lifetimeBalance
    };
  } catch (error) {
    console.error('Error getting accumulative dashboard data:', error);
    throw error;
  }
};

// Setup function
export const checkUserAccumulativeSetup = async (userId) => {
  try {
    // Check if user has jars setup
    const { data: existingJars } = await dbClient.select('user_jars', {
      where: { user_id: parseInt(userId) }
    });
    
    if (!existingJars || existingJars.length === 0) {
      // Initialize jars for the user
      await initializeUserJars(parseInt(userId));
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error checking user accumulative setup:', error);
    throw error;
  }
};

// Clean up functions for testing
export const deleteAllUserData = async (userId) => {
  try {
    // Delete in order of dependencies
    const { error: transactionsError } = await dbClient.delete('transactions', { user_id: parseInt(userId) });
    if (transactionsError) throw transactionsError;

    const { error: incomeError } = await dbClient.delete('monthly_income_entries', { user_id: parseInt(userId) });
    if (incomeError) throw incomeError;

    const { error: jarsError } = await dbClient.delete('user_jars', { user_id: parseInt(userId) });
    if (jarsError) throw jarsError;

    // Do not delete the user record anymore
    // Instead, refresh the dashboard data to reflect the cleared state
    await dbClient.query('SELECT refresh_jar_dashboard_data()');

    console.log(`All financial data deleted for user ${userId}`);
  } catch (error) {
    console.error('Error deleting user data:', error);
    throw error;
  }
}; 