const express = require("express");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const soketio = require("socket.io");

const { ApolloServer } = require("@apollo/server");
const { expressMiddleware } = require("@apollo/server/express4");
const {
  ApolloServerPluginDrainHttpServer,
} = require("@apollo/server/plugin/drainHttpServer");
const { graphqlUploadExpress } = require("graphql-upload");
const http = require("http");
const cors = require("cors");
const { readFileSync } = require("fs");
const resolvers = require("./graphql/rootResolvers.js");
const mongoose = require("mongoose");
const auth = require("./middlewares/auth.js");

const typeDefs = readFileSync("./graphql/schema.graphql", "utf8");

dotenv.config();
const app = express();

app.use(cookieParser());
app.use(bodyParser.json());

app.use(graphqlUploadExpress({ maxFileSize: 10000000, maxFiles: 10 }));

const httpServer = http.createServer(app);
const io = soketio(httpServer, {
  cors: {
    origin: "*",
  },
});

const server = new ApolloServer({
  typeDefs,
  resolvers,
  csrfPrevention: true,
  formatError: (error) => {
    console.log(error);
    return {
      message: error.message,
      statusCode: error.extensions.code || "INTERNAL_SERVER_ERROR",
      data: error.extensions.data || null,
    };
  },
  plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
});

async function startHttp() {
  await server.start();
  app.use(
    "/graphql",
    cors({
      origin: "http://localhost:5173",
      credentials: true,
    }),
    express.json(),
    expressMiddleware(server, {
      context: ({ req, res }) => {
        auth({ req, res });
        return { req, res, io };
      },
    })
  );
}
startHttp();

async function startServer() {
  try {
    await mongoose.connect(process.env.DATABASE_URI);
    console.log("MongoDB connected");

    httpServer.listen({ port: process.env.SERVER_PORT });
    console.log(`🚀 Server ready at http://localhost:3000/graphql`);
  } catch (err) {
    console.log(err);
  }
}

startServer();

io.on("connection", (socket) => {
  socket.on("joinRoom", (room) => {
    console.log("A client joined room", room);
    socket.join(room);
  });

  socket.on("leaveRoom", (room) => {
    socket.leave(room);
  });

  socket.on("typing", ({ chatId, userId }) => {
    socket.to(userId).emit("typing", { chatId, userId });
  });

  socket.on("disconnect", () => {
    console.log("A client disconnected");
  });
});
