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
const app = express();


app.use(bodyParser.json());
app.use(cors());

connectDB();

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/language', languageRoutes);
app.use('/api/testament', testamentRoutes);
app.use('/api/book', bookRoutes)
app.use('/api/verse', verseRoutes)

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));