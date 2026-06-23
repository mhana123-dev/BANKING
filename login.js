// توليد كابتشا عشوائية عند تحميل الصفحة
function generateCaptcha() {
    const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let captchaLength = 5;
    let captchaStr = "";
    for (let i = 0; i < captchaLength; i++) {
        let randomIndex = Math.floor(Math.random() * chars.length);
        captchaStr += chars[randomIndex];
    }
    document.getElementById("captcha-text").innerText = captchaStr;
}

document.getElementById("loginForm").addEventListener("submit", async function(e) {
    e.preventDefault();
    
    const captchaText = document.getElementById("captcha-text").innerText;
    const captchaInput = document.getElementById("captcha-input").value;
    const usernameInput = document.getElementById("username").value; // تأكد أن ID حقل الاسم هو username
    const passwordInput = document.getElementById("password").value; // تأكد أن ID حقل كلمة المرور هو password
    const alertBox = document.getElementById("alert-box");

    // 1. فحص كود التحقق الأمني (الكابتشا) أولاً وتجاهل حالة الأحرف
    if (captchaInput.toLowerCase() !== captchaText.toLowerCase()) {
        alertBox.className = "alert danger";
        alertBox.innerText = "⚠️ رمز التحقق (Captcha) غير صحيح، يرجى المحاولة مرة أخرى.";
        alertBox.classList.remove("hidden");
        generateCaptcha(); // تحديث الرمز
        return;
    }

    // 2. إرسال البيانات الفعالة للسيرفر والتحقق من الحساب
    alertBox.className = "alert success";
    alertBox.innerText = "جاري التحقق من الهوية والاتصال بالخادم...";
    alertBox.classList.remove("hidden");

    try {
        const response = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: usernameInput,
                password: passwordInput
            })
        });

        const data = await response.json();

        if (data.success) {
            alertBox.innerText = "✅ تم التحقق بنجاح! جاري تحويلك لوحة التحكم...";
            
            // حفظ بيانات العميل مؤقتاً لكي نقرأ رصيده واسمه في الصفحات القادمة
            localStorage.setItem('user', JSON.stringify(data.user));

            // التوجيه فوراً إلى صفحة لوحة التحكم بعد ثانية واحدة
            setTimeout(() => {
                window.location.href = 'dashboard.html'; 
            }, 1000);

        } else {
            alertBox.className = "alert danger";
            alertBox.innerText = `❌ ${data.message}`;
            generateCaptcha();
        }

    } catch (error) {
        alertBox.className = "alert danger";
        alertBox.innerText = "❌ فشل الاتصال بالسيرفر. تأكد من أن الشاشة السوداء تعمل!";
        generateCaptcha();
    }
});

// تشغيل الدالة تلقائياً عند فتح الصفحة لتهيئة النص
window.onload = generateCaptcha;