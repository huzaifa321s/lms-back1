// import mongoose from "mongoose";
import City from "../../models/city.js";
import SuccessHandler from "../../utils/functions/SuccessHandler.js";
import ErrorHandler from "../../utils/functions/ErrorHandler.js";

const cityController = {


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


