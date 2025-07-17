import { authClient } from '@/services/awsAuthClient';
import { getSavingsProjection } from '@/services/accumulativeFinancialService';

export const declaration = {
    name: "predict_savings",
    description: "Predict when a user can reach a savings goal or afford a purchase based on their historical savings data. Use this to answer questions about future financial milestones.",
    parameters: {
        type: "object",
        properties: {
            target_amount: {
                type: "number",
                description: "The target amount in VND that the user wants to save or spend (e.g., 100000 for 100k VND, 250000000 for 10k USD car)"
            },
            target_description: {
                type: "string",
                description: "Description of what the user wants to save for or buy (e.g., 'car', 'house', 'vacation', 'emergency fund')"
            },
            forecast_periods: {
                type: "integer",
                description: "Number of periods to forecast (default: 24 for 2 years)"
            },
            forecast_frequency: {
                type: "string",
                enum: ["D", "W", "M"],
                description: "Forecast frequency: 'D' for daily, 'W' for weekly, 'M' for monthly (default: 'M')"
            }
        },
        required: ["target_amount", "target_description"],
    },
};

export async function handler({ target_amount, target_description, forecast_periods = 24, forecast_frequency = "M", userToken }) {
    try {
        if (!userToken) {
            throw new Error('User authentication required');
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

        // Use the AWS-based savings projection service
        const projection = await getSavingsProjection(userData[0].id, target_amount);

        if (!projection.canReachTarget) {
            return {
                success: false,
                error: projection.message,
                data: {
                    target_amount: target_amount,
                    target_description: target_description,
                    current_savings: projection.currentSavings || 0,
                    target_date: null,
                    forecast: []
                }
            };
        }

        // Format success response with projection data
        const formattedTargetAmount = new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(target_amount);

        const formattedCurrentSavings = new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(projection.currentSavings || 0);

        const targetDate = projection.projectedDate ? new Date(projection.projectedDate).toLocaleDateString('vi-VN') : 'Unknown';

        return {
            success: true,
            message: `Based on your current savings rate, you can reach your goal of ${formattedTargetAmount} for ${target_description} by ${targetDate}. You currently have ${formattedCurrentSavings} saved.`,
            data: {
                target_amount: target_amount,
                target_description: target_description,
                current_savings: projection.currentSavings || 0,
                target_date: projection.projectedDate,
                months_to_target: projection.monthsToTarget,
                can_reach_target: projection.canReachTarget,
                avg_monthly_savings: projection.avgMonthlySavings || 0
            }
        };

    } catch (error) {
        console.error('Error in predict_savings:', error);
        return {
            success: false,
            error: error.message || 'Failed to predict savings',
            data: {
                target_amount: target_amount,
                target_description: target_description,
                current_savings: 0,
                target_date: null,
                forecast: []
            }
        };
    }
} 