const User = require("../../models/user");

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const {
  signupValidation,
  loginValidations,
  newPasswordValidation,
  editProfilevalidation,
} = require("../../validations/auth");

const {
  generateAccessToken,
  generateRefreshToken,
} = require("../../utils/generateTokens");
const { GraphQLError } = require("graphql");
const {
  uploadSingleFile,
  clearImage,
} = require("../../middlewares/upload-images");

const authResolvers = {
  Query: {
    getUser: async (_, __, { req, res }) => {
      try {
        if (!req.isAuth) {
          return new GraphQLError("un-authenticated", {
            extensions: { code: 401 },
          });
        }
        const { userId } = req;
        const user = await User.findById(userId, {
          password: 0,
          __v: 0,
        });
        if (!user) {
          return new GraphQLError("User not found", {
            extensions: { code: 404 },
          });
        }
        return user;
      } catch (error) {
        return new GraphQLError(error);
      }
    },
    refreshToken: async (_, __, { req, res }) => {
      try {
        const refreshToken = req.cookies["refresh-token"];
        const decoded = jwt.verify(
          refreshToken,
          process.env.REFRESH_TOKEN_SECRET
        );

        const user = await User.findOne(
          { "refreshTokens.token": refreshToken },
          { password: 0, __v: 0, refreshTokens: 0 }
        );

        if (!user || !decoded) {
          return new GraphQLError("Invalid refresh token.", {
            extensions: { code: 401 },
          });
        }
        const accessToken = generateAccessToken(user._id.toString());
        return { user: user, token: accessToken };
      } catch (error) {
        return new GraphQLError(error);
      }
    },
  },
  Mutation: {
    login: async (parent, { userInput }, { req, res }, info) => {
      const { email, password } = userInput;

      const errors = await loginValidations(userInput);

      if (errors.length !== 0) {
        const error = new GraphQLError("validation failed.");
        error.extensions.code = 422;
        error.extensions.data = errors;
        throw error;
      }

      try {
        const user = await User.findOne({ email });

        if (!user) {
          return new GraphQLError("Invalid email or password", {
            extensions: {
              code: 401,
            },
          });
        }

        const valid = await bcrypt.compare(password, user.password);

        if (!valid) {
          return new GraphQLError("Invalid email or password", {
            extensions: {
              code: 401,
            },
          });
        }

        const accessToken = generateAccessToken(user._id.toString());
        const refreshToken = generateRefreshToken(user._id.toString());
        user.refreshTokens.push({ token: refreshToken });
        await user.save();

        res.cookie("refresh-token", refreshToken, {
          httpOnly: true,
          secure: true,
          sameSite: "None",
          maxAge: 1 * 24 * 60 * 60 * 1000,
        });

        delete user._doc.password;
        delete user._doc.refreshTokens;

        return { user: user, token: accessToken };
      } catch (error) {
        return new GraphQLError(error);
      }
    },
    createUser: async (parent, { userInput }, { req, res }, info) => {
      const { name, email, password, passwordConfirmation } = userInput;

      const errors = await signupValidation(userInput);

      if (errors.length !== 0) {
        const error = new GraphQLError("validation failed.");
        error.extensions.code = 422;
        error.extensions.data = errors;
        throw error;
      }

      try {
        const existingUser = await User.findOne({ email });

        if (existingUser) {
          return new GraphQLError("User already exists", {
            extensions: {
              code: 422,
            },
          });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const user = new User({
          name,
          email,
          password: hashedPassword,
        });
        await user.save();

        return user._id.toString();
      } catch (error) {
        return new GraphQLError(error);
      }
    },
    changePassword: async (_, { userInput }, { req, res }) => {
      const { oldPassword, newPassword } = userInput;

      if (!req.isAuth) {
        return new GraphQLError("un-authenticated", {
          extensions: { code: 401 },
        });
      }

      const errors = await newPasswordValidation(userInput);

      if (errors.length !== 0) {
        const error = new GraphQLError("validation failed.");
        error.extensions.code = 422;
        error.extensions.data = errors;
        throw error;
      }

      try {
        const { userId } = req;
        const user = await User.findById(userId);

        const isEqual = await bcrypt.compare(oldPassword, user.password);
        if (!isEqual) {
          return new GraphQLError("Invalid password", {
            extensions: {
              code: 422,
            },
          });
        }
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        user.password = hashedPassword;
        await user.save();
        return "password changed successfully";
      } catch (error) {
        return new GraphQLError(error);
      }
    },
    editProfile: async (_, { userInput }, { req, res }) => {
      const { name, avatar } = userInput;

      if (!req.isAuth) {
        return new GraphQLError("un-authenticated", {
          extensions: { code: 401 },
        });
      }

      const errors = await editProfilevalidation(userInput);

      if (errors.length !== 0) {
        const error = new GraphQLError("validation failed.");
        error.extensions.code = 422;
        error.extensions.data = errors;
        throw error;
      }

      try {
        const user = await User.findById(req.userId);
        const oldAvatar = user.avatar;
        user.name = name;
        if (avatar) {
          const imageUrl = await uploadSingleFile(avatar, "chat-app");
          user.avatar = imageUrl;
        }
        await user.save();
        delete user._doc.password;
        delete user._doc.refreshTokens;
        if (oldAvatar) {
          clearImage(oldAvatar, "chat-app");
        }

        return user;
      } catch (error) {
        return new GraphQLError(error);
      }
    },
  },
};

module.exports = authResolvers;
