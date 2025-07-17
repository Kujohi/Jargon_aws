import { authClient } from '@/services/awsAuthClient';

export const declaration = {
    name: "set_saving_target",
    description: "Set or update the user's savings target amount",
    parameters: {
        type: "object",
        properties: {
            target_amount: {
                type: "number",
                description: "The target savings amount in VND (Vietnamese Dong). For example, 1000000 for 1 million VND"
            }
        },
        required: ["target_amount"]
    }
};

export async function handler({ target_amount, userToken }) {
    try {
        if (!userToken) {
            throw new Error('User authentication required');
        }

        // Validate input
        if (!target_amount || target_amount <= 0) {
            return {
                success: false,
                message: "Target amount must be a positive number in VND."
            };
        }

        // Get current user from AWS Cognito token
        const { data: { user }, error: userError } = await authClient.getUser(userToken);
        if (userError) throw userError;
        if (!user) throw new Error('User not authenticated');

        // Get user ID from users table using AWS RDS
        const { dbClient } = await import('@/services/awsDbClient');
        const { data: userData, error: userDataError } = await dbClient.select('users', {
            where: { email: user.email },
            select: 'id'
        });
        
        if (userDataError) throw userDataError;
        if (!userData || userData.length === 0) throw new Error('User not found in database');

        // Store the saving target in the database (convert VND to cents)
        const { setSavingTarget } = await import('@/services/accumulativeFinancialService');
        const targetAmountCents = Math.round(target_amount * 100); // Convert VND to cents
        await setSavingTarget(userData[0].id, targetAmountCents);

        // Format the target amount for display
        const formattedTarget = new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(target_amount);

        return {
            success: true,
            message: `✅ Savings target set successfully!\n\n💰 Your new savings target: ${formattedTarget}\n\nYou can use the predict_savings tool to see when you might reach this goal based on your current savings rate.`,
            target_amount: target_amount
        };

    } catch (error) {
        console.error('Error in setSavingTarget handler:', error);
        return {
            success: false,
            error: error.message || 'Failed to update saving target'
        };
    }
} 