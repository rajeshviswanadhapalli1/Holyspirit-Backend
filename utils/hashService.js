const bcrypt = require("bcrypt");

/**
 * Generates a hashed password.
 * @param {string} password - The plain text password.
 * @returns {Promise<string>} - The hashed password.
 */
const generateHash = async (password) => {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    console.log("Hashed Password:", hashedPassword);
    return hashedPassword;
  };
  

  /**
 * Compares a plain text password with a hashed password.
 * @param {string} password - The plain text password.
 * @param {string} hash - The hashed password.
 * @returns {Promise<boolean>} - True if the passwords match.
 */

  const compareHash = async (password, hash) => {
    return await bcrypt.compare(password, hash);
  };
  
  module.exports = {
    generateHash,
    compareHash,
  };