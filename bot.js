// 3. Đi tới trang Tặng ngân sách (Link cá nhân của ông Nam)
const targetUrl = 'https://lazi.vn/users/givebudget/tien-nam.nguyen20';
await page.goto(targetUrl, { waitUntil: 'networkidle2' });

try {
    console.log("🔍 Đang tìm ô nhập tiền...");
    
    // Chờ ô nhập số tiền (Lazi thường đặt name="budget" hoặc name="xu")
    // Ở trang givebudget, nó thường là input có name="budget" hoặc "xu"
    await page.waitForSelector('input[name="xu"]', { timeout: 10000 });

    // 4. Điền thông tin
    await page.type('input[name="xu"]', '10'); // Số xu tặng
    
    // Nếu có ô lời nhắn (thường là textarea name="note")
    const hasNote = await page.$('textarea[name="note"]');
    if (hasNote) {
        await page.type('textarea[name="note"]', 'Dikey.vn auto transfer testing...');
    }

    console.log("💰 Đang nhấn nút Xác nhận tặng...");
    
    // 5. Click nút Gửi (Thường là input[type="submit"] hoặc button có class btn-primary)
    await Promise.all([
        page.click('input[type="submit"], button[type="submit"]'),
        page.waitForNavigation({ waitUntil: 'networkidle0' }),
    ]);

    // Kiểm tra xem có thông báo thành công không
    const content = await page.content();
    if (content.includes('thành công') || content.includes('Success')) {
        console.log("✅ CHUYỂN XU THÀNH CÔNG RỒI NAM ƠI!");
    } else {
        console.log("⚠️ Đã bấm nhưng chưa chắc thành công, check lại số dư nhé.");
    }

} catch (e) {
    console.log("❌ Lỗi: Không tìm thấy form tặng. Có thể Cookie hết hạn rồi!");
    await page.screenshot({ path: 'debug_givebudget.png' }); // Chụp lại để soi lỗi
}
