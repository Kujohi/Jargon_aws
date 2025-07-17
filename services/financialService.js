import { dbClient } from './awsDbClient';

// User Management Functions
export const getUserById = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
};

export const updateUserMonthlyIncome = async (userId, monthlyIncome) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ monthly_income: monthlyIncome })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating user monthly income:', error);
    throw error;
  }
};

export const getUserByEmail = async (email) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching user by email:', error);
    throw error;
  }
};

export const updateUserProfile = async (userId, updates) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

// Jar Management Functions
export const getUserJars = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('user_jars_with_balance')
      .select('*')
      .eq('user_id', userId)
      .order('category_id');

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching user jars:', error);
    throw error;
  }
};

export const getUserJarsWithCapacity = async (userId) => {
  try {
    // Get user data from the user_jars_with_balance table
    const { data: jarsData, error } = await supabase
      .from('user_jars_with_balance')
      .select('*')
      .eq('user_id', userId)
      .order('category_id');

    if (error) throw error;

    // Calculate real-time values from transactions for each jar
    const jarsWithRealTimeData = [];
    
    for (const jar of jarsData) {
      // Get all transactions for this jar category
      const { data: transactions, error: transError } = await supabase
        .from('transactions')
        .select('amount_cents')
        .eq('user_id', userId)
        .eq('jar_category_id', jar.category_id);

      if (transError) throw transError;

      // Calculate actual spent and income from transactions
      const spent_cents = transactions
        .filter(t => t.amount_cents < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount_cents), 0);
      
      const income_cents = transactions
        .filter(t => t.amount_cents > 0)
        .reduce((sum, t) => sum + t.amount_cents, 0);

      // Calculate balance based on real transaction data
      const balance_cents = jar.capacity_cents - spent_cents + income_cents;
      // Change usage percentage to show fullness instead of spending
      /% = full jar (no spending), 0% = empty jar (all spent)
      const usage_percentage = jar.capacity_cents > 0 ? ((jar.capacity_cents - spent_cents + income_cents) / jar.capacity_cents) * 100 : 100;

      jarsWithRealTimeData.push({
        id: jar.id,
        user_id: jar.user_id,
        category_id: jar.category_id,
        allocation_percent: jar.allocation_percent,
        capacity_cents: jar.capacity_cents,
        spent_cents: spent_cents, // Real-time calculated value
        income_cents: income_cents, // Real-time calculated value
        balance_cents: balance_cents, // Real-time calculated value
        remaining_balance_cents: balance_cents,
        usage_percentage: usage_percentage,
        jar_categories: {
          id: jar.category_id,
          name: jar.category_name,
          description: jar.category_description
        }
      });
    }

    // Get user data
    const user = await getUserById(userId);

    return {
      user,
      jars: jarsWithRealTimeData
    };
  } catch (error) {
    console.error('Error fetching user jars with capacity:', error);
    throw error;
  }
};

export const checkUserJarSetup = async (userId) => {
  try {
    const user = await getUserById(userId);
    const jars = await getUserJars(userId);
    
    // User has completed setup if they have monthly income and jars
    const hasMonthlyIncome = user.monthly_income > 0;
    const hasJars = jars && jars.length > 0;
    
    return {
      isSetupComplete: hasMonthlyIncome && hasJars,
      hasMonthlyIncome,
      hasJars,
      user,
      jars
    };
  } catch (error) {
    console.error('Error checking user jar setup:', error);
    throw error;
  }
};

