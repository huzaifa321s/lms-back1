import mongoose from 'mongoose';

const blogCategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
},
{
    timestamps:true
}
);

const BlogCategory = mongoose.model('BlogCategory', blogCategorySchema);
export default BlogCategory;