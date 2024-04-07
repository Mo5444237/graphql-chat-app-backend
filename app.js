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
const http = require("http");
const cors = require("cors");
const { readFileSync } = require("fs");
const resolvers = require("./graphql/rootResolvers.js");
const mongoose = require("mongoose");
const auth = require("./middlewares/auth.js");

dotenv.config();
const app = express();

app.use(cookieParser());
app.use(bodyParser.json());

const typeDefs = readFileSync("./graphql/schema.graphql", "utf8");
const httpServer = http.createServer(app);
const io = soketio(httpServer, {
  cors: {
    origin: "*",
  },

});

const server = new ApolloServer({
  typeDefs,
  resolvers,
  formatError: (formattedError, err) => {
    console.log(formattedError);
    const {message, code} = JSON.parse(formattedError.message);
    return {message: message, status: code};
  },
  plugins: [ApolloServerPluginDrainHttpServer({ httpServer })]
});

async function startHttp() {
  await server.start();
  app.use(
    "/graphql",
    cors({
      origin: "*",
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
  console.log("A client connected");

  socket.on("joinRoom", (room) => {
    console.log("A client joined room", room);
    socket.join(room);
  });

  socket.on("leaveRoom", (room) => {
    socket.leave(room);
  });

  socket.on("disconnect", () => {
    console.log("A client disconnected");
  });
});
