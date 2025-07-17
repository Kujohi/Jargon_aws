/**
 * ML Service Configuration
 * 
 * This file manages the endpoints for ML forecasting service.
 * Switch between local development, ECS, and Lambda deployments.
 */

const ML_SERVICE_ENDPOINTS = {
  // Local development (FastAPI)
  LOCAL: "http://localhost:8000/forecast",
  
  // ECS Fargate deployment
  ECS: "http://jargon-alb-180410492.ap-southeast-1.elb.amazonaws.com/ml/forecast",
  
  // AWS Lambda deployment (update with your actual API Gateway URL)
  LAMBDA: "https://k0cqn5m1xl.execute-api.ap-southeast-1.amazonaws.com/forecast",
  
  // Alternative: Use Lambda via ALB (if configured)
  // LAMBDA_ALB: "http://jargon-alb-180410492.ap-southeast-1.elb.amazonaws.com/ml/forecast"
};

/**
 * Current ML service endpoint configuration
 * 
 * Options:
 * - 'LOCAL': Use for local development with FastAPI
 * - 'ECS': Use for ECS Fargate deployment
 * - 'LAMBDA': Use for AWS Lambda deployment
 * - 'LAMBDA_ALB': Use Lambda through existing ALB
 */
// const CURRENT_ML_ENDPOINT = process.env.NODE_ENV === 'development' 
//   ? ML_SERVICE_ENDPOINTS.LOCAL
//   : ML_SERVICE_ENDPOINTS.LAMBDA; // Change this to LAMBDA when ready
const CURRENT_ML_ENDPOINT = ML_SERVICE_ENDPOINTS.LOCAL
/**
 * Get the current ML service endpoint
 */
export const getMlServiceEndpoint = () => {
  return CURRENT_ML_ENDPOINT;
};

/**
 * Make a forecast request to the ML service
 */
export const makeForecastRequest = async (data, target, options = {}) => {
  const {
    periods = 6,
    freq = "M",
    ...requestOptions
  } = options;

  const endpoint = getMlServiceEndpoint();
  
  const requestBody = {
    data,
    periods,
    freq,
    target,
    ...requestOptions
  };

  console.log(`Making forecast request to: ${endpoint}`);
  console.log('Request data:', requestBody);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ML Service error: ${response.status} - ${errorText}`);
  }

  return response.json();
};

/**
 * Utility to check if ML service is available
 */
export const checkMlServiceHealth = async () => {
  try {
    const endpoint = getMlServiceEndpoint();
    
    // Simple test request
    const testData = [
      { date: '2024-01-01', balance: 1000 },
      { date: '2024-02-01', balance: 1100 }
    ];
    
    await makeForecastRequest(testData, 2000, { periods: 2 });
    return { available: true, endpoint };
  } catch (error) {
    return { available: false, endpoint: getMlServiceEndpoint(), error: error.message };
  }
};

export default {
  getMlServiceEndpoint,
  makeForecastRequest,
  checkMlServiceHealth,
  ENDPOINTS: ML_SERVICE_ENDPOINTS
}; 