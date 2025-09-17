import mongoose from 'mongoose';

const trainingWheelGameSchema = new mongoose.Schema({
    question: {
        type: String,
        required: true,
    },
    answer: {
        type: String,
        required: true,
    },
    answer_in_chunks: {
        type: Array,
        validate(value) {
            if (value.length !== 6) {
                throw new Error("Sentence should break in 6 pieces!");
            }
        },
        required: true,
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'GameCategory',
        required: true,
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'user_type',
        required: true,
    },
    user_type: {
        type: String,
        required: true,
        enum: ['Teacher', 'Admin'],
    },
    difficulties: {
        type: Array,
        validate(difficultiesArr) {
            if (difficultiesArr.length <= 0) {
                throw new Error("Should be at least one difficulty");
            }

            for (let difficulty of difficultiesArr) {
                if (!["beginner", "intermediate", "expert"].includes(difficulty)) {
                    throw new Error(`Invalid difficulty: ${difficulty}!`);
                }
            }
        },
        required: true,
    },
});

const TrainingWheelGame = mongoose.model('TrainingWheelGame', trainingWheelGameSchema);


export default TrainingWheelGame;


