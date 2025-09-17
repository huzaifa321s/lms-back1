// import mongoose from "mongoose";
import City from "../../models/city.js";
import State from "../../models/state.js";
import SuccessHandler from "../../utils/functions/SuccessHandler.js";
import ErrorHandler from "../../utils/functions/ErrorHandler.js";

const cityController = {
    // add: async (req, res) => {
    //     const { name, population, stateId } = req.body;
    //     try {

    //         if (!name || !population || !stateId) {
    //             return ErrorHandler('Please provide the required field!', 500, res);
    //         }

    //         const state = await State.findById(stateId);
    //         if (!state) return ErrorHandler('State not found!', 500, res);

    //         const city = new City({ name, state: new mongoose.Types.ObjectId(stateId), population: Number(population)});
    //         await city.save();
            
    //         state.cities.push(city._id);
    //         await state.save();

    //         return SuccessHandler(null, 200, res, `City Added!`);
    //     } catch (error) {
    //         console.error("Error:", error);
    //         return ErrorHandler('Internal server error', 500, res);
    //     }
    // },


    searchCities: async (req, res) => {
        const { searchInput, stateId } = req.query;

        let query = {};
        if (stateId) query = { state: stateId };
        if (!searchInput || searchInput.trim() === "") {
            try {
                const defaultCities = await City.find(query).limit(10);
                return SuccessHandler(defaultCities, 200, res, "Default cities retrieved!");
            } catch (error) {
                console.log(error);
                return ErrorHandler("Some internal error", 500, res);
            }
        }
        const searchBoxQuery = { name: { $regex: searchInput, $options: "i" } };
        query = { $and: [query, searchBoxQuery] }
        try {
            const searchResult = await City.find(query).limit(10);
            return SuccessHandler(searchResult, 200, res, "Search performed!");
        } catch (error) {
            console.log(error);
            return ErrorHandler("Some internal error", 500, res);
        }
    },
};

export default cityController;


