import { BufferMemory } from "langchain/memory";
import {
  getDocuments,
  getVectorStore,
  getMongoCollection,
  getMemory,
  getLLMChain,
  getChain,
} from "./langchain";

class ChatBot {
  private sessionId: string;
  private memory: BufferMemory | null;
  private chain: any | null;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.memory = null;
    this.chain = null;
  }

  async initialize() {
    const documents = await getDocuments();
    const vectorStore = await getVectorStore(documents);
    const collection = getMongoCollection();
    this.memory = getMemory(this.sessionId, collection);
    const llmChain = getLLMChain();
    this.chain = getChain(this.memory, llmChain, vectorStore);
  }

  async ask(question: string) {
    if (!this.chain) {
      throw new Error("Chain is not initialized.");
    }
    await this.chain.invoke({
      question,
    });
  }

  async getChatHistory() {
    if (!this.memory) {
      throw new Error("Memory is not initialized.");
    }
    return this.memory.chatHistory.getMessages();
  }
}

export default ChatBot;
