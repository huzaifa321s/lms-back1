import GameCategory from "../../models/gamecategory.js";
import SuccessHandler from "../../utils/functions/SuccessHandler.js";
import ErrorHandler from "../../utils/functions/ErrorHandler.js";

const gameCategoryController = {
    getAll: async (_, res) => {
        try {
            const allGameCategories = await GameCategory.find();
            return SuccessHandler(allGameCategories, 200, res, `Game categories retrieved!`);
        } catch (error) {
            console.error("Error:", error);
            return ErrorHandler('Internal server error', 500, res);
        }
    },


};

export default gameCategoryController;


