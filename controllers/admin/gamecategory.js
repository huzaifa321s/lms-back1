import mongoose from "mongoose";
import GameCategory from "../../models/gamecategory.js";
import TrainingWheelGame from "../../models/trainingwheelgame.js";
import SuccessHandler from "../../utils/functions/SuccessHandler.js";
import ErrorHandler from "../../utils/functions/ErrorHandler.js";

const gameCategoryController = {

  add: async (req, res) => {
    try {
      const { name } = req.body;

      // 🔹 Validate name
      if (!name || typeof name !== "string" || !name.trim()) {
        return ErrorHandler("Valid category name required", 400, res);
      }

      const cleanName = name.trim();

      //  Check duplicate
      const existing = await GameCategory.findOne({ name: cleanName });
      if (existing) {
        return ErrorHandler("Category already exists", 400, res);
      }

      //  Create new category
      const category = await GameCategory.create({ name: cleanName });

      return SuccessHandler(category, 201, res, "Game category created successfully!");
    } catch (error) {
      console.error("Error creating GameCategory:", error);
      return ErrorHandler("Failed to create category", 500, res);
    }
  },

  edit: async (req, res) => {
    const id = req.params.id;
    const { name } = req.body;
    try {
      if (!id) return ErrorHandler('Id is required', 400, res);

      // Find category
      const gameCategory = await GameCategory.findById(id);
      if (!gameCategory) return ErrorHandler("Category not found", 404, res);

      // Update name if provided and valid
      if (name && typeof name === "string" && name.trim()) {
        const cleanName = name.trim();
        if (await GameCategory.exists({ name: cleanName, _id: { $ne: id } })) {
          return ErrorHandler("Category name already exists", 400, res);
        }
        gameCategory.name = cleanName;
      }

      await gameCategory.save();
      return SuccessHandler(gameCategory, 200, res, `Game category updated!`);
    } catch (error) {
      console.error("Error:", error);
      return ErrorHandler('Internal server error', 500, res);
    }
  },

  getAll: async (req, res) => {
    try {
      const allGameCategories = await GameCategory.find().lean();
      return SuccessHandler(allGameCategories, 200, res, `Game categories retrieved!`);
    } catch (error) {
      console.error("Error:", error);
      return ErrorHandler('Internal server error', 500, res);
    }
  },


  get: async (req, res) => {
    const { page, q } = req.query;

    const pageNumber = parseInt(page) || 1;
    const itemsPerPage = 6; // Set a default page size of 10
    const skip = (pageNumber - 1) * itemsPerPage;

    try {

      let query = {}
      if (q) {
        query = { name: { $regex: q, $options: "i" } }
      }

      const totalGameCategories = await GameCategory.countDocuments(query);
      const totalPages = Math.ceil(totalGameCategories / itemsPerPage);

      const gameCategories = await GameCategory.aggregate([
        ...(q
          ? [{ $match: { name: { $regex: q.trim(), $options: "i" } } }]
          : []),
        {
          $lookup: {
            from: "trainingwheelgames",
            localField: "_id",
            foreignField: "category",
            as: "games",
          },
        },
        {
          $addFields: {
            totalGames: { $size: "$games" },
            active: { $cond: [{ $gt: [{ $size: "$games" }, 0] }, true, false] },
          },
        },
        {
          $project: {
            name: 1,
            createdAt: 1,
            updatedAt: 1,
            totalGames: 1,
            active: 1,
          },
        },
        { $skip: skip },
        { $limit: itemsPerPage },
      ]);

      return SuccessHandler(
        { gameCategories, totalPages, pageNumber, totalGameCategories },
        200,
        res,
        "Game categories retrieved!"
      );

    } catch (error) {
      console.error("Error:", error);
      return ErrorHandler('Internal server error', 500, res);
    }
  },
  getCategory: async (req, res) => {
    const id = req.params.id;
    try {
      if (!id) return ErrorHandler('ID is required.', 400, res);

      // Match the category by ID and lookup games by category field
      const [result] = await GameCategory.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(id) } },
        {
          $lookup: {
            from: "trainingwheelgames",
            localField: "_id",
            foreignField: "category", 
            as: "games",
          },
        },
        {
          $addFields: {
            total: { $size: "$games" },
            active: { $cond: [{ $gt: [{ $size: "$games" }, 0] }, true, false] }, // Always boolean
          },
        },
        {
          $project: {
            name: 1,
            description: 1,
            createdAt: 1,
            updatedAt: 1,
            total: 1,
            active: 1,
          },
        },
      ]);

      if (!result) return ErrorHandler("Category not found", 404, res);

      return SuccessHandler(result, 200, res, "Category fetched");
    } catch (error) {
      return ErrorHandler('Internal server error', 500, res);
    }
  },
  delete: async (req, res) => {
    const id = req.params.id; // This is presumably the category ID.
    const { deleteConfirmed } = req.body;

    try {
      const [gameCategory, gameInCategory] = await Promise.all([
        GameCategory.findById(id),
        TrainingWheelGame.find({ category: id }).lean(),
      ]);

      if (!gameCategory) return ErrorHandler("Category does not exist", 400, res);

      if (gameInCategory.length > 0) {
        if (deleteConfirmed !== "Yes") {
          return ErrorHandler("This category contains some games", 200, res);
        }

        await Promise.all([
          TrainingWheelGame.deleteMany({ category: id }),
          GameCategory.findByIdAndDelete(id),
        ]);

        return SuccessHandler(null, 200, res, "The category and all games with this category have been deleted.");
      }

      await GameCategory.findByIdAndDelete(id);
      return SuccessHandler(null, 200, res, "Category deleted successfully.");
    } catch (error) {
      return ErrorHandler("Internal server error", 500, res);
    }
  }


};

export default gameCategoryController;