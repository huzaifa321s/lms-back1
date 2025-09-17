import TrainingWheelGame from "../../models/trainingwheelgame.js";
import ErrorHandler from "../../utils/functions/ErrorHandler.js";
import SuccessHandler from "../../utils/functions/SuccessHandler.js";


const gamesController = {
    // Training Wheel Game
    createTrainingWheelGame: async (req, res) => {
  try {
    const { user, body: { question, answer, answer_in_chunks, category, levels } } = req;

    // Inline input validation
    if (!user || !question || !answer || !answer_in_chunks || !category || !levels) {
      return ErrorHandler("Unauthorized or missing required fields", 401, res);
    }

    await TrainingWheelGame.create({
      question,
      answer,
      answer_in_chunks,
      category,
      difficulties: levels,
      author: user._id,
      user_type: "Teacher",
    });

    return SuccessHandler(null, 200, res, "Game created successfully");
  } catch (error) {
    return ErrorHandler(error.message || "Internal server error", error.statusCode || 500, res);
  }
},
getTrainingWheelQuestions:async (req, res) => {
  try {
    const { user, query: { page = 1, q } } = req;

    // Inline input validation
    if (!user) {
      return ErrorHandler("Unauthorized or missing user", 401, res);
    }

    const limit = 10;
    const skip = (page - 1) * limit;
    const query = {
      author: user._id,
      user_type: "Teacher",
      ...(q && { question: { $regex: q, $options: "i" } }),
    };

    // Fetch total count and games concurrently
    const [totalGames, games] = await Promise.all([
      TrainingWheelGame.countDocuments(query),
      TrainingWheelGame.find(query)
        .skip(skip)
        .limit(limit)
        .select("question category difficulties")
        .populate("category", "name")
        .lean(),
    ]);

    return SuccessHandler(
      { games, totalPages: Math.ceil(totalGames / limit) },
      200,
      res,
      "Games retrieved successfully"
    );
  } catch (error) {
    return ErrorHandler(error.message || "Internal server error", error.statusCode || 500, res);
  }
},




    deleteTWQuestion:async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req;

    // Inline input validation
    if (!user || !id) {
      return ErrorHandler("Unauthorized or missing question ID", 401, res);
    }

    const deleted = await TrainingWheelGame.findOneAndDelete({ _id: id, author: user._id });
    if (!deleted) {
      return ErrorHandler("Question not found or not authorized", 404, res);
    }

    return SuccessHandler(null, 200, res, "Question deleted successfully");
  } catch (error) {
    return ErrorHandler(error.message || "Internal server error", error.statusCode || 500, res);
  }
},


   getTWGame:async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req;

    // Inline input validation
    if (!user || !id) {
      return ErrorHandler("Unauthorized or missing game ID", 401, res);
    }

    const game = await TrainingWheelGame.findOne({ _id: id, author: user._id }).lean();
    if (!game) {
      return ErrorHandler("Game not found or not authorized", 404, res);
    }

    return SuccessHandler(game, 200, res, "Game retrieved successfully");
  } catch (error) {
    return ErrorHandler(error.message || "Internal server error", error.statusCode || 500, res);
  }
},


  updateTrainingWheelGame: async (req, res) => {
  try {
    const { id } = req.params;
    const { user, body: { question, answer, answer_in_chunks, category, levels } } = req;

    // Inline input validation
    if (!user || !id) {
      return ErrorHandler("Unauthorized or missing game ID", 401, res);
    }

    // Prepare update object only with provided fields
    const updateData = {
      ...(question && { question }),
      ...(answer && { answer }),
      ...(answer_in_chunks && { answer_in_chunks }),
      ...(category && { category }),
      ...(levels && { difficulties: levels }),
    };

    // Only proceed if there's something to update
    if (Object.keys(updateData).length === 0) {
      return ErrorHandler("No valid fields provided for update", 400, res);
    }

    const updated = await TrainingWheelGame.findOneAndUpdate(
      { _id: id, author: user._id },
      updateData,
      { new: true, runValidators: true }
    ).lean();

    if (!updated) {
      return ErrorHandler("Game not found or not authorized", 404, res);
    }

    return SuccessHandler(updated, 200, res, "Game updated successfully");
  } catch (error) {
    return ErrorHandler(error.message || "Internal server error", error.statusCode || 500, res);
  }
}
,


}

export default gamesController;