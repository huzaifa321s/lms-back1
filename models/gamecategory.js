import mongoose from 'mongoose';

const gameCategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
},{
    timestamps:true
});

const GameCategory = mongoose.model('GameCategory', gameCategorySchema);
export default GameCategory;