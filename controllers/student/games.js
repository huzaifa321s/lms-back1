import TrainingWheelGameScore from "../../models/trainingwheelgamescore.js";
import TrainingWheelGame from "../../models/trainingwheelgame.js";
import ErrorHandler from "../../utils/functions/ErrorHandler.js";
import { shuffleArray } from "../../utils/functions/HelperFunctions.js";
import SuccessHandler from "../../utils/functions/SuccessHandler.js";
import { questions } from "../../utils/obj/dummyQuestions.js";


const gamesController = {

    get: async (req, res) => {

        const { level } = req.query;

        try {
            const count = await TrainingWheelGame.countDocuments();

            const questions = await TrainingWheelGame.aggregate([
                {
                    $match: {
                        difficulties: level || 'beginner'
                    }
                },
                {
                    $sample: {
                        size: Math.min(count, 10)
                    }
                }
            ]);

            if (questions.length === 0) return SuccessHandler([], 200, res, 'No question!');

            return SuccessHandler(questions, 200, res, 'Questions retrieved!');
        } catch (error) {
            console.error("Error: ", error);
            return ErrorHandler('Internal server error', 500, res);
        }
    },


    submit: async (req, res) => {

        const { score, difficultyLevel } = req.body;
        try {

            if (score === undefined || score === null || !difficultyLevel) {
                return ErrorHandler('Score & difficulty is required', 400, res);
            }

            const gamePlayed = new TrainingWheelGameScore({
                score,
                student: req.user._id,
                difficultyLevel
            });

            const scoreCreated = await TrainingWheelGameScore.create(gamePlayed);

            return SuccessHandler(scoreCreated, 200, res, `Score submitted!`);
        } catch (error) {
            console.error("Error: ", error);
            return ErrorHandler('Internal server error', 500, res);
        }
    }
}

export default gamesController;