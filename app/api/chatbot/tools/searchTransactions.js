import { authClient } from '@/services/awsAuthClient';
import { getUserTransactions } from '@/services/accumulativeFinancialService';

export const declaration = {
    name: "search_transactions",
    description: "Search for transactions in the database based on keywords, categories, or time periods. Use this to answer questions about spending patterns, specific purchases, or financial analysis.",
    parameters: {
        type: "object",
        properties: {
            keywords: {
                type: "array",
                items: {
                    type: "string"
                },
                description: "Array of keywords to search for in transaction descriptions. Can include both English and Vietnamese terms (e.g., ['coffee', 'cà phê', 'drink', 'nước'])"
            },
            jar_category_id: {
                type: "integer",
                description: "Optional: Specific jar category ID to filter by (1=Necessity, 2=Investment, 3=Education, 4=Savings, 5=Play, 6=Charity)"
            },
            transaction_type: {
                type: "string",
                enum: ["expense", "income", "all"],
                description: "Type of transactions to search for: 'expense', 'income', or 'all'"
            },
            days_back: {
                type: "integer",
                description: "Optional: Number of days back to search (e.g., 7 for last week, 30 for last month)"
            },
            start_date: {
                type: "string",
                description: "Optional: Start date in YYYY-MM-DD format"
            },
            end_date: {
                type: "string",
                description: "Optional: End date in YYYY-MM-DD format"
            }
        },
        required: ["keywords"],
    },
};

// Keyword mapping for common terms (English to Vietnamese and vice versa)
const KEYWORD_MAPPING = {
    // Food & Drinks
    'coffee': ['cà phê', 'coffee', 'cafe'],
    'cà phê': ['cà phê', 'coffee', 'cafe'],
    'drink': ['nước', 'đồ uống', 'drink', 'beverage'],
    'nước': ['nước', 'đồ uống', 'drink', 'beverage'],
    'food': ['đồ ăn', 'thức ăn', 'food', 'meal'],
    'đồ ăn': ['đồ ăn', 'thức ăn', 'food', 'meal'],
    'lunch': ['bữa trưa', 'lunch', 'ăn trưa'],
    'dinner': ['bữa tối', 'dinner', 'ăn tối'],
    'breakfast': ['bữa sáng', 'breakfast', 'ăn sáng'],
    
    // Transportation
    'transport': ['giao thông', 'transport', 'xe', 'taxi'],
    'taxi': ['taxi', 'xe taxi', 'grab'],
    'grab': ['grab', 'xe grab', 'taxi'],
    'bus': ['xe buýt', 'bus'],
    'xe buýt': ['xe buýt', 'bus'],
    
    // Shopping
    'shopping': ['mua sắm', 'shopping', 'mua'],
    'mua sắm': ['mua sắm', 'shopping', 'mua'],
    'clothes': ['quần áo', 'clothes', 'áo', 'quần'],
    'quần áo': ['quần áo', 'clothes', 'áo', 'quần'],
    
    // Entertainment
    'movie': ['phim', 'movie', 'cinema'],
    'phim': ['phim', 'movie', 'cinema'],
    'game': ['game', 'trò chơi', 'gaming'],
    'trò chơi': ['game', 'trò chơi', 'gaming'],
    
    // Utilities
    'electricity': ['điện', 'electricity', 'tiền điện'],
    'điện': ['điện', 'electricity', 'tiền điện'],
    'water': ['nước', 'water', 'tiền nước'],
    'internet': ['internet', 'wifi', 'mạng'],
    'wifi': ['internet', 'wifi', 'mạng'],
    
    // Income
    'salary': ['lương', 'salary', 'tiền lương'],
    'lương': ['lương', 'salary', 'tiền lương'],
    'bonus': ['thưởng', 'bonus', 'tiền thưởng'],
    'thưởng': ['thưởng', 'bonus', 'tiền thưởng']
};

