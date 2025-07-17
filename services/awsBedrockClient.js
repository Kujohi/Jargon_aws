import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';

// Initialize Bedrock client
const bedrockRuntimeClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Available models in Bedrock
const MODELS = {
  CLAUDE_3_5_SONNET: 'anthropic.claude-3-5-sonnet-20240620-v1:0',
  CLAUDE_3_HAIKU: 'anthropic.claude-3-haiku-20240307-v1:0',
  CLAUDE_3_OPUS: 'anthropic.claude-3-opus-20240229-v1:0',
  LLAMA_2_13B: 'meta.llama2-13b-chat-v1',
  LLAMA_2_70B: 'meta.llama2-70b-chat-v1',
};

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 10,
  baseDelay: 4000, // Base delay of 2 seconds
};

export const bedrockClient = {
  // Generate content using Claude model
  generateContent: async (options = {}) => {
    try {
      const {
        contents,
        model = MODELS.CLAUDE_3_5_SONNET,
        max_tokens = 4000,
        temperature = 0.7,
        tools = null,
      } = options;

      let prompt = '';
      if (typeof contents === 'string') {
        prompt = contents;
      } else if (Array.isArray(contents)) {
        prompt = contents.join('\n');
      }

      const requestBody = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens,
        temperature,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      };

      // Add tools if provided (for function calling)
      if (tools && tools.length > 0) {
        requestBody.tools = tools.map(tool => ({
          name: tool.name,
          description: tool.description,
          input_schema: {
            type: "object",
            properties: tool.parameters?.properties || {},
            required: tool.parameters?.required || []
          }
        }));
      }

      const command = new InvokeModelCommand({
        modelId: model,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(requestBody),
      });

      // Retry logic with exponential backoff for throttling
      let response;
      let retries = 0;
      const maxRetries = RETRY_CONFIG.maxRetries;
      
      while (retries <= maxRetries) {
        try {
          response = await bedrockRuntimeClient.send(command);
          break; // Success, exit retry loop
        } catch (error) {
          if (error.name === 'ThrottlingException' && retries < maxRetries) {
            const delay = Math.pow(2, retries) * RETRY_CONFIG.baseDelay; // Exponential backoff: 1s, 2s, 4s
            console.log(`Throttling detected, retrying in ${delay}ms (attempt ${retries + 1}/${maxRetries + 1})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            retries++;
          } else {
            throw error; // Re-throw if not throttling or max retries reached
          }
        }
      }
      
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      // Process the response
      if (responseBody.content && responseBody.content.length > 0) {
        const content = responseBody.content[0];
        
        // Check if there are tool uses (function calls)
        const toolUses = responseBody.content.filter(item => item.type === 'tool_use');
        
        return {
          text: content.type === 'text' ? content.text : '',
          functionCalls: toolUses.map(toolUse => ({
            name: toolUse.name,
            args: toolUse.input
          })),
          usage: responseBody.usage,
          error: null
        };
      }

      return {
        text: '',
        functionCalls: [],
        usage: responseBody.usage,
        error: new Error('No content in response')
      };

    } catch (error) {
      console.error('Bedrock generate content error:', error);
      return {
        text: '',
        functionCalls: [],
        usage: null,
        error
      };
    }
  },

  // Convenience method for simple text generation
  generateText: async (prompt, options = {}) => {
    const result = await bedrockClient.generateContent({
      contents: prompt,
      ...options
    });
    
    return {
      text: result.text,
      error: result.error
    };
  },

  // Generate content with function calling support
  generateContentWithTools: async (prompt, tools, options = {}) => {
    // Transform tools to Bedrock format
    const bedrockTools = tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }));

    return await bedrockClient.generateContent({
      contents: prompt,
      tools: bedrockTools,
      ...options
    });
  },

  // Generate content with Messages API format (proper Claude format)
  generateContentWithMessages: async (messages, tools, systemPrompt, options = {}) => {
    try {
      const {
        model = MODELS.CLAUDE_3_5_SONNET,
        max_tokens = 4000,
        temperature = 0.7,
      } = options;

      const requestBody = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens,
        temperature,
        system: systemPrompt,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      };

      // Add tools if provided
      if (tools && tools.length > 0) {
        requestBody.tools = tools;
      }

      const command = new InvokeModelCommand({
        modelId: model,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(requestBody),
      });

      // Retry logic with exponential backoff for throttling
      let response;
      let retries = 0;
      const maxRetries = RETRY_CONFIG.maxRetries;
      
      while (retries <= maxRetries) {
        try {
          response = await bedrockRuntimeClient.send(command);
          break; // Success, exit retry loop
        } catch (error) {
          if (error.name === 'ThrottlingException' && retries < maxRetries) {
            const delay = Math.pow(2, retries) * RETRY_CONFIG.baseDelay; // Exponential backoff: 1s, 2s, 4s
            console.log(`Throttling detected, retrying in ${delay}ms (attempt ${retries + 1}/${maxRetries + 1})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            retries++;
          } else {
            throw error; // Re-throw if not throttling or max retries reached
          }
        }
      }
      
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      // Process the response
      if (responseBody.content && responseBody.content.length > 0) {
        const textContent = responseBody.content.find(item => item.type === 'text');
        const toolUses = responseBody.content.filter(item => item.type === 'tool_use');
        
        return {
          text: textContent?.text || '',
          functionCalls: toolUses.map(toolUse => ({
            name: toolUse.name,
            args: toolUse.input,
            id: toolUse.id
          })),
          usage: responseBody.usage,
          error: null
        };
      }

      return {
        text: '',
        functionCalls: [],
        usage: responseBody.usage,
        error: new Error('No content in response')
      };

    } catch (error) {
      console.error('Bedrock generate content with messages error:', error);
      return {
        text: '',
        functionCalls: [],
        usage: null,
        error
      };
    }
  }
};

// Model helper functions
export const models = {
  CLAUDE_3_5_SONNET: MODELS.CLAUDE_3_5_SONNET,
  CLAUDE_3_HAIKU: MODELS.CLAUDE_3_HAIKU,
  CLAUDE_3_OPUS: MODELS.CLAUDE_3_OPUS,
  LLAMA_2_13B: MODELS.LLAMA_2_13B,
  LLAMA_2_70B: MODELS.LLAMA_2_70B,
};

export default bedrockClient; 