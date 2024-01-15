const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const Article = require('./public/models/article');
const config = require('./config.json');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'public', 'views'));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const dbUrl = config.dbURL;
mongoose.connect(dbUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
    console.log('Connected to MongoDB');
});

app.get('/', async (req, res) => {
    try {
        res.render('index');
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/blog', async (req, res) => {
    try {
        res.render('archive');
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});


app.get('/blog/:articleId', async (req, res) => {
    try {
        const article = await Article.findOne({ articleID: req.params.articleId });
    if (!article) {
        return res.status(404).send('Article not found');
        }
    
        res.render('articleViewer', { article });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});