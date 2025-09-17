import mongoose from 'mongoose';

const trainingWheelGameScoreSchema = new mongoose.Schema({
    score: {
        type: Number,
        required: true,
    },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true,
    },
    difficultyLevel: {
        type: String,
        required: true,
    }
}, { timestamps: true });

const TrainingWheelGameScore = mongoose.model('TrainingWheelGameScore', trainingWheelGameScoreSchema);
export default TrainingWheelGameScore;