export const setupUserJars = async (userId, monthlyIncome, jarAllocations) => {
  try {
    console.log("setupUserJars called with:", { userId, monthlyIncome, jarAllocations });
    
    // Validate that allocations sum to 100%
    const totalAllocation = Object.values(jarAllocations).reduce((sum, percent) => sum + percent, 0);
    if (Math.abs(totalAllocation - 100) > 0.01) {
      throw new Error('Total allocation must equal 100%');
    }

    // Update user's monthly income
    console.log("Updating user monthly income...");
    await updateUserMonthlyIncome(userId, monthlyIncome);

    // Get jar categories
    console.log("Getting jar categories...");
    const categories = await getJarCategories();
    console.log("Categories:", categories);

    // Delete existing jars if any
    console.log("Deleting existing jars...");
    const { error: deleteError } = await supabase.from('user_jars_with_balance').delete().eq('user_id', userId);
    if (deleteError) {
      console.error("Delete error:", deleteError);
      throw new Error(`Failed to delete existing jars: ${deleteError.message}`);
    }

    // Create new jar entries with calculated values from transactions
    const userJars = [];
    
    for (const category of categories) {
      // Get all transactions for this user and category
      const { data: transactions, error: transError } = await supabase
        .from('transactions')
        .select('amount_cents')
        .eq('user_id', userId)
        .eq('jar_category_id', category.id);

      if (transError) {
        console.error("Transaction fetch error:", transError);
        throw new Error(`Failed to fetch transactions: ${transError.message}`);
      }

      // Calculate spent and income from transactions
      const spent_cents = transactions
        .filter(t => t.amount_cents < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount_cents), 0);
      
      const income_cents = transactions
        .filter(t => t.amount_cents > 0)
        .reduce((sum, t) => sum + t.amount_cents, 0);

      const capacity_cents = Math.round((monthlyIncome * (jarAllocations[category.name] || 0)) );
      const balance_cents = capacity_cents - spent_cents + income_cents;

      userJars.push({
        id: userId * 1000 + category.id, // Generate unique ID based on user and category
        user_id: userId,
        category_id: category.id,
        allocation_percent: jarAllocations[category.name] || 0,
        monthly_income: monthlyIncome,
        category_name: category.name,
        category_description: category.description,
        capacity_cents: capacity_cents,
        spent_cents: spent_cents,
        income_cents: income_cents,
        balance_cents: balance_cents
      });
    }

    console.log("User jars to insert:", userJars);

    const { data, error } = await supabase
      .from('user_jars_with_balance')
      .insert(userJars)
      .select('*');

    if (error) {
      console.error("Insert error:", error);
      throw new Error(`Failed to create jars: ${error.message}`);
    }

    console.log("Jars created successfully:", data);
    return data;
  } catch (error) {
    console.error('Error setting up user jars:', error);
    throw error;
  }
};

export const updateJarAllocation = async (userJarId, newAllocationPercent) => {
  try {
    // Get the current jar data
    const { data: currentJar, error: fetchError } = await supabase
      .from('user_jars_with_balance')
      .select('*')
      .eq('id', userJarId)
      .single();

    if (fetchError) throw fetchError;

    // Calculate new capacity
    const newCapacity = Math.round((currentJar.monthly_income * newAllocationPercent) );
    const newBalance = newCapacity - currentJar.spent_cents + currentJar.income_cents;

    // Update the jar allocation
    const { data, error } = await supabase
      .from('user_jars_with_balance')
      .update({ 
        allocation_percent: newAllocationPercent,
        capacity_cents: newCapacity,
        balance_cents: newBalance
      })
      .eq('id', userJarId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error updating jar allocation:', error);
    throw error;
  }
};

// Note: updateJarBalance is no longer needed since balances are calculated automatically
// by the user_jars_with_balance view based on transactions

// Transaction Management Functions
export const createTransaction = async (transactionData) => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .insert([transactionData])
      .select(`
        *,
        jar_categories (
          id,
          name,
          description
        )
      `)
      .single();

    if (error) throw error;

    // Update the corresponding jar balance
    await updateJarBalanceAfterTransaction(transactionData.user_id, transactionData.jar_category_id);

    return data;
  } catch (error) {
    console.error('Error creating transaction:', error);
    throw error;
  }
};

