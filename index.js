require('dotenv').config();
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { OpenAI } = require('openai');

const prisma = new PrismaClient();
const app = express();
app.use(express.json());

const openai = new OpenAI();

// Define the deterministic JSON response function
// const functions = {
//   getDeterministicPost: async (id) => {
//     const post = await prisma.post.findUnique({
//       where: { id: parseInt(id) },
//     });

//     if (post) {
//       return {
//         id: post.id,
//         title: post.title.toUpperCase(),
//         content: post.content.toLowerCase(),
//         published: post.published,
//       };
//     } else {
//       return { error: 'Post not found' };
//     }
//   },
// };

const functions = {
  getDeterministicPostByTitle: async (title) => {
    const post = await prisma.post.findFirst({
      where: {
        title: {
          contains: title,          
        },
      },
    });

    if (post) {
      return {
        id: post.id,
        title: post.title.toUpperCase(),
        content: post.content.toLowerCase(),
        published: post.published,
      };
    } else {
      return { error: 'Post not found' };
    }
  },
};


app.post('/openai-function-call', async (req, res) => {
  const { input } = req.body;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",  
    messages: [
      { role: "system", content: "You are an assistant that can call functions to interact with the database." },
      { role: "user", content: input },
    ],
    functions: [
      {
        name: "getDeterministicPostByTitle",
        description: "Fetch a post by a similar title and return a deterministic JSON response",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string", description: "The title or part of the title of the post" },
          },
          required: ["title"],
        },
      },
    ],
    function_call: "auto",  // Let the model determine when to call the function
  });

  const message = response.choices?.[0]?.message;

  if (message?.function_call) {
    const funcName = message.function_call.name;
    const args = JSON.parse(message.function_call.arguments);
    const result = await functions[funcName](args.title);

    res.json(result);
  } else {
    res.status(400).json({ error: "Function call not triggered or failed." });
  }
});

// Other existing endpoints

// Get all posts
app.get('/posts', async (req, res) => {
  const posts = await prisma.post.findMany();
  res.json(posts);
});

// Create a new post
app.post('/posts', async (req, res) => {  
  const { title, content, published } = req.body;
  const newPost = await prisma.post.create({
    data: {
      title,
      content,
      published: published || false,
    },
  });
  res.json(newPost);
});

// Update a post
app.put('/posts/:id', async (req, res) => {
  const { id } = req.params;
  const { title, content, published } = req.body;
  const updatedPost = await prisma.post.update({
    where: { id: parseInt(id) },
    data: {
      title,
      content,
      published,
    },
  });
  res.json(updatedPost);
});

// Delete a post
app.delete('/posts/:id', async (req, res) => {
  const { id } = req.params;
  const deletedPost = await prisma.post.delete({
    where: { id: parseInt(id) },
  });
  res.json(deletedPost);
});


// Start the server
const PORT = process.env.PORT || 3200;
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
