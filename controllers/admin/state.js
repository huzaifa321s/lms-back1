import State from "../../models/state.js";
import SuccessHandler from "../../utils/functions/SuccessHandler.js";
import ErrorHandler from "../../utils/functions/ErrorHandler.js";

const stateController = {
    // add: async (req, res) => {
    //     const { name, abbreviation } = req.body;
    //     try {
    //         const state = new State({ name, abbreviation, cities: [] });
    //         await state.save();
    //         return SuccessHandler(null, 200, res, `State added!`);
    //     } catch (error) {
    //         console.error("Error:", error);
    //         return ErrorHandler('Internal server error', 500, res);
    //     }
    // },
};

export default stateController;


