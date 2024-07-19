const validator = require("validator");

exports.signupValidation = async (userInput) => {
  const { name, email, password, passwordConfirmation } = userInput;
  const errors = [];
  if (validator.isEmpty(name)) {
    errors.push({
      field: "name",
      msg: "Enter a valid name.",
    });
  }

  if (!validator.isEmail(email)) {
    errors.push({
      field: "email",
      msg: "Invalid email format.",
    });
  }

  if (
    !validator.matches(
      password,
      /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])[0-9a-zA-Z]{8,}$/,
      "i"
    )
  ) {
    errors.push({
      field: "password",
      msg: "Enter a password with minimum length of 8, at least 1 lowerCase character, at least 1 upperCase character",
    });
  }

  if (password !== passwordConfirmation) {
    errors.push({
      field: "passwordConfirmation",
      msg: "Passwords have to match.",
    });
  }
  return errors;
};

exports.loginValidations = async (userInput) => {
  const { email, password } = userInput;
  const errors = [];

  if (!validator.isEmail(email)) {
    errors.push({
      field: "email",
      msg: "Invalid email format.",
    });
  }

  if (validator.isEmpty(password)) {
    errors.push({
      field: "password",
      msg: "Enter a valid password.",
    });
  }

  return errors;
};

exports.newPasswordValidation = async (userInput) => {
  const { newPassword, passwordConfirmation } = userInput;
  const errors = [];

  if (
    !validator.matches(
      newPassword,
      /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])[0-9a-zA-Z]{8,}$/,
      "i"
    )
  ) {
    errors.push({
      field: "password",
      msg: "Enter a password with minimum length of 8, at least 1 lowerCase character, at least 1 upperCase character",
    });
  }

  if (newPassword !== passwordConfirmation) {
    errors.push({
      field: "passwordConfirmation",
      msg: "Passwords have to match.",
    });
  }

  return errors;
};


exports.editProfilevalidation = async (userInput) => {
  const { name } = userInput;
  const errors = [];

  if (validator.isEmpty(name)) {
    errors.push({
      field: "name",
      msg: "Enter a valid name.",
    });
  }

  return errors;
}