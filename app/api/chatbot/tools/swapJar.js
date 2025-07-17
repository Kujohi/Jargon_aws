import { authClient } from '@/services/awsAuthClient';

export const declaration = {
  name: 'swap_jar',
  description: 'Transfer money from one jar to another for the authenticated user',
  parameters: {
    type: 'object',
    properties: {
      fromJarName: { type: 'string', description: 'Source jar name' },
      toJarName: { type: 'string', description: 'Target jar name' },
      amountCents: { type: 'number', description: 'Amount to transfer in VND' },
      description: { type: 'string', description: 'Description for the transfer', default: 'Jar swap' }
    },
    required: ['fromJarName', 'toJarName', 'amountCents']
  }
};

export const handler = async ({ fromJarName, toJarName, amountCents, description = 'Jar swap', userToken }) => {
  try {
    if (!userToken) {
      throw new Error('User authentication required');
    }
    
    // Get current user from AWS Cognito token
    const { data: { user }, error: userError } = await authClient.getUser(userToken);
    if (userError || !user) throw new Error('User not authenticated');
    
    // Format the amount for display
    const formattedAmount = new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amountCents);
    
    // For now, just acknowledge the swap request
    // In a full implementation, this would create transactions to move money between jars
    return { 
      success: true,
      message: `Jar swap request acknowledged: ${formattedAmount} from ${fromJarName} to ${toJarName}. This feature will be implemented in the full version.`
    };
  } catch (error) {
    console.error('Error in swap_jar:', error);
    return {
      success: false,
      error: error.message || 'Failed to swap jars'
    };
  }
}; 