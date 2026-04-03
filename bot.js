// bot.js (Bản nhận lệnh)
const puppeteer = require('puppeteer');

(async () => {
    // Lấy dữ liệu từ biến môi trường do GitHub cấp
    const targetUrl = process.env.TARGET_URL; 
    const soXu = process.env.SO_XU || '10';
    const note = process.env.NOTE || 'Dikey.vn auto';

    if (!targetUrl) {
        console.log("❌ Không có link người nhận, nghỉ khỏe!");
        return;
    }

    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
    const page = await browser.newPage();
    
    try {
        const cookieData = JSON.parse(process.env.LAZI_COOKIES_JSON);
        await page.setCookie(...cookieData.cookies);

        await page.goto(targetUrl, { waitUntil: 'networkidle2' });
        await page.waitForSelector('input[name="xu"]');
        await page.type('input[name="xu"]', soXu);
        await page.type('textarea[name="note"]', note);

        await Promise.all([
            page.click('input[type="submit"], button[type="submit"]'),
            page.waitForNavigation({ waitUntil: 'networkidle0' }),
        ]);
        console.log(`✅ Đã tặng ${soXu} xu cho ${targetUrl}`);
    } catch (e) {
        console.log("❌ Lỗi: " + e.message);
    }
    await browser.close();
})();
