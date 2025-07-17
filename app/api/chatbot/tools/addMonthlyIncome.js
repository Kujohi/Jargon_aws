import { authClient } from '@/services/awsAuthClient';
import { addMonthlyIncome } from '@/services/accumulativeFinancialService';

export const declaration = {
    name: "add_monthly_income",
    description: "Add monthly income to user's jars with proper allocation percentages. This is the correct tool to use when user mentions receiving monthly income/salary.",
    parameters: {
        type: "object",
        properties: {
            monthly_income_amount: {
                type: "number",
                description: "The total monthly income amount in VND"
            },
            month_year: {
                type: "string",
                description: "The month and year for this income in YYYY-MM format (e.g., '2024-01')"
            },
            necessity_percentage: {
                type: "number",
                description: "Percentage for Necessity jar (essential expenses like food, housing, utilities)",
                default: 55
            },
            play_percentage: {
                type: "number",
                description: "Percentage for Play jar (entertainment and leisure activities)",
                default: 10
            },
            education_percentage: {
                type: "number",
                description: "Percentage for Education jar (learning and skill development)",
                default: 10
            },
            investment_percentage: {
                type: "number",
                description: "Percentage for Investment jar (long-term wealth building)",
                default: 10
            },
            charity_percentage: {
                type: "number",
                description: "Percentage for Charity jar (giving back to the community)",
                default: 5
            },
            savings_percentage: {
                type: "number",
                description: "Percentage for Savings jar (emergency fund and future goals)",
                default: 10
            }
        },
        required: ["monthly_income_amount"],
    },
};

export async function handler({ 
    monthly_income_amount, 
    month_year,
    necessity_percentage = 55,
    play_percentage = 10,
    education_percentage = 10,
    investment_percentage = 10,
    charity_percentage = 5,
    savings_percentage = 10,
    userToken 
}) {
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

        // Validate allocation percentages total to 100%
        const totalPercentage = necessity_percentage + play_percentage + education_percentage + 
                               investment_percentage + charity_percentage + savings_percentage;
        
        if (Math.abs(totalPercentage - 100) > 0.01) {
            return {
                success: false,
                error: `Allocation percentages must total 100%. Current total: ${totalPercentage}%`
            };
        }

        // Set default month_year to current month if not provided
        if (!month_year) {
            const now = new Date();
            month_year = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        }

        // Validate month_year format
        if (!/^\d{4}-\d{2}$/.test(month_year)) {
            return {
                success: false,
                error: 'Month year must be in YYYY-MM format (e.g., "2024-01")'
            };
        }

        const monthYearDate = month_year + '-01'; // Convert to full date
        const incomeAmountCents = Math.round(parseFloat(monthly_income_amount));

        if (!incomeAmountCents || incomeAmountCents <= 0) {
            return {
                success: false,
                error: 'Invalid monthly income amount'
            };
        }

        // Create allocation percentages object
        const allocationPercentages = {
            'Necessity': necessity_percentage,
            'Play': play_percentage,
            'Education': education_percentage,
            'Investment': investment_percentage,
            'Charity': charity_percentage,
            'Savings': savings_percentage
        };

        // Use the AWS-based addMonthlyIncome service
        const result = await addMonthlyIncome(
            userData[0].id,
            monthYearDate,
            incomeAmountCents,
            allocationPercentages
        );

        // Format success message
        const formattedAmount = new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(incomeAmountCents);

        const allocationDetails = Object.entries(allocationPercentages)
            .map(([jar, percentage]) => `${jar}: ${percentage}%`)
            .join(', ');

        return { 
            success: true,
            message: `Monthly income of ${formattedAmount} for ${month_year} added successfully! Allocated to jars: ${allocationDetails}`,
            data: result
        };

    } catch (error) {
        console.error('Error in add_monthly_income:', error);
        return {
            success: false,
            error: error.message || 'Failed to add monthly income'
        };
    }
} 