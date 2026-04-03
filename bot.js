const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ 
        headless: "new", 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();

    try {
        // 1. Lấy nguyên cục JSON Cookie từ GitHub Secret
        const cookieData = JSON.parse(process.env.LAZI_COOKIES_JSON);
        
        // 2. Nạp toàn bộ cookie vào trình duyệt
        await page.setCookie(...cookieData.cookies);
        console.log("✅ Đã nạp " + cookieData.cookies.length + " cookies. Sẵn sàng 'vượt rào'!");

        // 3. Đi tới trang chuyển xu (Thay ID người nhận vào đây)
        const targetId = '5829250'; 
        await page.goto(`https://lazi.vn/user/coin/${targetId}`, { waitUntil: 'networkidle2' });

        // 4. Kiểm tra xem có đúng là dikey.ai đang login không
        const isLogged = await page.evaluate(() => document.body.innerText.includes('dikey.ai'));
        if (!isLogged) {
            console.log("❌ Cookie có vẻ hết hạn hoặc sai rồi Nam ơi!");
            await browser.close();
            return;
        }

        // 5. Điền form và chuyển
        await page.type('input[name="xu"]', '10');
        await page.type('textarea[name="note"]', 'Dikey AI gửi quà qua GitHub Actions!');
        
        await Promise.all([
            page.click('input[name="submit"]'),
            page.waitForNavigation({ waitUntil: 'networkidle0' }),
        ]);

        console.log("💰 Chuyển xu thành công rực rỡ!");

    } catch (e) {
        console.log("❌ Lỗi hệ thống: " + e.message);
    }

    await browser.close();
})();
