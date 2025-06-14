const Language = require('../models/languagemodal');


exports.addLanguage = async(req,res) => {
    const {name, code} = req.body;
    if(!name || !code){
        return res.status(400).json({message: "Name and code are required"})
    }
    try {
        const language = new Language({name,code});
        await language.save();
    res.status(201).json({ message: "Language added successfully",status:'Success', language });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: "Language already exists" });
          }
          res.status(500).json({ message: error.message });
    }
}

exports.getLanguages = async (req, res) => {
    const {page = 1, limit=10} = req.query
    try {
        const skip = (page - 1) * limit;
        const total = await Language.countDocuments();

      const languages = await Language.find().sort({createdAt: - 1}).skip(skip).limit(Number(limit));
      res.status(200).json({status : "Success", data:languages,pagination:{totalItems:total,currentPage:Number(page),totalPages:Math.ceil(total/limit),pageSize:Number(limit)}});
    } catch (error) {
      res.status(500).json({status: 'Error', message: error.message });
    }
  };

exports.updateLanguage = async(req,res) => {
    const {id} = req.params;
    console.log(id,'id in backend');
    
    const {name,code} = req.body;
    if (!name || !code) {
        return res.status(400).json({ message: "Name and code are required" });
    }
    try {
        const updatedLanguage = await Language.findByIdAndUpdate(id,{name,code},
            {new:true,runValidators:true}
        )

        if(!updatedLanguage){
            return res.status(404).json({ message: "Language not found" });
        }
        console.log(updatedLanguage,'updatedLanguage');
        
        res.status(200).json({ message: "Language updated successfully", status: 'Success', language: updatedLanguage });
    } catch (error) {
        console.log(error,'error in backend');
        
        if (error.code === 11000) {
            return res.status(400).json({ message: "Language with this name or code already exists" });
        }
        res.status(500).json({ message: error.message });
    }
}

exports.deleteLanguage = async(req,res) => {
    const {id} = req.params;
    let {page = 1, limit = 10} = req.query;
    try {
        const deletedLanguage = await Language.findByIdAndDelete(id);
        if(!deletedLanguage){
            return res.status(400).json({message:'Language Not Found'})
        }
        // res.status(200).json({status:'Success',message:'Language Deleted SuccessFully',data:deletedLanguage})
        
        const total = await Language.countDocuments();
        const totalPages = Math.ceil(total / limit);
        if (page > totalPages && totalPages > 0) {
            page = totalPages; 
        }
        const skip = (page - 1) * limit;
        const languages = await Language.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));
        res.status(200).json({
            status: 'Success',
            message: 'Language Deleted Successfully',
            deletedLanguage,
            data: languages,
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