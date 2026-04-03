const puppeteer = require('puppeteer');

(async () => {
    // 1. Khởi tạo trình duyệt tối ưu cho GitHub Actions
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
    await page.setViewport({ width: 1280, height: 800 });

    // 2. Lấy dữ liệu từ GitHub Inputs
    const rawUrl = process.env.TARGET_URL;
    const soXu = process.env.SO_XU || '10';
    const note = process.env.NOTE || 'Dikey.vn auto transfer';

    if (!rawUrl) {
        console.log("❌ Không có link người nhận (TARGET_URL), nghỉ khỏe!");
        await browser.close();
        return;
    }

    // 3. THUẬT TOÁN BIẾN ĐỔI LINK: Tự chuyển link profile sang link tặng xu
    // Chuyển /user/ thành /users/givebudget/ và xóa dấu gạch chéo thừa ở cuối
    let targetUrl = rawUrl.replace('/user/', '/users/givebudget/').replace(/\/$/, "");

    try {
        // 4. Nạp Cookie từ Secret
        if (!process.env.LAZI_COOKIES_JSON) {
            throw new Error("Chưa cài đặt LAZI_COOKIES_JSON trong Secret!");
        }
        
        const cookieData = JSON.parse(process.env.LAZI_COOKIES_JSON);
        const cookiesToSet = cookieData.cookies ? cookieData.cookies : cookieData;
        await page.setCookie(...cookiesToSet);
        
        console.log(`🎯 Link gốc: ${rawUrl}`);
        console.log(`🚀 Đang tiến vào: ${targetUrl}`);

        // 5. Truy cập Lazi
        await page.goto(targetUrl, { 
            waitUntil: 'networkidle2', 
            timeout: 60000 
        });

        // Kiểm tra xem có bị văng ra trang đăng nhập không
        const title = await page.title();
        if (title.includes("Đăng nhập") || title.includes("Login")) {
            throw new Error("Cookie hết hạn rồi Nam ơi, Lazi bắt đăng nhập lại kìa!");
        }

        // 6. Điền thông tin (Dùng ID #xu và class .nut_gui_bai từ HTML của ông)
        console.log(`🔍 Đang tìm ô nhập xu và điền ${soXu}...`);
        
        // Đợi ô nhập xu xuất hiện
        await page.waitForSelector('#xu', { timeout: 20000 });
        
        // Xóa sạch ô nhập cũ và điền số xu mới
        await page.click('#xu', { clickCount: 3 });
        await page.keyboard.press('Backspace');
        await page.type('#xu', soXu.toString());

        // Điền lời nhắn
        const hasNote = await page.$('textarea[name="note"]');
        if (hasNote) {
            await page.type('textarea[name="note"]', note);
        }

        // 7. Nhấn nút "Chuyển tặng"
        console.log("💰 Đang nhấn nút Xác nhận tặng...");
        
        await Promise.all([
            page.click('.nut_gui_bai'),
            page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }),
        ]);

        // 8. Kiểm tra kết quả cuối cùng
        const content = await page.content();
        if (content.includes('thành công') || content.includes('Success')) {
            console.log("------------------------------------------");
            console.log(`✅ Đã tặng ${soXu} xu thành công cho ${targetUrl}`);
            console.log("------------------------------------------");
        } else {
            console.log("⚠️ Đã bấm nhưng có vẻ không thành công. Check ảnh debug nhé.");
            await page.screenshot({ path: 'check_ketqua.png' });
        }

    } catch (e) {
        console.log("❌ LỖI RỒI: " + e.message);
        // Chụp ảnh lại để ông soi lỗi cho dễ
        await page.screenshot({ path: 'error_debug.png' });
    }

    console.log("👋 Đóng trình duyệt.");
    await browser.close();
})();
