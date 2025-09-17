import TrainingWheelGame from "../../models/trainingwheelgame.js";
import ErrorHandler from "../../utils/functions/ErrorHandler.js";
import SuccessHandler from "../../utils/functions/SuccessHandler.js";


const gamesController = {
    // Training Wheel
    getTrainingWheelQuestions: async (req, res) => {
        try {
            const games = await TrainingWheelGame.find().populate({
                path: 'author',
                select: 'firstName lastName'
            });
            return SuccessHandler(games, 200, res, 'Games retrieved!');
        } catch (error) {
            console.error("Error: ", error);    
            return ErrorHandler('Internal server error', 500, res);
        }
    },
}

export default gamesController;