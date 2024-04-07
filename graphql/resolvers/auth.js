const User = require("../../models/user");

const bcrypt = require("bcryptjs");

const {
  generateAccessToken,
  generateRefreshToken,
} = require("../../utils/generateTokens");

const authResolvers = {
  Query: {
    getUser: async (_, __, { req, res }) => {
      try {
        if (!req.isAuth) {
          const error = new Error("Not authenticated");
          error.code = 401;
          throw error;
        }
        const { userId } = req;
        const user = await User.findById(userId, {
          password: 0,
          __v: 0,
        });
        if (!user) {
          const error = new Error("User not found");
          error.code = 404;
          throw error;
        }
        return user;
      } catch (error) {
        throw new Error(error);
      }
    },
  },
  Mutation: {
    login: async (parent, { userInput }, { req, res }, info) => {
      const { email, password } = userInput;
      const user = await User.findOne({ email });

      if (!user) {
        throw new Error("Invalid email or password");
      }

      const valid = await bcrypt.compare(password, user.password);

      if (!valid) {
        throw new Error("Invalid email or password");
      }

      const accessToken = generateAccessToken(user._id.toString());
      const refreshToken = generateRefreshToken(user._id.toString());

      res.cookie("refresh-token", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "None",
        maxAge: 1 * 24 * 60 * 60 * 1000,
      });
      return { userId: user._id.toString(), token: accessToken };
    },
    createUser: async (parent, { userInput }, context, info) => {
      const { name, email, password } = userInput;
      const existingUser = await User.findOne({ email });

      if (existingUser) {
        throw new Error("User already exists");
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const user = new User({
        name,
        email,
        password: hashedPassword,
      });
      await user.save();

      return { userId: user._id.toString() };
    },
  },
};

module.exports = authResolvers;
