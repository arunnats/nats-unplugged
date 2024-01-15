const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const Article = require('./public/models/article');
const User = require('./public/models/user');
const config = require('./config.json');
const bodyParser = require('body-parser');
const LocalStrategy = require('passport-local').Strategy;
const { Storage } = require('@google-cloud/storage');
const multer = require('multer');
const session = require('express-session');

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

app.use(session({
    secret: config.secretKey,
    resave: false,
    saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
    cb(null, true);
    } else {
    cb(new Error('Invalid file type. Only images and PDFs are allowed.'));
    }
},
});

const uploadFilesMiddleware = upload.fields([
{ name: 'image', maxCount: 1 },
]);

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

app.get('/admin/login', async (req, res) => {
    try {
        res.render('admin', {});
    } catch (error) {
        res.status(500).send('Internal Server Error');
    }
});

app.get('/admin/dashboard', isAuthenticated, async (req, res) => {
try {
    res.render('adminDashboard', {});
} catch (error) {
    res.status(500).send('Internal Server Error');
}
});

app.post('/admin/dashboard/addarticle', uploadFilesMiddleware,  async (req, res) => {
    const data = req.body; 
    const imageFile = req.files['image'][0];
    try {
        await DatabaseFunctions.addArticle(data, imageFile);
        res.json({ success: true, message: 'Article added successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});