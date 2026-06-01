require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const connectDB = require('./utils/db');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const languageRoutes = require('./routes/languageRoutes');
const testamentRoutes = require('./routes/testamentRoutes')
const bookRoutes = require('./routes/bookRoutes')
const verseRoutes = require('./routes/verseRoutes')
const bibleRoutes = require('./routes/bibleRoutes')
const promiseRoutes = require('./routes/promiseRoutes')
const { startDailyPromiseCron } = require('./jobs/dailyPromiseCron');
const app = express();


app.use(bodyParser.json());
app.use(cors());

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/language', languageRoutes);
app.use('/api/testament', testamentRoutes);
app.use('/api/book', bookRoutes)
app.use('/api/verse', verseRoutes);
app.use('/api/bible', bibleRoutes);
app.use('/api/promises', promiseRoutes)

// Default 5001: macOS AirPlay Receiver often binds port 5000
const PORT = process.env.PORT || 5001;

connectDB().then(() => {
  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    startDailyPromiseCron();
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(
        `Port ${PORT} is in use. Set PORT in .env (e.g. 5001) or stop the other process.`
      );
    } else {
      console.error('Server failed to start:', err.message);
    }
    process.exit(1);
  });
});