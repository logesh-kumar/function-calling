require('dotenv').config();  // Load environment variables from .env
const { Configuration, OpenAIApi } = require('openai');

// Set up the OpenAI API configuration
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,  // Use the API key from .env
});

const openai = new OpenAIApi(configuration);

// Define functions that can be called by the model
const functions = {
  calculateSum: (a, b) => {
    return a + b;
  }
};

// Function to interact with the OpenAI API
async function callOpenAI() {
  const response = await openai.createChatCompletion({
    model: "gpt-4-0613",  // Ensure the model supports function calling
    messages: [
      { role: "system", content: "You are an assistant that can do simple calculations." },
      { role: "user", content: "What is the sum of 10 and 25?" }
    ],
    functions: [
      {
        name: "calculateSum",
        description: "Calculates the sum of two numbers",
        parameters: {
          type: "object",
          properties: {
            a: { type: "number", description: "First number" },
            b: { type: "number", description: "Second number" }
          },
          required: ["a", "b"]
        }
      }
    ],
    function_call: "auto"  // Let the model determine when to call the function
  });

  const message = response.data.choices[0].message;

  if (message.function_call) {
    const funcName = message.function_call.name;
    const args = JSON.parse(message.function_call.arguments);
    const result = functions[funcName](...Object.values(args));

    console.log(`Function result: ${result}`);
  } else {
    console.log(message.content);
  }
}

callOpenAI();
