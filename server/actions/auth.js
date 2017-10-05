const validate = require("validate.js");
const { User } = require("../models");

const constraints = {
  username: {
    presence: true,
    length: {
      minimum: 2,
      message: "must be at least 2 characters"
    }
  },
  password: {
    presence: true,
    length: {
      minimum: 2,
      message: "must be at least 2 characters"
    }
  }
};

const success = (client, user, callback) => {
  client.user = user;
  const { username, token, boards } = user;
  client.emit("authSuccess", { username, token, boards });
  callback(null, true);
};

const failure = (client, callback, message) => {
  client.user = null;
  client.emit("authFail", message);
  callback(new Error(message));
};

const auth = async (client, data, callback) => {
  const { username, password, token, register } = data;
  let message = "Invalid username or password";
  try {
    let user;
    if (register) {
      const invalid = validate({ username, password }, constraints);
      if (invalid) throw new Error(message);
      message = "Unavailable username";
      user = await User.create({ username, password });
    } else if (token) {
      message = "Expired session";
      user = await User.findOne({ token });
    } else {
      // explicitly grab passwordHash to validate password
      user = await User.findOne({ username }, { passwordHash: 1 });
      // grab a regularly-projected user if password is valid
      user =
        user && user.validPassword(password)
          ? await User.findOne({ username })
          : null;
    }
    user ? success(client, user, callback) : failure(client, callback, message);
  } catch (error) {
    console.error(error.message);
    failure(client, callback, message);
  }
};

module.exports = auth;
