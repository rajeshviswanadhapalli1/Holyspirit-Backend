const Verse = require('../models/verseModal');

// Add new verse set
exports.addVerses = async (req, res) => {
  try {
    const {
      languageId,
      testamentId,
      bookId,
      chapterName,
      chapterIndex,
      verseCount,
      verses
    } = req.body;

    // Validation (optional)
    if (!languageId || !testamentId || !bookId || !chapterName || !chapterIndex || !verseCount || !verses) {
      return res.status(400).json({ message: "All required fields must be filled." });
    }

    const newVerse = new Verse({
      languageId,
      testamentId,
      bookId,
      chapterName,
      chapterIndex,
      verseCount,
      verses
    });

    const savedVerse = await newVerse.save();
    res.status(201).json({ message: "Verses added successfully", verses: savedVerse,status:'Success' });
  } catch (error) {
    console.error("Error adding verses:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getVersesByFilters = async (req, res) => {
  try {
    const { languageId, testamentId, bookId, chapterIndex } = req.params;

    if (!languageId || !testamentId || !bookId || !chapterIndex) {
      return res.status(400).json({ message: "All filter fields are required." });
    }
    console.log(languageId, testamentId, bookId, chapterIndex);
    
    const verses = await Verse.findOne({
      languageId,
      testamentId,
      bookId,
      chapterIndex
    });
    console.log(verses,'verses in backend');
    
    if (!verses) {
      return res.status(404).json({ message: "No verses found for the given criteria." });
    }

    res.status(200).json({ message: "Verses retrieved successfully", verses, status: 'Success' });
  } catch (error) {
    console.error("Error fetching verses:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