export const updateJarBalanceAfterTransaction = async (userId, jarCategoryId) => {
  try {
    // Get all transactions for this user and jar category
    const { data: transactions, error: transError } = await supabase
      .from('transactions')
      .select('amount_cents')
      .eq('user_id', userId)
      .eq('jar_category_id', jarCategoryId);

    if (transError) throw transError;

    // Calculate totals from actual transactions
    const spent_cents = transactions
      .filter(t => t.amount_cents < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount_cents), 0);
    
    const income_cents = transactions
      .filter(t => t.amount_cents > 0)
      .reduce((sum, t) => sum + t.amount_cents, 0);

    // Get the jar to calculate new balance
    const { data: jar, error: jarError } = await supabase
      .from('user_jars_with_balance')
      .select('capacity_cents')
      .eq('user_id', userId)
      .eq('category_id', jarCategoryId)
      .single();

    if (jarError) throw jarError;

    const balance_cents = jar.capacity_cents - spent_cents + income_cents;

    // Update the jar with real calculated values
    const { error: updateError } = await supabase
      .from('user_jars_with_balance')
      .update({
        spent_cents,
        income_cents,
        balance_cents
      })
      .eq('user_id', userId)
      .eq('category_id', jarCategoryId);

    if (updateError) throw updateError;

    return {
      spent_cents,
      income_cents,
      balance_cents
    };
  } catch (error) {
    console.error('Error updating jar balance after transaction:', error);
    throw error;
  }
};

