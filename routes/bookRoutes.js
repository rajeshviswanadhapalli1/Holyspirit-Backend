const express = require('express');
// const { addLanguage,getLanguages, deleteLanguage, updateLanguage } = require('../controllers/languageController');
const { protect } = require('../middlewares/authMiddleware');
const { addBook, getAllBooks, updateBook, deleteBook, toggleBook, getAllBooksWithoutPagination, getBooksByLanguageAndTestament } = require('../controllers/bookController');
const router = express.Router();

router.post('/add-Book', protect, addBook);
router.get('/allBooks', protect, getAllBooks)
router.get('/allBooksWithoutPagination', protect, getAllBooksWithoutPagination)
router.get(
  '/by-language-testament/:languageId/:testamentId',
  getBooksByLanguageAndTestament
);
router.put('/books/:id', protect, updateBook);
router.put('/books/status', protect, toggleBook);
router.delete('/books/:id', protect, deleteBook);


module.exports = router;


