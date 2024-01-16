const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const Article = require('./public/models/article');
const User = require('./public/models/user');
const config = require('./config.json');
const bodyParser = require('body-parser');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const { Storage } = require('@google-cloud/storage');
const multer = require('multer');
const session = require('express-session');

process.env.GOOGLE_APPLICATION_CREDENTIALS = './minutes-maker-410913-8184e634cdc3.json';

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
const bucket = new Storage().bucket('magcom');
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

const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/admin/login');
};

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

async function removeArticle(data) {
    try {
    await mongoose.connect(dbUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    });

    console.log('Removing Article:', data);

    const removedArticle = await Article.findOneAndDelete({ articleID: data.articleID });

    if (removedArticle) {
    console.log('Article removed from the database:', removedArticle);

    const imageFileName = removedArticle.imageUrl.split('/').pop();
    const imageFile = bucket.file(`articles/covers/${imageFileName}`);
    await imageFile.delete();
    } else {
    console.log('Article not found');
    }
} catch (err) {
    console.error(err);
    throw err;
} 
}


async function addArticle(data, imageFile) {
    try {
    await mongoose.connect(dbUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    });

    const highestIndexArticle = await Article.findOne({}, { indexNumber: 1 })
    .sort({ indexNumber: -1 })
    .exec();
    
    const newIndexNumber = highestIndexArticle ? highestIndexArticle.indexNumber + 1 : 1;

    console.log('Adding Article:', data);

    const imageFileName = `blog/covers/${Date.now()}-${imageFile.originalname}`;

    const imageUploadStream = bucket.file(imageFileName).createWriteStream();
    imageUploadStream.end(imageFile.buffer);

    await Promise.all([
    new Promise((resolve, reject) => {
        imageUploadStream.on('finish', resolve);
        imageUploadStream.on('error', reject);
    })
    ]);

    const imageUrl = `https://storage.googleapis.com/${bucket.name}/${imageFileName}`;

    const article = new Article({ ...data, indexNumber: newIndexNumber, imageUrl});

    await article.save();

} catch (err) {
    console.error(err);
    throw err;
}
}

app.get('/blog', async (req, res) => {
    try {
        const articles = await Article.find();
        const reversedArticles = articles.reverse(); 
        res.render('archive', { articles: reversedArticles });
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
        res.render('login', {});
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
        await addArticle(data, imageFile);
        res.json({ success: true, message: 'Article added successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

app.post('/admin/dashboard/removearticle', uploadFilesMiddleware, async (req, res) => {
    const data = req.body;
    try {
        await removeArticle(data);
        res.json({ success: true, message: 'Article removed successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

app.post('/admin/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        req.logIn(user, (loginErr) => {
            if (loginErr) {
                return res.status(500).json({ success: false, message: 'Internal Server Error' });
            }
            return res.status(200).json({ success: true, redirect: '/admin/dashboard' });
        });
    })(req, res, next);
});


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});