const puppeteer = require('puppeteer');

(async () => {
    // 1. Khởi tạo trình duyệt (Cấu hình chạy mượt trên GitHub Actions)
    const browser = await puppeteer.launch({
        headless: "new",
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
        ]
    });

    const page = await browser.newPage();
    // Đặt màn hình rộng cho Bot dễ "nhìn"
    await page.setViewport({ width: 1280, height: 800 });

    // Lấy dữ liệu từ lệnh gửi sang
    const targetUrl = process.env.TARGET_URL;
    const soXu = process.env.SO_XU || '10';
    const note = process.env.NOTE || 'Dikey.vn auto transfer';

    if (!targetUrl) {
        console.log("❌ Không có link người nhận (TARGET_URL), nghỉ khỏe!");
        await browser.close();
        return;
    }

    try {
        // 2. Nạp Cookie (Lấy từ GitHub Secret)
        if (!process.env.LAZI_COOKIES_JSON) {
            throw new Error("Chưa cài đặt LAZI_COOKIES_JSON trong Secret!");
        }
        
        const cookieData = JSON.parse(process.env.LAZI_COOKIES_JSON);
        // Kiểm tra xem cookie dạng mảng hay object có property cookies
        const cookiesToSet = cookieData.cookies ? cookieData.cookies : cookieData;
        await page.setCookie(...cookiesToSet);
        
        console.log(`🚀 Đang tiến vào: ${targetUrl}`);

        // 3. Truy cập trang tặng ngân sách
        await page.goto(targetUrl, { 
            waitUntil: 'networkidle2', 
            timeout: 60000 
        });

        // Kiểm tra tiêu đề để xem có bị văng ra trang đăng nhập không
        const title = await page.title();
        if (title.includes("Đăng nhập") || title.includes("Login")) {
            throw new Error("Cookie bị 'thiu' rồi Nam ơi, Lazi bắt đăng nhập lại kìa!");
        }

        // 4. Tìm và điền số xu (Dùng ID #xu như trong HTML của ông)
        console.log(`🔍 Đang tìm ô nhập xu và điền ${soXu}...`);
        await page.waitForSelector('#xu', { timeout: 20000 });
        
        // Xóa trắng ô cũ trước khi nhập
        await page.click('#xu', { clickCount: 3 });
        await page.keyboard.press('Backspace');
        await page.type('#xu', soXu.toString());

        // 5. Điền lời nhắn (Note)
        const hasNote = await page.$('textarea[name="note"]');
        if (hasNote) {
            await page.type('textarea[name="note"]', note);
        }

        // 6. Nhấn nút "Chuyển tặng" (Dùng class .nut_gui_bai chuẩn đét)
        console.log("💰 Đang nhấn nút Xác nhận tặng...");
        
        await Promise.all([
            page.click('.nut_gui_bai'), // Click bằng class cho nhạy
            page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }),
        ]);

        // 7. Kiểm tra kết quả
        const content = await page.content();
        if (content.includes('thành công') || content.includes('Success')) {
            console.log("------------------------------------------");
            console.log(`✅ Đã tặng ${soXu} xu thành công cho ${targetUrl}`);
            console.log("------------------------------------------");
        } else {
            console.log("⚠️ Đã bấm nhưng Lazi chưa báo thành công. Check lại số dư nhé.");
            await page.screenshot({ path: 'check_ketqua.png' });
        }

    } catch (e) {
        console.log("❌ LỖI HỆ THỐNG: " + e.message);
        // Chụp ảnh lỗi để ông Nam dễ soi
        await page.screenshot({ path: 'error_debug.png' });
    }

    console.log("👋 Đóng trình duyệt.");
    await browser.close();
})();