export const getUserTransactions = async (userId, limit = 50, offset = 0, filters = {}) => {
  try {
    let query = supabase
      .from('transactions')
      .select(`
        *,
        jar_categories (
          id,
          name,
          description
        )
      `)
      .eq('user_id', userId)
      .order('occurred_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (filters.jarCategoryId) {
      query = query.eq('jar_category_id', filters.jarCategoryId);
    }

    if (filters.startDate) {
      query = query.gte('occurred_at', filters.startDate);
    }

    if (filters.endDate) {
      query = query.lte('occurred_at', filters.endDate);
    }

    if (filters.minAmount) {
      query = query.gte('amount_cents', filters.minAmount);
    }

    if (filters.maxAmount) {
      query = query.lte('amount_cents', filters.maxAmount);
    }

    if (filters.source) {
      query = query.eq('source', filters.source);
    }

    if (filters.description) {
      query = query.ilike('description', `%${filters.description}%`);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching user transactions:', error);
    throw error;
  }
};

export const getTransactionById = async (transactionId) => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        jar_categories (
          id,
          name,
          description
        )
      `)
      .eq('id', transactionId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching transaction:', error);
    throw error;
  }
};

export const updateTransaction = async (transactionId, updates) => {
  try {
    // Get the old transaction data
    const oldTransaction = await getTransactionById(transactionId);
    
    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', transactionId)
      .select(`
        *,
        jar_categories (
          id,
          name,
          description
        )
      `)
      .single();

    if (error) throw error;

    // Update jar balances for both old and new categories if changed
    if (oldTransaction.jar_category_id !== data.jar_category_id) {
      await updateJarBalanceAfterTransaction(oldTransaction.user_id, oldTransaction.jar_category_id);
    }
    await updateJarBalanceAfterTransaction(data.user_id, data.jar_category_id);

    return data;
  } catch (error) {
    console.error('Error updating transaction:', error);
    throw error;
  }
};

export const deleteTransaction = async (transactionId) => {
  try {
    // Get transaction data before deletion
    const transaction = await getTransactionById(transactionId);
    
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', transactionId);

    if (error) throw error;

    // Update jar balance
    await updateJarBalanceAfterTransaction(transaction.user_id, transaction.jar_category_id);

    return true;
  } catch (error) {
    console.error('Error deleting transaction:', error);
    throw error;
  }
};

// Jar Categories Functions
export const getJarCategories = async () => {
  try {
    const { data, error } = await supabase
      .from('jar_categories')
      .select('*')
      .order('id');

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching jar categories:', error);
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

// Dashboard Analytics Functions
export const getUserFinancialSummary = async (userId) => {
  try {
    const { user, jars } = await getUserJarsWithCapacity(userId);
    
    const totalCapacity = jars.reduce((sum, jar) => sum + jar.capacity_cents, 0);
    const totalSpent = jars.reduce((sum, jar) => sum + jar.spent_cents, 0);
    const totalRemaining = jars.reduce((sum, jar) => sum + jar.remaining_balance_cents, 0);
    
    // Get recent transactions
    const recentTransactions = await getUserTransactions(userId, 10);
    
    // Calculate spending by category
    const spendingByCategory = jars.map(jar => ({
      category: jar.jar_categories.name,
      spent: jar.spent_cents,
      capacity: jar.capacity_cents,
      percentage: jar.usage_percentage
    }));
    
    // Calculate monthly trends (simplified)
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthlySpending = await getUserTransactions(userId, 1000, 0, {
      startDate: new Date(currentYear, currentMonth, 1).toISOString(),
      endDate: new Date(currentYear, currentMonth + 1, 0).toISOString()
    });
    
    const monthlyTotal = monthlySpending.reduce((sum, transaction) => {
      return sum + (transaction.amount_cents < 0 ? Math.abs(transaction.amount_cents) : 0);
    }, 0);
    
    return {
      user,
      summary: {
        totalCapacity,
        totalSpent,
        totalRemaining,
        monthlySpending: monthlyTotal,
        savingsRate: totalCapacity > 0 ? ((totalRemaining / totalCapacity) * 100) : 0
      },
      jars,
      spendingByCategory,
      recentTransactions
    };
  } catch (error) {
    console.error('Error fetching user financial summary:', error);
    throw error;
  }
};

// Batch Operations
export const updateMultipleJarAllocations = async (userId, allocations) => {
  try {
    // Validate that allocations sum to 100%
    const totalAllocation = Object.values(allocations).reduce((sum, percent) => sum + percent, 0);
    if (Math.abs(totalAllocation - 100) > 0.01) {
      throw new Error('Total allocation must equal 100%');
    }

    // Get user jars
    const jars = await getUserJars(userId);
    
    // Update each jar allocation
    const updates = [];
    for (const jar of jars) {
      const categoryName = jar.category_name;
      if (allocations[categoryName] !== undefined) {
        updates.push(updateJarAllocation(jar.id, allocations[categoryName]));
      }
    }

    await Promise.all(updates);
    return true;
  } catch (error) {
    console.error('Error updating multiple jar allocations:', error);
    throw error;
  }
};

// Monthly Income Update and Jar Reallocation
export const updateMonthlyIncomeAndReallocate = async (userId, newMonthlyIncome, newJarAllocations) => {
  try {
    console.log("updateMonthlyIncomeAndReallocate called with:", { userId, newMonthlyIncome, newJarAllocations });
    
    // Validate that allocations sum to 100%
    const totalAllocation = Object.values(newJarAllocations).reduce((sum, percent) => sum + percent, 0);
    if (Math.abs(totalAllocation - 100) > 0.01) {
      throw new Error('Total allocation must equal 100%');
    }

    // Update user's monthly income
    await updateUserMonthlyIncome(userId, newMonthlyIncome);

    // Get existing jars
    const existingJars = await getUserJars(userId);
    
    // Update each jar with new allocation and capacity
    const updates = [];
    for (const jar of existingJars) {
      const categoryName = jar.category_name;
      const newAllocation = newJarAllocations[categoryName] || 0;
      const newCapacity = Math.round((newMonthlyIncome * newAllocation) );
      
      // Get all transactions for this jar to calculate current spent/income
      const { data: transactions, error: transError } = await supabase
        .from('transactions')
        .select('amount_cents')
        .eq('user_id', userId)
        .eq('jar_category_id', jar.category_id);

      if (transError) throw transError;

      const spent_cents = transactions
        .filter(t => t.amount_cents < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount_cents), 0);
      
      const income_cents = transactions
        .filter(t => t.amount_cents > 0)
        .reduce((sum, t) => sum + t.amount_cents, 0);

      const newBalance = newCapacity - spent_cents + income_cents;

      updates.push(supabase
        .from('user_jars_with_balance')
        .update({
          allocation_percent: newAllocation,
          monthly_income: newMonthlyIncome,
          capacity_cents: newCapacity,
          balance_cents: newBalance
        })
        .eq('id', jar.id)
      );
    }

    // Execute all updates
    await Promise.all(updates);

    console.log("Monthly income and jar allocations updated successfully");
    return await getUserJarsWithCapacity(userId);
  } catch (error) {
    console.error('Error updating monthly income and reallocating jars:', error);
    throw error;
  }
};

// Lifetime Balance Calculation Functions
export const getUserLifetimeBalance = async (userId) => {
  try {
    // Get all transactions for the user
    const { data: allTransactions, error } = await supabase
      .from('transactions')
      .select('amount_cents, occurred_at')
      .eq('user_id', userId)
      .order('occurred_at', { ascending: true });

    if (error) throw error;

    // Calculate lifetime totals
    const lifetimeIncome = allTransactions
      .filter(t => t.amount_cents > 0)
      .reduce((sum, t) => sum + t.amount_cents, 0);

    const lifetimeExpenses = allTransactions
      .filter(t => t.amount_cents < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount_cents), 0);

    const lifetimeBalance = lifetimeIncome - lifetimeExpenses;

    // Calculate current account balance (sum of all jar balances)
    const { jars } = await getUserJarsWithCapacity(userId);
    const currentAccountBalance = jars.reduce((sum, jar) => sum + jar.balance_cents, 0);

    // Calculate monthly savings (positive balance from current month)
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthStart = new Date(currentYear, currentMonth, 1);
    const monthEnd = new Date(currentYear, currentMonth + 1, 0);

    const monthlyTransactions = allTransactions.filter(t => {
      const transactionDate = new Date(t.occurred_at);
      return transactionDate >= monthStart && transactionDate <= monthEnd;
    });

    const monthlyIncome = monthlyTransactions
      .filter(t => t.amount_cents > 0)
      .reduce((sum, t) => sum + t.amount_cents, 0);

    const monthlyExpenses = monthlyTransactions
      .filter(t => t.amount_cents < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount_cents), 0);

    const monthlySavings = monthlyIncome - monthlyExpenses;

    return {
      lifetimeIncome,
      lifetimeExpenses,
      lifetimeBalance,
      currentAccountBalance,
      monthlyIncome,
      monthlyExpenses,
      monthlySavings,
      totalTransactions: allTransactions.length,
      firstTransactionDate: allTransactions.length > 0 ? allTransactions[0].occurred_at : null
    };
  } catch (error) {
    console.error('Error calculating lifetime balance:', error);
    throw error;
  }
};

// Enhanced Dashboard Data Function
export const getEnhancedDashboardData = async (userId) => {
  try {
    const [jarData, lifetimeData] = await Promise.all([
      getUserJarsWithCapacity(userId),
      getUserLifetimeBalance(userId)
    ]);

    return {
      ...jarData,
      lifetimeBalance: lifetimeData
    };
  } catch (error) {
    console.error('Error fetching enhanced dashboard data:', error);
    throw error;
  }
};

// AI Integration Helper Functions
export const classifyTransaction = async (description, amount, merchantInfo = null) => {
  // This function would integrate with AI to classify transactions
  // For now, we'll use simple keyword matching
  const keywords = {
    'Necessity': ['grocery', 'food', 'rent', 'utilities', 'gas', 'electricity', 'water', 'internet', 'phone', 'medical', 'pharmacy', 'hospital'],
    'Play': ['restaurant', 'movie', 'entertainment', 'game', 'sport', 'travel', 'vacation', 'shopping', 'clothes', 'fashion'],
    'Education': ['book', 'course', 'school', 'university', 'training', 'seminar', 'workshop', 'certification'],
    'Investment': ['stock', 'bond', 'mutual fund', 'etf', 'crypto', 'investment', 'trading', 'portfolio'],
    'Charity': ['donation', 'charity', 'nonprofit', 'foundation', 'temple', 'church', 'volunteer'],
    'Savings': ['savings', 'deposit', 'emergency', 'future', 'goal']
  };

  const lowerDescription = description.toLowerCase();
  
  for (const [category, categoryKeywords] of Object.entries(keywords)) {
    if (categoryKeywords.some(keyword => lowerDescription.includes(keyword))) {
      return {
        category,
        confidence: 0.8,
        reasoning: `Matched keyword in category ${category}`
      };
    }
  }

  // Default to Necessity if no match found
  return {
    category: 'Necessity',
    confidence: 0.3,
    reasoning: 'No clear category match, defaulting to Necessity'
  };
}; 