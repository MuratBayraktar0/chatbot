# LangChain Chatbot

This project contains a chatbot application that utilizes MongoDB to store past messages and responds to incoming requests. This README file provides instructions for installation and usage of the project.

## Installation

1. Clone the project repository:

    ```bash
    git clone https://github.com/MuratBayraktar0/chatbot.git
    ```

2. Navigate to the project directory:

    ```bash
    cd chatbot
    ```

3. Install the project dependencies using npm:

    ```bash
    npm install
    ```

## Getting Started

After installing the dependencies, start the application by running:

```bash
npm run dev
```

## Usage

Once the application is running, you can send a POST request to http://localhost:3000/api/questions to communicate with the chatbot.

Example POST request body:

```json
{
    "question": "Whose age did you mention earlier?",
    "session_id": "d21214d929"
}
````
The chatbot will respond with a message from past conversations similar to "Whose age did you mention earlier?". The session_id field is used for session identification.

## Technologies
This project utilizes the following technologies:

- Node.js
- TypeScript
- Express.js
- MongoDB
