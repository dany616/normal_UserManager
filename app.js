const http = require('node:http');

const hostname = '0.0.0.0';


const express = require('express');
const dotenv = require('dotenv');

const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const session = require('express-session');

const path = require('path');

const multer = require('multer');

const fs = require('fs');

dotenv.config();

const PUBLIC = path.join(__dirname, 'public');

const users = {};

const app = express();

app.set('port', process.env.PORT || 8080);

// data 폴더 생성 확인
try {
    fs.readdirSync('data');
} catch (error) {
    fs.mkdirSync('data');
}

// multer 설정
const upload = multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, 'data/');
        },
        filename: function (req, file, cb) {
            const ext = path.extname(file.originalname);
            cb(null, Date.now() + ext);
        }
    }),
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('이미지 파일만 업로드 가능합니다.'));
        }
    }
});

// 정적 파일 제공 설정 추가
app.use('/data', express.static('data'));

app.use(
    morgan('dev'),
    express.static(PUBLIC),
    express.json(),
    express.urlencoded({ extended: false }),
    cookieParser(process.env.SECRET),
    session({
        resave: false,
        saveUninitialized: false,
        secret: process.env.SECRET,
        cookie: {
            httpOnly: true,
            secure: false
        },
        name: 'session-cookie'
    }));

app.use(express.static('public'));

app.get('/', (_, res) => res.sendFile(path.join(PUBLIC, 'index.html')));
app.get('/users', (_, res) => res.send(JSON.stringify(users)))  //json문자열로 반환
app.get('/create', (_, res) => res.sendFile(path.join(PUBLIC, 'create.html')));
app.get('/read', (_, res) => res.sendFile(path.join(PUBLIC, 'read.html')));
app.get('/update', (_, res) => res.sendFile(path.join(PUBLIC, 'update.html')));
app.get('/delete', (_, res) => res.sendFile(path.join(PUBLIC, 'delete.html')));

// 사용자 정보 추가, POST
app.post('/users', upload.single('image'), (req, res) => {
    try {
        console.log('Body:', req.body);
        console.log('File:', req.file);
        
        const { id, name, birth, gender } = req.body;
        
        if (!id || !name) {
            return res.status(400).send('ID와 이름은 필수입니다.');
        }
        
        if (users[id]) {
            return res.status(400).send('이미 존재하는 사용자입니다.');
        }
        
        users[id] = {
            name,
            birth,
            gender,
            image: req.file ? `/data/${req.file.filename}` : null
        };
        
        res.redirect('/');  // 성공 시 메인 페이지로 리다이렉트
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('서버 오류가 발생했습니다.');
    }
});
// 사용자 정보 조회, GET
app.get('/users/:id', (req, res) => {
    const { id } = req.params;
    if (users[id]) {
        res.send(users[id]);
    } else {
        res.status(404).send('해당 사용자를 찾을 수 없습니다.');
    }
});

// 사용자 정보 수정, POST
app.post('/users/:id', upload.single('image'), (req, res) => {
    const { id } = req.params;
    const { name, birth, gender } = req.body;
    
    if (!users[id]) {
        return res.status(404).send('해당 사용자를 찾을 수 없습니다.');
    }
    
    // 기존 이미지 정보 보존
    const existingImage = users[id].image;
    
    users[id] = {
        name,
        birth,
        gender,
        image: req.file ? `/data/${req.file.filename}` : existingImage
    };
    
    res.send('수정되었습니다.');
});

// 사용자 정보 삭제, GET
app.get('/users/:id/delete', (req, res) => {
    const { id } = req.params;
    console.log('Deleting user:', id);  // 디버깅용 로그
    console.log('Current users:', users);  // 현재 사용자 목록 확인
    
    if (users[id]) {
        delete users[id];
        res.send('삭제되었습니다.');
    } else {
        res.status(404).send('해당 사용자를 찾을 수 없습니다.');
    }
});

app.listen(app.get('port'), () => console.log(`${app.get('port')} 번 포트에서 대기 중`));
