import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Basic health check - you can add more sophisticated checks here
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: 'checking...',
        bedrock: 'checking...'
      }
    };

    // Quick database connectivity check
    try {
      const { dbClient } = await import('@/services/awsDbClient');
      await dbClient.query('SELECT 1');
      healthStatus.services.database = 'healthy';
    } catch (error) {
      healthStatus.services.database = 'unhealthy';
      healthStatus.status = 'degraded';
    }

    // Quick Bedrock connectivity check
    try {
      const { bedrockClient } = await import('@/services/awsBedrockClient');
      // We won't actually call Bedrock to avoid costs, just check if client initializes
      if (bedrockClient) {
        healthStatus.services.bedrock = 'healthy';
      }
    } catch (error) {
      healthStatus.services.bedrock = 'unhealthy';
      healthStatus.status = 'degraded';
    }

    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
    return NextResponse.json(healthStatus, { status: statusCode });

  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    }, { status: 503 });
  }
} 