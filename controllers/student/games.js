import TrainingWheelGameScore from "../../models/trainingwheelgamescore.js";
import TrainingWheelGame from "../../models/trainingwheelgame.js";

// Common response handler
const respond = (res, data, message, status = 200) => ({
  status,
  json: { success: status < 400, data, message },
});

// Validation utility
const validateInput = ({ score, difficultyLevel }) => {
  if (score == null || !difficultyLevel) throw new Error("Score & difficulty is required");
};

const gamesController = {
  get: async (req, res) => {
    const { level = "beginner" } = req.query;
    try {
      const questions = await TrainingWheelGame.aggregate([
        { $match: { difficulties: level } },
        { $sample: { size: 10 } },
      ]);
      return res.status(200).json(respond(res, questions.length ? questions : [], questions.length ? "Questions retrieved!" : "No question!").json);
    } catch (error) {
      console.error("Error:", error.message);
      return res.status(500).json(respond(res, null, "Internal server error", 500).json);
    }
  },

  submit: async (req, res) => {
    const { score, difficultyLevel } = req.body;
    try {
      validateInput({ score, difficultyLevel });
      const scoreCreated = await TrainingWheelGameScore.create({
        score,
        student: req.user._id,
        difficultyLevel,
      });
      return res.status(200).json(respond(res, scoreCreated, "Score submitted!").json);
    } catch (error) {
      console.error("Error:", error.message);
      const status = error.message.includes("required") ? 400 : 500;
      return res.status(status).json(respond(res, null, error.message, status).json);
    }
  },
};

export default gamesController;