export async function handler({ keywords, jar_category_id, transaction_type = "all", days_back, start_date, end_date, userToken }) {
    try {
        if (!userToken) {
            throw new Error('User authentication required');
        }

        // Ensure keywords is always an array
        if (!Array.isArray(keywords)) {
            if (typeof keywords === 'string' && keywords.length > 0) {
                keywords = [keywords];
            } else {
                keywords = [];
            }
        }

        // Get current user from AWS Cognito token
        const { data: { user }, error: userError } = await authClient.getUser(userToken);
        if (userError || !user) throw new Error('User not authenticated');

        // Get user ID from users table using AWS RDS
        const { dbClient } = await import('@/services/awsDbClient');
        const { data: userData, error: userDataError } = await dbClient.select('users', {
            where: { email: user.email },
            select: 'id'
        });
        
        if (userDataError) throw userDataError;
        if (!userData || userData.length === 0) throw new Error('User not found in database');

        // Expand keywords using mapping
        let expandedKeywords = [];
        keywords.forEach(keyword => {
            const lowerKeyword = keyword.toLowerCase();
            if (KEYWORD_MAPPING[lowerKeyword]) {
                expandedKeywords.push(...KEYWORD_MAPPING[lowerKeyword]);
            } else {
                expandedKeywords.push(keyword);
            }
        });

        // Remove duplicates
        expandedKeywords = [...new Set(expandedKeywords)];

        // Build search options for getUserTransactions
        const searchOptions = {
            limit: 500  // Reasonable limit for search results
        };

        // Add keyword search
        if (expandedKeywords.length > 0) {
            searchOptions.searchKeywords = expandedKeywords;
        }

        // Add jar category filter
        if (jar_category_id) {
            searchOptions.jarCategoryId = jar_category_id;
        }

        // Add date filters
        if (days_back) {
            const dateLimit = new Date();
            dateLimit.setDate(dateLimit.getDate() - days_back);
            searchOptions.startDate = dateLimit.toISOString();
        } else if (start_date && end_date) {
            searchOptions.startDate = start_date;
            searchOptions.endDate = end_date;
        } else if (start_date) {
            searchOptions.startDate = start_date;
        } else if (end_date) {
            searchOptions.endDate = end_date;
        }

        // Get transactions using AWS service
        let transactions = await getUserTransactions(userData[0].id, searchOptions);

        // Apply transaction type filter (do this client-side since the service doesn't support it)
        if (transaction_type !== "all") {
            if (transaction_type === "expense") {
                transactions = transactions.filter(t => t.amount_cents < 0);
            } else if (transaction_type === "income") {
                transactions = transactions.filter(t => t.amount_cents > 0);
            }
        }

        // Calculate summary statistics
        const totalExpenses = transactions
            .filter(t => t.amount_cents < 0)
            .reduce((sum, t) => sum + Math.abs(t.amount_cents), 0);

        const totalIncome = transactions
            .filter(t => t.amount_cents > 0)
            .reduce((sum, t) => sum + t.amount_cents, 0);

        const transactionCount = transactions.length;
        const expenseCount = transactions.filter(t => t.amount_cents < 0).length;
        const incomeCount = transactions.filter(t => t.amount_cents > 0).length;

        // Group by jar category
        const byCategory = {};
        transactions.forEach(t => {
            const categoryName = t.jar_categories?.name || 'Unknown';
            if (!byCategory[categoryName]) {
                byCategory[categoryName] = {
                    total: 0,
                    count: 0,
                    transactions: []
                };
            }
            byCategory[categoryName].total += t.amount_cents;
            byCategory[categoryName].count += 1;
            byCategory[categoryName].transactions.push({
                id: t.id,
                amount_cents: t.amount_cents,
                description: t.description,
                occurred_at: t.occurred_at
            });
        });

        return {
            success: true,
            data: {
                transactions: transactions.map(t => ({
                    id: t.id,
                    amount_cents: t.amount_cents,
                    amount_vnd: Math.abs(t.amount_cents),
                    description: t.description,
                    occurred_at: t.occurred_at,
                    jar_category: t.jar_categories?.name || 'Unknown',
                    type: t.amount_cents > 0 ? 'income' : 'expense'
                })),
                summary: {
                    total_transactions: transactionCount,
                    total_expenses_vnd: totalExpenses,
                    total_income_vnd: totalIncome,
                    expense_count: expenseCount,
                    income_count: incomeCount,
                    net_amount_vnd: totalIncome - totalExpenses
                },
                by_category: byCategory,
                search_keywords: expandedKeywords
            }
        };

    } catch (error) {
        console.error('Error in search_transactions:', error);
        return {
            success: false,
            error: error.message || 'Failed to search transactions'
        };
    }
} 