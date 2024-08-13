# graphql-chat-app-backend

This project is a full-featured chat application built using Node.js, Express, Apollo Server, Socket.IO, and MongoDB. The application supports real-time communication, user authentication, GraphQL-based APIs for managing chat data, and Cloudinary integration for file uploading.

## Table of Contents

- [Features](#features)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Running the Application](#running-the-application)
- [GraphQL API](#graphql-api)
  - [Queries](#queries)
  - [Mutations](#mutations)
- [Socket.IO Events](#socketio-events)
- [Project Structure](#project-structure)
- [Contact](#contact)

## Features

- **Real-time Communication**: Leveraging Socket.IO for real-time chat and event-driven features like typing indicators and room management.
- **GraphQL API**: Utilizes Apollo Server to expose a GraphQL API for managing users, chats, and messages.
- **User Authentication**: Secure user authentication using JWT (JSON Web Token).
- **File Uploads**: Supports file uploads via GraphQL mutations with `graphql-upload`.
- **User Status Management**: Track user online/offline status and broadcast changes to other users.
- **Room Management**: Users can join and leave chat rooms.
- **Error Handling**: Centralized error handling for both GraphQL and Socket.IO events.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or later)
- [MongoDB](https://www.mongodb.com/) (Running instance or MongoDB Atlas account)

### Installation

1. Clone the repository:
    ```bash
    git clone https://github.com/Mo5444237/graphql-chat-app-backend.git
    cd graphql-chat-app-backend
    ```

2. Install the dependencies:
    ```bash
    npm install
    ```

### Environment Variables

Create a `.env` file in the root of the project and add the following environment variables:

```env
DATABASE_URI=mongodb_connection_string
CLIENT_URL=client_url
SERVER_PORT=3000

ACCESS_TOKEN_SECRET =access_token_secret_key
ACCESS_TOKEN_EXPIRATION =access_token_expiry_time
REFRESH_TOKEN_SECRET =refresh_token_secret_key
REFRESH_TOKEN_EXPIRATION =refresh_token_expiry_time

CLOUDINARY_CLOUD_NAME =cloudinary_cloud_name
CLOUDINARY_API_KEY =cloudinary_api_key
CLOUDINARY_API_SECRET = cloudinary_api_secret
```

### Running the Application
1. Start the server:
    ```bash
    npm start
    ```
2. The server should now be running at http://localhost:3000/graphql.

## GraphQL API
The GraphQL API provides a flexible way to interact with the chat application's data. Below is an overview of the main operations:

### Queries
#### Authentication
- **`getUser: User!`**  
  Fetches the authenticated user's information.

- **`refreshToken: AuthData!`**  
  Generates a new access token for the user.

#### Chats
- **`getUserChats: [Chat]!`**  
  Retrieves all chats the user is part of.

- **`getChatMessages(chatId: ID!): [Message]!`**  
  Fetches all messages from a specific chat.

- **`getChatMedia(chatId: ID!): [Message]!`**  
  Retrieves all media files shared in a specific chat.

#### Messages
- **`getMessageInfo(messageId: ID!): Message!`**  
  Provides detailed information about a specific message.

#### Contacts
- **`getContacts: [User]!`**  
  Retrieves the user's contact list.

### Mutations
#### Authentication
- **`login(userInput: UserInputData!): AuthData!`**  
  Authenticates a user and returns access tokens.

- **`createUser(userInput: CreateUserData!): String!`**  
  Registers a new user account.

- **`changePassword(userInput: changePasswordInputData!): String!`**  
  Allows the user to change their password.

- **`editProfile(userInput: editProfileData!): User!`**  
  Updates the user's profile information.

- **`blockUser(userId: ID!): [User]!`**  
  Blocks a specific user.

- **`unblockUser(userId: ID!): [User]!`**  
  Unblocks a previously blocked user.

- **`logout: ID!`**  
  Logs the user out of the system.

#### Chat Management
- **`createChat(chatInput: ChatInputData!): Chat!`**  
  Creates a new chat.

- **`editChat(chatInput: EditChatInputData!): Chat!`**  
  Edits an existing chat's details.

- **`addUsersToChat(chatInput: AddUsersInputData!): String!`**  
  Adds users to an existing chat.

- **`deleteUserFromChat(chatInput: EditChatUsersInputData!): String!`**  
  Removes a user from a chat.

#### Messaging
- **`sendMessage(messageInput: MessageInputData!): Message!`**  
  Sends a new message in a chat.

- **`markMessageAsSeen(chatId: ID!): String!`**  
  Marks all messages in a chat as seen.

#### Contact Management
- **`addContact(contactInput: contactInputData!): String!`**  
  Adds a new contact to the user's contact list.

- **`deleteContact(userId: ID!): String!`**  
  Removes a contact from the user's contact list.

- **`editContact(contactInput: contactEditData!): String!`**  
  Edits an existing contact's information.

### Socket.IO Events

- **`connection`**: 
  - Triggered when a client connects to the server. It handles user authentication and updates the user's online status.

- **`joinRoom`**:
  - **Description**: Adds the client to a specific room.
  - **Parameters**: `room` - Represents the userId in this case.
  - **Example**: `socket.emit("joinRoom", "some_id")`

- **`leaveRoom`**:
  - **Description**: Removes the client from a specific room.
  - **Parameters**: `room` - Represents the userId in this case.
  - **Example**: `socket.emit("leaveRoom", "some_id")`

- **`typing`**:
  - **Description**: Notifies a specific user that someone is typing in a chat.
  - **Parameters**: 
    - `chatId` - The ID of the chat where typing is occurring.
    - `userId` - The ID of the user who is typing.
    - `user` - The username or details of the user typing.
  - **Example**: `socket.emit("typing", { chatId: "chat123", userId: "user456", user: "John Doe" })`

- **`disconnect`**:
  - **Description**: Triggered when a client disconnects from the server. Updates the user's status to offline and records the last seen time.
  - **Example**: No parameters; updates user status upon disconnection.

## Project Structure

This project is organized as follows:

- **graphql**: Contains all GraphQL-related files.
  - **resolvers**: Holds the resolver functions for various operations.
    - `auth.js`: Resolver for authentication-related queries and mutations.
    - `chat.js`: Resolver for chat-related queries and mutations.
    - `contact.js`: Resolver for contact-related queries and mutations.
    - `message.js`: Resolver for message-related queries and mutations.
    - `rootResolvers.js`: Combines all individual resolvers.
  - `schema.graphql`: Defines the GraphQL schema.

- **middlewares**: Contains middleware functions that intercept requests.
  - `auth.js`: Middleware for handling authentication.
  - `checkBlocked.js`: Middleware to check if a user is blocked.
  - `upload-images.js`: Middleware for handling image uploads.

- **models**: Contains the data models representing the application's entities.
  - `chat.js`: Chat model.
  - `message.js`: Message model.
  - `user.js`: User model.

- **utils**: Utility functions used across the application.
  - `auth.js`: Utility functions related to authentication.
  - `chat.js`: Utility functions related to chat.
  - `generateTokens.js`: Utility for generating authentication tokens.

- **validations**: Contains validation logic for different parts of the application.
  - `auth.js`: Validation for authentication-related requests.

- **Other Files**:
  - `.env`: Environment variables configuration.
  - `.gitignore`: Specifies files and directories to be ignored by Git.
  - `app.js`: The main entry point of the application.
  - `package-lock.json` and `package.json`: Node.js dependencies and scripts.

## Contact

Have questions or feedback? Reach out to us at:

- Email: [mo5444237@gmail.com](mailto:mo5444237@gmail.com)
- GitHub Issues: [Open an Issue](https://github.com/Mo5444237/graphql-chat-app-backend/issues)
