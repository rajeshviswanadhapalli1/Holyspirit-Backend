const Language = require('../models/languagemodal');
const Testaments = require('../models/testamentmodal');

exports.addTestment = async(req,res) => {
    const {name,languageId} = req.body;

    if(!name || !languageId){
        return res.status(400).json({message: "Name and LanguageId are required"})
    }
    try {
        const language = await Language.findById(languageId);
        if(!language){
            return res.status(400).json({message: "Language Not Found"})
        }
        const newTestment = new Testaments({
            name,
            languageId
        })
        const savedTestament = await newTestment.save();
        res.status(200).json({
            status: 'Success',
            message: 'Testament added successfully',
            testament: savedTestament,
          });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: "Testament already exists" });
          }
          res.status(500).json({ message: error.message });
    }
}

exports.getAllTestaments = async(req,res) => {
    const {page = 1, limit=10} = req.query
    try {
        const skip = (page - 1) * limit;
        const total = await Testaments.countDocuments();
        const testaments = await Testaments.find().populate({
            path: "languageId",
            select: "name code"
        }).sort({createdAt : - 1}).skip(skip).limit(Number(limit));

        if (!testaments || testaments.length === 0) {
            return res.status(404).json({ message: "No testaments found" });
        }
        res.status(200).json({status : "Success", data:testaments,pagination:{totalItems:total,currentPage:Number(page),totalPages:Math.ceil(total/limit),pageSize:Number(limit)}});
        // res.status(200).json(testaments);
    } catch (error) {
        console.error("Error fetching testaments:", error);
        res.status(500).json({ message: "Server error", error });
    }
}
exports.getTestamentsByLanguage = async (req, res) => {
    const { languageId } = req.params;

    if (!languageId) {
        return res.status(400).json({ message: "Language ID is required" });
    }

    try {
        const language = await Language.findById(languageId);
        if (!language) {
            return res.status(404).json({ message: "Language not found" });
        }

        const testaments = await Testaments.find({ languageId }).populate({
            path: "languageId",
            select: "name code"
        }).sort({ createdAt: -1 });

        if (testaments.length === 0) {
            return res.status(404).json({ message: "No testaments found for this language" });
        }

        res.status(200).json({
            status: "Success",
            data: testaments
        });
    } catch (error) {
        console.error("Error fetching testaments by language:", error);
        res.status(500).json({ message: "Server error", error });
    }
};
exports.deleteTestament = async(req,res) => {
    const {id} = req.params;
    let {page = 1, limit = 10} = req.query;
    try {
        const deletedLanguage = await Testaments.findByIdAndDelete(id);
        if(!deletedLanguage){
            return res.status(400).json({message:'Testament Not Found'})
        }
        
        const total = await Testaments.countDocuments();
        const totalPages = Math.ceil(total / limit);
        if (page > totalPages && totalPages > 0) {
            page = totalPages; 
        }
        const skip = (page - 1) * limit;
        const testaments = await Testaments.find().populate({
            path: "languageId",
            select: "name code"
        })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));
        res.status(200).json({
            status: 'Success',
            message: 'Testament Deleted Successfully',
            deletedLanguage,
            data: testaments,
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
exports.updateTestament = async(req,res) => {
    const {id} = req.params;
    console.log(id,'id in backend');
    
    const {name,languageId} = req.body;
    const language = await Language.findById(languageId);
    if (!name || !languageId) {
        return res.status(400).json({ message: "Name and Language are required" });
    }
    if(!language){
        return res.status(400).json({message: "Language Not Found"})
    }
    try {
        const updatedLanguage = await Testaments.findByIdAndUpdate(id,{name,languageId},
            {new:true,runValidators:true}
        ).populate({
            path: "languageId",
            select: "name code"
        })

        if(!updatedLanguage){
            return res.status(404).json({ message: "Testament not found" });
        }
        console.log(updatedLanguage,'updatedLanguage');
        
        res.status(200).json({ message: "Testament updated successfully", status: 'Success', testament: updatedLanguage });
    } catch (error) {
        console.log(error,'error in backend');
        
        if (error.code === 11000) {
            return res.status(400).json({ message: "Testament with this name or code already exists" });
        }
        res.status(500).json({ message: error.message });
    }
}