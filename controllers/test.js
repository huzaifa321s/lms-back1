// import path, { dirname } from "path";
// import mongoose from "mongoose";
// import { fileURLToPath } from 'url';
// // Models
// import Student from "../models/student.js";
// import State from "../models/state.js";
// import City from "../models/city.js";
// // Utils
// import { products } from "../utils/obj/dummyProducts.js";
import ErrorHandler from "../utils/functions/ErrorHandler.js";
import SuccessHandler from "../utils/functions/SuccessHandler.js";
import { deleteFile, saveFile } from "../utils/functions/HelperFunctions.js";


// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);




// const calculateDiscountedPrice = (price, percent) => {
//     const off = percent / 100;
//     const discountedPrice = price - (price * off);
//     return discountedPrice
// }

const testController = {
    test: async (req, res) => {
        try {
            const profile = req.files.profile;
            const uploadedFileName = saveFile(profile, 'public/test');
            return SuccessHandler(null, 200, res, `working!`);
        } catch (error) {
            console.error("Error:", error);
            return ErrorHandler('Internal server error', 500, res);
        }
    },

    test2: async (req, res) => {
        const {fileName } = req.body;
        try {
            const deletedFile = deleteFile(fileName, 'public/test');
            console.log("delete file ---> ", deletedFile)

            return SuccessHandler(null, 200, res, `working!`);
        } catch (error) {
            console.error("Error:", error);
            return ErrorHandler('Internal server error', 500, res);
        }
    }

    
    //     getProducts: async (_, res) => {
    //         try {

    //             const newProducts = products.map((prod) => {
    //                 if (prod.onSale.percent) {
    //                     const newProd = {
    //                         ...prod,
    //                         discountedPrice: calculateDiscountedPrice(prod.price, prod.onSale.percent)
    //                     }
    //                     return newProd
    //                 } else {
    //                     const newProd = {
    //                         ...prod,
    //                         discountedPrice: null
    //                     }
    //                     return newProd
    //                 }
    //             })

    //             return SuccessHandler(newProducts, 200, res, `Products retrieved successfully!`);
    //         } catch (error) {
    //             console.error("Error:", error);
    //             return ErrorHandler('Internal server error', 500, res);
    //         }
    //     },


    //     postImage: async (req, res) => {
    //         try {

    //             console.log(req.files)


    //             if (req.files) {
    //                 if (req.files.image) {
    //                     let fileName = null;
    //                     const profile = req.files.image;
    //                     fileName = `${Date.now()}-${profile.name}`;

    //                     profile.mv(
    //                         path.join(__dirname, `../public/profiles/admin/${fileName}`),
    //                         (err) => {
    //                             if (err) {
    //                                 return ErrorHandler(err.message, 500, req, res);
    //                             }
    //                         }
    //                     );
    //                 }
    //             }

    //             return SuccessHandler(null, 200, res, `Got image!`);
    //         } catch (error) {
    //             console.error("Error:", error);
    //             return ErrorHandler('Internal server error', 500, res);
    //         }
    //     },

    //     searchUser: async (req, res) => {
    //         const { searchInput, bio } = req.query;

    //         let query = {};
    //         let conditions = [];

    //         if (bio) conditions.push({ bio: bio });

    //         if (!searchInput || searchInput.trim() === "") {
    //             try {
    //                 if (conditions.length !== 0) query = { $and: conditions };
    //                 const defaultUsers = await Student.find(query).limit(10);
    //                 return SuccessHandler(defaultUsers, 200, res, "Default users retrieved!");
    //             } catch (error) {
    //                 console.log(error);
    //                 return ErrorHandler("Some internal error", 500, res);
    //             }
    //         }

    //         const searchTerms = searchInput.split(" ");
    //         searchTerms.forEach(term => {
    //             const condition = {
    //                 $or: [
    //                     { firstName: { $regex: term, $options: "i" } },
    //                     { lastName: { $regex: term, $options: "i" } }
    //                 ]
    //             };
    //             conditions.push(condition);
    //         });

    //         if (conditions.length !== 0) query = { $and: conditions };

    //         try {
    //             const searchResult = await Student.find(query).limit(10);
    //             return SuccessHandler(searchResult, 200, res, "Search performed!");
    //         } catch (error) {
    //             console.log(error);
    //             return ErrorHandler("Some internal error", 500, res);
    //         }
    //     },







    //     // RELATIONAL DATABASE




    //     searchCities: async (req, res) => {
    //         const { searchInput, stateId } = req.query;

    //         let query = {};
    //         if (stateId) query = { state: stateId };
    //         if (!searchInput || searchInput.trim() === "") {
    //             try {
    //                 const defaultCities = await City.find(query).limit(10);
    //                 return SuccessHandler(defaultCities, 200, res, "Default cities retrieved!");
    //             } catch (error) {
    //                 console.log(error);
    //                 return ErrorHandler("Some internal error", 500, res);
    //             }
    //         }
    //         const searchBoxQuery = { name: { $regex: searchInput, $options: "i" } };
    //         query = { $and: [query, searchBoxQuery] }
    //         try {
    //             const searchResult = await City.find(query).limit(10);
    //             return SuccessHandler(searchResult, 200, res, "Search performed!");
    //         } catch (error) {
    //             console.log(error);
    //             return ErrorHandler("Some internal error", 500, res);
    //         }
    //     },


    //     searchStates: async (req, res) => {
    //         const { searchInput } = req.query;

    //         let query = {};
    //         if (!searchInput || searchInput.trim() === "") {
    //             try {
    //                 const defaultStates = await State.find(query).limit(10);
    //                 return SuccessHandler(defaultStates, 200, res, "Default cities retrieved!");
    //             } catch (error) {
    //                 console.log(error);
    //                 return ErrorHandler("Some internal error", 500, res);
    //             }
    //         }
    //         const searchBoxQuery = { name: { $regex: searchInput, $options: "i" } };
    //         query = { ...searchBoxQuery }
    //         try {
    //             const searchResult = await State.find(query).limit(10);
    //             return SuccessHandler(searchResult, 200, res, "Search performed!");
    //         } catch (error) {
    //             console.log(error);
    //             return ErrorHandler("Some internal error", 500, res);
    //         }
    //     },


};

export default testController;


