import {
  ChatOpenAI,
  ChatOpenAICallOptions,
  OpenAIEmbeddings,
} from "@langchain/openai";
import { LLMChain } from "langchain/chains";
import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import { BufferMemory } from "langchain/memory";
import { formatDocumentsAsString } from "langchain/util/document";
import { Document } from "@langchain/core/documents";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { BaseMessage } from "@langchain/core/messages";
import { Collection, MongoClient, Document as MongoDBDocument } from "mongodb";
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";

import dotenv from "dotenv";
import { MongoDBChatMessageHistory } from "@langchain/mongodb";
dotenv.config();

const questionTemplate = `Use the following pieces of context to answer the question at the end. If you don't know the answer, just say that you don't know, don't try to make up an answer.
----------
CONTEXT: {context}
----------
CHAT HISTORY: {chatHistory}
----------
QUESTION: {question}
----------
Helpful Answer:`;

export const getMongoCollection = () => {
  const client: MongoClient = new MongoClient(
    process.env.MONGODB_ATLAS_URI || ""
  );

  const collection: Collection<MongoDBDocument> = client
    .db("langchain")
    .collection("memory");

  return collection;
};

export const getDocuments = async () => {
  const loader = new DirectoryLoader("./documents", {
    ".pdf": (path) => new PDFLoader(path),
  });

  return await loader.load();
};

export const getVectorStore = async (docs: Document<Record<string, any>>[]) => {
  const vectorStore = await HNSWLib.fromDocuments(
    docs,
    new OpenAIEmbeddings({ openAIApiKey: process.env.OPEN_AI_APIKEY })
  );

  return vectorStore;
};

export const getMemory = (
  sessionId: string,
  collection: Collection<MongoDBDocument>
) => {
  const memory = new BufferMemory({
    chatHistory: new MongoDBChatMessageHistory({
      collection,
      sessionId,
    }),
  });

  return memory;
};

const serializeChatHistory = (chatHistory: Array<BaseMessage>): string =>
  chatHistory
    .map((chatMessage) => {
      if (chatMessage._getType() === "human") {
        return `Human: ${chatMessage.content}`;
      } else if (chatMessage._getType() === "ai") {
        return `Assistant: ${chatMessage.content}`;
      } else {
        return `${chatMessage.content}`;
      }
    })
    .join("\n");

    export const getLLMChain = () => {
  const questionPrompt = PromptTemplate.fromTemplate(questionTemplate);

  // Initialize fast and slow LLMs, along with chains for each
  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPEN_AI_APIKEY,
  });
  const chain = new LLMChain({
    llm: model,
    prompt: questionPrompt,
  });

  return chain;
};

export const getChain = (
  memory: BufferMemory,
  LLMChain: LLMChain<string, ChatOpenAI<ChatOpenAICallOptions>>,
  vectorStore: HNSWLib
) => {
  const performQuestionAnswering = async (input: {
    question: string;
    chatHistory: Array<BaseMessage> | null;
    context: Array<Document>;
  }): Promise<{ result: string; sourceDocuments: Array<Document> }> => {
    let newQuestion = input.question;
    // Serialize context and chat history into strings
    const serializedDocs = formatDocumentsAsString(input.context);
    const chatHistoryString = input.chatHistory
      ? serializeChatHistory(input.chatHistory)
      : null;

    const response = await LLMChain.invoke({
      chatHistory: chatHistoryString ?? "",
      context: serializedDocs,
      question: newQuestion,
    });

    // Save the chat history to memory
    await memory.saveContext(
      {
        question: input.question,
      },
      {
        text: response.text,
      }
    );

    return {
      result: response.text,
      sourceDocuments: input.context,
    };
  };

  const retriever = vectorStore.asRetriever();

  const mainChain = RunnableSequence.from([
    {
      // Pipe the question through unchanged
      question: (input: { question: string }) => input.question,
      // Fetch the chat history, and return the history or null if not present
      chatHistory: async () => {
        const savedMemory = await memory.chatHistory.getMessages();
        const hasHistory = savedMemory.length > 0;
        return hasHistory ? savedMemory : null;
      },
      // Fetch relevant context based on the question
      context: async (input: { question: string }) =>
        retriever.getRelevantDocuments(input.question),
    },
    performQuestionAnswering,
  ]);

  return mainChain;
};



