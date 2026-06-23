document.getElementById("registerForm").addEventListener("submit", async function(e) {
    e.preventDefault();
    
    const usernameInput = document.getElementById("reg-username").value;
    const passwordInput = document.getElementById("reg-password").value;
    const alertBox = document.getElementById("reg-alert-box");

    alertBox.style.background = "#3498db";
    alertBox.innerText = "جاري إنشاء الحساب وإعداد الخزنة البنكية...";
    alertBox.classList.remove("hidden");

    try {
        const response = await fetch('http://localhost:3000/api/register', {
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
            alertBox.style.background = "#2ecc71";
            alertBox.innerText = data.message + " جاري توجيهك لصفحة الدخول...";
            
            // توجيهه لصفحة الدخول بعد ثانيتين ليجرب حسابه الجديد
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2500);
        } else {
            alertBox.style.background = "#e74c3c";
            alertBox.innerText = `❌ ${data.message}`;
        }

    } catch (error) {
        alertBox.style.background = "#e74c3c";
        alertBox.innerText = "❌ فشل الاتصال بالسيرفر لحفظ البيانات.";
    }
});