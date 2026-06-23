const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname));

let db;
async function connectDB() {
    try {
        db = await mysql.createConnection({
            host: '127.0.0.1',
            user: 'root',
            password: '',
            database: 'neobank_db'
        });
        console.log('✅ تم الاتصال بقاعدة بيانات NeoBank بنجاح بقوة الحماية الكاملة!');
    } catch (err) {
        console.error('❌ فشل الاتصال بقاعدة البيانات! تأكد من تشغيل XAMPP:', err);
    }
}
connectDB();

// 1. توجيه الرابط الرئيسي لصفحة تسجيل الدخول
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

// 2. توجيه الرابط لصفحة لوحة التحكم
app.get('/dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// 🔥 مسار جديد: إنشاء حساب مستخدم وحفظ بياناته في قاعدة البيانات
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'يرجى ملء جميع الحقول.' });
    }

    try {
        // التحقق من أن اسم المستخدم غير محجوز مسبقاً
        const [userCheck] = await db.query('SELECT id FROM users WHERE username = ?', [username]);
        if (userCheck.length > 0) {
            return res.status(400).json({ success: false, message: 'اسم المستخدم مسجل مسبقاً! اختر اسماً آخر.' });
        }

        // إدخال العميل الجديد برصيد افتراضي يبدأ بـ 1000$ وصلاحية عميل عادي user
        const defaultBalance = 1000.00;
        const defaultRole = 'user';
        
        await db.query(
            'INSERT INTO users (username, password, role, balance, failed_attempts) VALUES (?, ?, ?, ?, 0)',
            [username, password, defaultRole, defaultBalance]
        );

        res.json({ success: true, message: '🎉 تم إنشاء حسابك البنكي بنجاح وتعبئته برصيد 1000$!' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'خطأ في السيرفر الداخلي أثناء التسجيل.' });
    }
});

// مسار تسجيل الدخول المطور
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const [userCheck] = await db.query('SELECT id, failed_attempts FROM users WHERE username = ?', [username]);
        
        if (userCheck.length > 0 && userCheck[0].failed_attempts >= 5) {
            return res.status(403).json({ success: false, message: '❌ تم قفل الحساب مؤقتاً بسبب 5 محاولات خاطئة متتالية.' });
        }

        const [results] = await db.query('SELECT id, username, role, balance FROM users WHERE username = ? AND password = ?', [username, password]);
        
        if (results.length > 0) {
            await db.query('UPDATE users SET failed_attempts = 0 WHERE username = ?', [username]);
            res.json({ success: true, user: results[0] });
        } else {
            await db.query('UPDATE users SET failed_attempts = failed_attempts + 1 WHERE username = ?', [username]);
            res.status(401).json({ success: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة!' });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: 'خطأ في السيرفر الداخلي' });
    }
});

// مسار التحويل المالي الآمن
app.post('/api/transfer', async (req, res) => {
    const { senderId, receiverUsername, amount, description } = req.body;
    const transferAmount = parseFloat(amount);

    if (transferAmount <= 0 || isNaN(transferAmount)) {
        return res.status(400).json({ success: false, message: 'المبلغ المدخل غير صالح.' });
    }

    try {
        await db.query('START TRANSACTION');

        const [senderResult] = await db.query('SELECT balance FROM users WHERE id = ?', [senderId]);
        if (senderResult.length === 0) {
            await db.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'حساب المرسل غير موجود.' });
        }

        const senderBalance = parseFloat(senderResult[0].balance);
        if (senderBalance < transferAmount) {
            await db.query('ROLLBACK');
            return res.status(400).json({ success: false, message: '❌ الرصيد غير كافٍ لإتمام العملية.' });
        }

        const [receiverResult] = await db.query('SELECT id FROM users WHERE username = ?', [receiverUsername]);
        if (receiverResult.length === 0) {
            await db.query('ROLLBACK');
            return res.status(404).json({ success: false, message: '❌ فشل التحويل: اسم مستخدم الطرف المستلم غير مسجل.' });
        }
        const receiverId = receiverResult[0].id;

        if (senderId == receiverId) {
            await db.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'لا يمكن التحويل لنفس الحساب.' });
        }

        await db.query('UPDATE users SET balance = balance - ? WHERE id = ?', [transferAmount, senderId]);
        await db.query('UPDATE users SET balance = balance + ? WHERE id = ?', [transferAmount, receiverId]);
        await db.query('INSERT INTO transactions (sender_id, receiver_id, amount, type, description) VALUES (?, ?, ?, "Transfer", ?)',
            [senderId, receiverId, transferAmount, description]);

        await db.query('COMMIT');
        res.json({ success: true, message: `💸 تم تحويل ${transferAmount}$ بنجاح إلى ${receiverUsername}` });

    } catch (error) {
        await db.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ success: false, message: 'خطأ داخلي في الخادم، تم إلغاء التحويل أمنياً.' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 السيرفر المحمي يعمل الآن على: http://localhost:${PORT}`);
});