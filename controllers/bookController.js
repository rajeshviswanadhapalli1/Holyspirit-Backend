const Language = require('../models/languagemodal');
const Testaments = require('../models/testamentmodal');
const Books = require('../models/bookmodal')
exports.addBook = async(req,res) => {
    const {name,languageId,testamentId,chapterCount} = req.body;

    if(!name || !languageId || !testamentId || !chapterCount){
        return res.status(400).json({message: "Name and LanguageId and TestamentId and ChapterCount are required"})
    }
    try {
        const language = await Language.findById(languageId);
        if(!language){
            return res.status(400).json({message: "Language Not Found"})
        }
        const testament = await Testaments.findById(testamentId);
        if(!testament){
            return res.status(400).json({message: "Testament Not Found"})
        }
        const newBook = new Books({
            name,
            languageId,
            testamentId
        })
        const savedTestament = await newBook.save();
        res.status(200).json({
            status: 'Success',
            message: 'Book added successfully',
            book: savedTestament,
          });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: "Book already exists" });
          }
          res.status(500).json({ message: error.message });
    }
}

exports.getAllBooks = async(req,res) => {
    const {page = 1, limit=10,language, testament} = req.query
    try {
        const skip = (page - 1) * limit;
       
        let filter = {};
        if (language) filter.languageId = language;
        if (testament) filter.testamentId = testament;
        const total = await Books.countDocuments(filter);
        const books = await Books.find(filter).populate({
            path: "languageId",
            select: "name code"
        }).populate({
            path: "testamentId",
            select: "name"
        }).sort({createdAt : - 1}).skip(skip).limit(Number(limit));

        if (!books || books.length === 0) {
            return res.status(404).json({ message: "No books found" });
        }
        res.status(200).json({status : "Success", data:books,pagination:{totalItems:total,currentPage:Number(page),totalPages:Math.ceil(total/limit),pageSize:Number(limit)}});
        // res.status(200).json(testaments);
    } catch (error) {
        console.error("Error fetching books:", error);
        res.status(500).json({ message: "Server error", error });
    }
}

exports.getBooksByLanguageAndTestament = async (req, res) => {
  const { languageId, testamentId } = req.params;
  let { page = 1, limit = 10 } = req.query;

  if (!languageId || !testamentId) {
    return res.status(400).json({ message: "Language ID and Testament ID are required" });
  }

  page = parseInt(page);
  limit = parseInt(limit);
  const skip = (page - 1) * limit;

  try {
    const filter = { languageId, testamentId };

    const total = await Books.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    const books = await Books.find(filter)
      .sort({ createdAt: 1 }) // ✅ Sort books by createdAt descending
      .skip(skip)
      .limit(limit)
      .populate({ path: "languageId", select: "name code" })
      .populate({ path: "testamentId", select: "name" });

    if (books.length === 0) {
      return res.status(404).json({ message: "No books found for this language and testament" });
    }

    res.status(200).json({
      status: "Success",
      data: books,
      pagination: {
        totalItems: total,
        currentPage: page,
        totalPages,
        pageSize: limit
      }
    });
  } catch (error) {
    console.error("Error fetching books by language and testament:", error);
    res.status(500).json({ message: "Server error", error });
  }
};
exports.getAllBooksWithoutPagination = async(req,res) => {
    // const {page = 1, limit=10,language, testament} = req.query
    try {
        // const skip = (page - 1) * limit;
       
        // let filter = {};
        // if (language) filter.languageId = language;
        // if (testament) filter.testamentId = testament;
        // const total = await Books.countDocuments(filter);
        const books = await Books.find().populate({
            path: "languageId",
            select: "name code"
        }).populate({
            path: "testamentId",
            select: "name"
        }).sort({createdAt : - 1});

        if (!books || books.length === 0) {
            return res.status(404).json({ message: "No books found" });
        }
        res.status(200).json({status : "Success", data:books});
        // res.status(200).json(testaments);
    } catch (error) {
        console.error("Error fetching books:", error);
        res.status(500).json({ message: "Server error", error });
    }
}
exports.deleteBook = async(req,res) => {
    const {id} = req.params;
    let {page = 1, limit = 10} = req.query;
    try {
        const deletedLanguage = await Books.findByIdAndDelete(id);
        if(!deletedLanguage){
            return res.status(400).json({message:'Book Not Found'})
        }
        
        const total = await Books.countDocuments();
        const totalPages = Math.ceil(total / limit);
        if (page > totalPages && totalPages > 0) {
            page = totalPages; 
        }
        const skip = (page - 1) * limit;
        const books = await Books.find().populate({
            path: "languageId",
            select: "name code"
        }).populate({
            path: "testamentId",
            select: "name"
        })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));
        res.status(200).json({
            status: 'Success',
            message: 'Book Deleted Successfully',
            deletedLanguage,
            data: books,
            pagination: {
                totalItems: total,
                currentPage: Number(page),
                totalPages: Math.ceil(total / limit),
                pageSize: Number(limit),
            },
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}
exports.updateBook = async(req,res) => {
    const {id} = req.params;
    console.log(id,'id in backend');
    
    const {name,languageId,testamentId,chapterCount} = req.body;
    const language = await Language.findById(languageId);
    const testament = await Testaments.findById(testamentId)
    if (!name || !languageId || !testamentId || !chapterCount) {
        return res.status(400).json({ message: "Name and Language and Testament and Chapter Count are required" });
    }
    if(!language){
        return res.status(400).json({message: "Language Not Found"})
    }
    if(!testament){
        return res.status(400).json({message: "Testament Not Found"})
    }
    try {
        const updatedLanguage = await Books.findByIdAndUpdate(id,{name,languageId,testamentId,chapterCount},
            {new:true,runValidators:true}
        ).populate({
            path: "languageId",
            select: "name code"
        }).populate({
            path: "testamentId",
            select: "name"
        })

        if(!updatedLanguage){
            return res.status(404).json({ message: "Book not found" });
        }
        console.log(updatedLanguage,'updatedLanguage');
        
        res.status(200).json({ message: "Book updated successfully", status: 'Success', book: updatedLanguage });
    } catch (error) {
        console.log(error,'error in backend');
        
        if (error.code === 11000) {
            return res.status(400).json({ message: "Book with this name or code already exists" });
        }
        res.status(500).json({ message: error.message });
    }
}

exports.toggleBook = async(req,res) => {
    const {bookId,status} = req.body;
    try {
        const book = await Books.findById(bookId);
        if (!book) return res.status(404).json({ message: "Book not found" });
    
        book.active = status;
        await book.save();
        res.json({ message: "Book status updated",status: 'Success', book });
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
}