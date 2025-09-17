import TrainingWheelGame from "../../models/trainingwheelgame.js";
import ErrorHandler from "../../utils/functions/ErrorHandler.js";
import SuccessHandler from "../../utils/functions/SuccessHandler.js";


const gamesController = {
    // Training Wheel Game
    createTrainingWheelGame: async (req, res) => {
        const { question, answer, answer_in_chunks, category, levels } = req.body;
        try {

            const gameObj = {
                question,
                answer,
                answer_in_chunks,
                category,
                difficulties: levels,
                author: req.user._id,
                user_type: 'Admin'
            }

            const game = new TrainingWheelGame(gameObj);
            await game.save();
            return SuccessHandler(null, 200, res, `Game added!`);
        } catch (error) {
            console.error("Error: ", error);
            return ErrorHandler('Internal server error', 500, res);
        }
    },

    getTrainingWheelQuestions: async (req, res) => {
        const { page, q } = req.query;

        const pageNumber = parseInt(page) || 1;
        const itemsPerPage = 10; // Set a default page size of 10
        const skip = (pageNumber - 1) * itemsPerPage;

        try {

            let query = {}
            if (q) {
                query = {
                    question: { $regex: q, $options: "i" }
                }
            }

            const totalGames = await TrainingWheelGame.countDocuments(query);
            const totalPages = Math.ceil(totalGames / itemsPerPage);

            const games = await TrainingWheelGame.find(query)
                .skip(skip)
                .limit(itemsPerPage)
                .populate({
                    path: "category",
                    select: "name"
                })
                .populate({
                    path: "author",
                    select: "firstName lastName"
                })
                .exec();

            return SuccessHandler({ games, totalPages }, 200, res, `Games retrieved!`);
        } catch (error) {
            console.error("Error:", error);
            return ErrorHandler('Internal server error', 500, res);
        }
    },



    deleteTWQuestion: async (req, res) => {
        const id = req.params.id;
        try {
            const question = await TrainingWheelGame.findById(id);
            if (!question) return ErrorHandler('Question does not exist', 400, res);

            await TrainingWheelGame.findByIdAndDelete(id);
            return SuccessHandler(null, 200, res, `Question deleted!`);
        } catch (error) {
            console.error("Error:", error);
            return ErrorHandler('Internal server error', 500, res);
        }
    },


    getTWGame: async (req, res) => {
        const id = req.params.id;
        try {
            if (!id) return ErrorHandler('Id is required!', 400, res);

            const game = await TrainingWheelGame.findById(id);
            if (!game) return ErrorHandler('Question does not exist', 400, res);

            return SuccessHandler(game, 200, res, `Game with id: ${id}, retrieved!`);
        } catch (error) {
            console.error("Error:", error);
            return ErrorHandler('Internal server error', 500, res);
        }
    },

    updateTrainingWheelGame: async (req, res) => {
        const id = req.params.id;
        const { question, answer, answer_in_chunks, category, levels } = req.body;

        try {

            if (!id) return ErrorHandler('Id is required', 400, res);

            const game = await TrainingWheelGame.findById(id);
            if (!game) return ErrorHandler('Game does not exist', 400, res);

            if (question) game.question = question;
            if (answer) game.answer = answer;
            if (answer_in_chunks) game.answer_in_chunks = answer_in_chunks;
            if (category) game.category = category;
            if (levels) game.difficulties = levels;

            await game.save();

            return SuccessHandler(null, 200, res, `Game updated!`);
        } catch (error) {
            console.error("Error: ", error);
            return ErrorHandler('Internal server error', 500, res);
        }
    },

}

export default gamesController;