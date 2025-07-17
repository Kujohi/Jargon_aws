import { authClient } from '@/services/awsAuthClient';
import { dbClient } from '@/services/awsDbClient';

export const declaration = {
    name: "update_transaction",
    description: "Add a new income or expense transaction to a specific jar. Use this when user mentions spending money on something or earning money from a source.",
    parameters: {
        type: "object",
        properties: {
            amount: {
                type: "number",
                description: "The amount of money in VND (Vietnamese Dong). Always specify as a positive number - the sign will be determined by transaction_type."
            },
            jar_category_id: {
                type: "integer", 
                description: "The ID of the jar category: 1=Necessity, 2=Play, 3=Education, 4=Investment, 5=Charity, 6=Savings"
            },
            description: {
                type: "string",
                description: "A brief description of the transaction (e.g., 'Coffee at Starbucks', 'Freelance payment')"
            },
            transaction_type: {
                type: "string",
                enum: ["income", "expense"],
                description: "Whether this is money coming in (income) or going out (expense)"
            }
        },
        required: ["amount", "jar_category_id", "transaction_type"]
    }
};

export async function handler({ amount, jar_category_id, description = "", transaction_type, userToken }) {
    try {
        if (!userToken) {
            throw new Error('User authentication required');
        }

        // Get current user from token using AWS Cognito
        const { data: { user }, error: userError } = await authClient.getUser(userToken);
        if (userError || !user) throw new Error('User not authenticated');

        // Get user ID from users table
        const { data: userData, error: userDataError } = await dbClient.select('users', {
            where: { email: user.email },
            select: 'id'
        });
        
        if (userDataError) throw userDataError;
        if (!userData || userData.length === 0) throw new Error('User not found in database');

        // Get amount and apply sign based on transaction type
        const amountValue = Math.round(parseFloat(amount));
        const finalAmount = transaction_type === 'expense' ? -amountValue : amountValue;

        // Insert transaction
        const { error: transactionError } = await dbClient.insert('transactions', {
            user_id: userData[0].id,
            jar_category_id: jar_category_id,
            amount_cents: finalAmount,
            description: description,
            source: 'chatbot'
        });

        if (transactionError) throw transactionError;

        return { 
            success: true,
            message: 'Transaction added successfully'
        };

    } catch (error) {
        console.error('Error in update_transaction:', error);
        return {
            success: false,
            error: error.message
        };
    }
}