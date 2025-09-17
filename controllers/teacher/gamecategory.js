import GameCategory from "../../models/gamecategory.js";
import SuccessHandler from "../../utils/functions/SuccessHandler.js";
import ErrorHandler from "../../utils/functions/ErrorHandler.js";

const gameCategoryController = {
    getAll: async (_, res) => {
  try {
    const categories = await GameCategory.find().lean();
    return SuccessHandler(categories, 200, res, "Game categories retrieved successfully");
  } catch (error) {
    return ErrorHandler(error.message || "Internal server error", error.statusCode || 500, res);
  }
},


};

export default gameCategoryController;


