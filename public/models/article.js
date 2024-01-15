const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
    articleID: { type: String, required: true },
    title: { type: String, required: true },
    indexNumber: { type: Number, required: true },
    imageUrl: { type: String, required: true },
    content: { type: String, required: true },
});

const Article = mongoose.model('Article', articleSchema);

module.exports = Article;