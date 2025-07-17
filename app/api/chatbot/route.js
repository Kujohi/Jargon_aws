import { NextResponse } from 'next/server';
import { bedrockClient } from '@/services/awsBedrockClient';
import { authClient } from '@/services/awsAuthClient';
import * as updateTransaction from "./tools/updateTransaction";
import * as addMonthlyIncome from "./tools/addMonthlyIncome";
import * as swapJar from "./tools/swapJar";
import * as setSavingTarget from "./tools/setSavingTarget";
import * as searchTransactions from "./tools/searchTransactions";
import * as predictSavings from "./tools/predictSavings";

// Sleep utility with exponential backoff
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const MAX_RETRIES = 10;
const BASE_DELAY = 2000; // 2 seconds base delay

const retryWithExponentialBackoff = async (operation, retryCount = 0) => {
  try {
    return await operation();
  } catch (error) {
    if (error.message?.includes('ThrottlingException') && retryCount < MAX_RETRIES) {
      const delay = BASE_DELAY * Math.pow(2, retryCount);
      await sleep(delay);
      return retryWithExponentialBackoff(operation, retryCount + 1);
    }
    throw error;
  }
};

const modules = [updateTransaction, addMonthlyIncome, swapJar, setSavingTarget, searchTransactions, predictSavings]; // All tools enabled
const functionDeclarations = modules.map((m) => m.declaration);
const handlers = Object.fromEntries(
  modules.map((m) => [m.declaration.name, m.handler])
);

export async function POST(request) {
  try {
    const { message, conversationHistory = [], userToken } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Create system prompt for Jargon AI financial assistant
    const systemPrompt = `You are Jargon AI's AI Financial Assistant. You help users with:
- Personal finance management and budgeting advice
- Jargon AI banking products and services
- Financial planning and goal setting
- Investment guidance and savings strategies
- Transaction categorization and spending insights
- Vietnamese financial regulations and banking practices

Always be helpful, professional, and provide practical financial advice. 
Keep responses concise but informative. If asked about specific Jargon AI products, 
provide general information and suggest contacting Jargon AI directly for detailed terms.

IMPORTANT TOOL USAGE GUIDELINES:
- When user mentions receiving MONTHLY INCOME/SALARY (e.g., "I received my salary", "my monthly income is X"), use "add_monthly_income" tool. This will ask for allocation percentages and properly distribute the income across all jars.
- When user mentions regular income/expense to a specific jar (e.g., "I spent money on food", "I earned from freelance"), use "update_transaction" tool.
- When user mentions setting a SAVINGS TARGET/GOAL (e.g., "I want to save 5 million VND", "set my savings target to 10 million"), use "set_saving_target" tool.
- When user asks questions about their spending or transactions (e.g., "How much did I spend on coffee?", "Did I buy anything yesterday?", "Show me my food expenses"), use "search_transactions" tool to find relevant transactions.
- When user asks about future financial goals or predictions (e.g., "When can I save 100k?", "When can I buy a 10k USD car?", "How long until I reach my savings goal?"), use "predict_savings" tool to forecast based on their historical savings data.
- For search results, provide natural language responses that directly answer the user's question. For example:
  * If they ask "Did I buy coffee today?" and no transactions are found, say "No, you haven't bought any coffee today."
  * If they ask "How much did I spend on food?" and transactions are found, summarize the total amount and mention key purchases.
  * If they ask "Show me my recent expenses" and transactions are found, list the most recent ones with amounts and descriptions.
- For prediction results, provide clear answers about when they can reach their goal. For example:
  * If they ask "When can I save 100k?" and the prediction shows a target date, say "Based on your current savings rate, you can reach 100k VND by [date]."
  * If they ask about buying something expensive, explain the timeline and suggest ways to reach the goal faster.
- Always ask for allocation percentages when adding monthly income using default values (Necessity: 55%, Play: 10%, Education: 10%, Investment: 10%, Charity: 5%, Savings: 10%) but allow user to customize them.

Respond in the same language the user asks Vietnamese.`;

    // Build messages array for Claude format
    const messages = [];
    
    // Add conversation history
    conversationHistory.forEach((msg) => {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    });
    
    // Add current message
    messages.push({
      role: "user",
      content: message
    });

    // Transform function declarations to Bedrock format
    const bedrockTools = functionDeclarations.map(func => ({
      name: func.name,
      description: func.description,
      input_schema: {
        type: "object",
        properties: func.parameters?.properties || {},
        required: func.parameters?.required || []
      }
    }));

    const response = await bedrockClient.generateContentWithMessages(
      messages,
      bedrockTools,
      systemPrompt,
      {
        max_tokens: 4000,
        temperature: 0.7
      }
    );

    if (response.error) {
      throw response.error;
    }

    // If the model chose a function, dispatch to its handler
    if (response.functionCalls && response.functionCalls.length > 0) {
      const call = response.functionCalls[0];
      const fn = handlers[call.name];
      if (!fn) throw new Error(`No handler for function ${call.name}`);
      
      // Execute tool with retry logic
      const result = await retryWithExponentialBackoff(async () => {
        const toolResult = await fn({ ...call.args, userToken });
        // Add longer delay after tool execution (3 seconds)
        await sleep(3000);
        return toolResult;
      });
      
      // Generate a natural language response with retry logic
      const functionResponsePrompt = `Based on the function result below, provide a natural language response to the user's question. 
      
Function called: ${call.name}
Function arguments: ${JSON.stringify(call.args)}
Function result: ${JSON.stringify(result)}

User's original question: ${message}

Please provide a helpful, natural response in the same language as the user's question. If the function was successful, explain the results in a user-friendly way. If there was an error, explain what went wrong.`;

      const functionResponse = await retryWithExponentialBackoff(async () => {
        const response = await bedrockClient.generateText(functionResponsePrompt);
        // Add delay before sending final response (2 seconds)
        await sleep(2000);
        return response;
      });

      if (functionResponse.error) {
        throw functionResponse.error;
      }

      return NextResponse.json({ 
        response: functionResponse.text,
        success: true,
        functionData: result
      });
    }

    // Add delay before sending direct response (2 seconds)
    await sleep(2000);
    
    return NextResponse.json({ 
      response: response.text,
      success: true 
    });

  } catch (error) {
    console.error('Chatbot API error:', error);
    return NextResponse.json({ 
      error: 'Failed to generate response',
      details: error.message 
    }, { status: 500 });
  }
} 