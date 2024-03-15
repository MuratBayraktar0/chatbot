// src/index.js
import express, { Express, Request, Response } from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import ChatBot from "./src/Chatbot";

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

app.post("/askme", async (req: Request, res: Response) => {
  try {
    const data = req.body;

    // Check if sessionID and question are provided
    if (!data.sessionID || !data.question) {
      return res
        .status(400)
        .json({ error: "sessionID and question are required" });
    }

    const chatbot = new ChatBot(data.sessionID);
    await chatbot.initialize();
    await chatbot.ask(data.question);

    const chatHistory = await chatbot.getChatHistory();

    // Return response with status code 201 and the BaseMessage[]
    res.status(201).json(chatHistory);
  } catch (error) {
    console.error("Error handling request:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
