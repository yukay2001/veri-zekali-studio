const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxinyI_rDob6ddmgE1bf4GfgGVczS4P9cucPwLAVgpkHZUGnfvDV_NMJ2USGm3sbmqI0w/exec?type=render";

async function runStudioRender() {
    console.log("[*] Tablodan haber görevi kontrol ediliyor...");
    const res = await fetch(WEB_APP_URL);
    const data = await res.json();

    if (data.status === "empty") {
        console.log("[i] Üretilecek yeni haber bulunamadı.");
        process.exit(0);
    }

    console.log(`[+] Görev Alındı: ${data.baslik}`);

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // 1080 x 1350 piksel netliği (1080 / 340)
    await page.setViewport({
        width: 1280,
        height: 1000,
        deviceScaleFactor: 1080 / 340
    });

    const filePath = path.join(process.cwd(), 'profesyonel_instagram_haber_st_dyosu_v3_7_0.html');
    await page.goto(`file://${filePath}`, { waitUntil: 'networkidle0' });

    // Panel Kutularını Tıpkı Bir İnsan Yazıyormuş Gibi Tetikleyerek Doldur
    await page.evaluate((item) => {
        // 1. Kutulara Yaz ve 'input' Sinyali Gönder (Stüdyo bunu anında algılar)
        function setAndTrigger(id, val) {
            const el = document.getElementById(id);
            if (el && val) {
                el.value = val;
                el.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }

        setAndTrigger('inputHeadline', item.baslik);
        setAndTrigger('inputSubtext', item.alt_metin || item.metin);
        setAndTrigger('inputCategory', item.kategori);
        setAndTrigger('inputBadge', item.rozet);

        // 2. State Hafızasını da Doğrudan Garantiye Al
        state.headline = item.baslik || '';
        state.subtext = item.alt_metin || item.metin || '';
        state.category = item.kategori || 'SAVUNMA';
        state.badge = item.rozet || 'SON DAKİKA';
        if (item.gorsel_url) {
            state.mediaUrl = item.gorsel_url;
        }
        state.logoText = 'VZ';
        state.pageName = 'VERİ ZEKALI';

        // 3. Şablon ve Temayı Uygula
        if (item.sablon && typeof selectTemplate === 'function') {
            selectTemplate(item.sablon);
        }
        if (item.tema && typeof setCategoryTheme === 'function') {
            setCategoryTheme(item.tema);
        }
        if (typeof selectRatio === 'function') {
            selectRatio('portrait');
        }

        // 4. Çizimi Yenile
        if (typeof renderCanvas === 'function') {
            renderCanvas();
        }
    }, data);

    // Drive görselinin ve yazıların yüklenmesi için 3 saniye bekle
    await new Promise(r => setTimeout(r, 3000));

    // Stüdyonun Kartını Yakala
    const postCanvas = await page.$('#instagramPostCanvas');
    await postCanvas.screenshot({ path: 'output.png' });
    await browser.close();
    console.log("[✓] Görsel ve Başlıklar Başarıyla Üretildi!");

    // Görseli Drive'a ve Tabloya Gönder
    const base64Img = fs.readFileSync('output.png').toString('base64');
    const updateRes = await fetch(WEB_APP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            row: data.row,
            action: 'save_image',
            image_base64: base64Img
        })
    });
    const updateJson = await updateRes.json();
    console.log("[✓] Tablo Güncellendi:", updateJson);
}

runStudioRender().catch(err => {
    console.error("Hata:", err);
    process.exit(1);
});
