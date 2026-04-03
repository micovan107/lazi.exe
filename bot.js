const puppeteer = require('puppeteer');

(async () => {
    // 1. Khởi động trình duyệt (Cấu hình đặc biệt cho môi trường Linux GitHub)
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

    // Thiết lập kích thước màn hình để dễ bắt trúng nút bấm
    await page.setViewport({ width: 1280, height: 800 });

    try {
        // 2. Kiểm tra và nạp Cookie từ GitHub Secret
        if (!process.env.LAZI_COOKIES_JSON) {
            throw new Error("Chưa cấu hình LAZI_COOKIES_JSON trong Repository Secrets!");
        }

        const cookieData = JSON.parse(process.env.LAZI_COOKIES_JSON);
        
        // Nạp mảng cookies từ JSON của ông
        if (cookieData.cookies) {
            await page.setCookie(...cookieData.cookies);
        } else {
            await page.setCookie(...cookieData);
        }
        
        console.log("✅ Đã nạp Cookie thành công. Bắt đầu tiến vào Lazi...");

        // 3. Đi tới trang Tặng ngân sách của ông Nam
        const targetUrl = 'https://lazi.vn/users/givebudget/tien-nam.nguyen20';
        await page.goto(targetUrl, { 
            waitUntil: 'networkidle2', 
            timeout: 60000 
        });

        console.log("🔍 Đang tìm ô nhập tiền...");

        // 4. Chờ ô nhập số tiền xuất hiện (Timeout 10s)
        await page.waitForSelector('input[name="xu"]', { timeout: 10000 });

        // 5. Điền thông tin chuyển xu
        // Xóa nội dung cũ nếu có và điền 10 xu
        await page.click('input[name="xu"]', { clickCount: 3 }); 
        await page.type('input[name="xu"]', '10');

        // Điền lời nhắn (Note)
        const hasNote = await page.$('textarea[name="note"]');
        if (hasNote) {
            await page.type('textarea[name="note"]', 'Dikey.vn auto transfer testing via GitHub Actions');
        }

        console.log("💰 Đang nhấn nút Xác nhận tặng...");

        // 6. Click nút Gửi và đợi chuyển trang
        // Sử dụng Selector bao quát cả input và button submit
        await Promise.all([
            page.click('input[type="submit"], button[type="submit"], .btn-primary'),
            page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }),
        ]);

        // 7. Kiểm tra kết quả cuối cùng
        const content = await page.content();
        const successKeywords = ['thành công', 'Success', 'đã gửi', 'Hoàn tất'];
        
        const isSuccess = successKeywords.some(keyword => content.includes(keyword));

        if (isSuccess) {
            console.log("------------------------------------------");
            console.log("✅ CHUYỂN XU THÀNH CÔNG RƯC RỠ RỒI NAM ƠI!");
            console.log("------------------------------------------");
        } else {
            console.log("⚠️ Có vẻ có thông báo gì đó lạ, check ảnh debug_result.png nhé.");
            await page.screenshot({ path: 'debug_result.png' });
        }

    } catch (e) {
        console.log("❌ LỖI HỆ THỐNG: " + e.message);
        // Chụp ảnh màn hình lúc lỗi để ông Nam dễ "bắt bệnh"
        await page.screenshot({ path: 'error_debug.png' });
    }

    // Đóng trình duyệt
    console.log("👋 Đang đóng trình duyệt...");
    await browser.close();
})();
