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

    // Gerçek Chrome Tarayıcısını Başlat
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // 1080 x 1350 piksel netliği için ölçek faktörü (1080 / 340)
    await page.setViewport({
        width: 1280,
        height: 1000,
        deviceScaleFactor: 1080 / 340
    });

    // Stüdyo Dosyanızı Aç
    const filePath = path.join(process.cwd(), 'profesyonel_instagram_haber_st_dyosu_v3_7_0.html');
    await page.goto(`file://${filePath}`, { waitUntil: 'networkidle0' });

    // Stüdyo Paneline Verileri Doldur ve Şablonu Seç
    await page.evaluate((item) => {
        // Şablon ve Kategori Seçimi (bpt, breaking, quote, split vb.)
        if (item.sablon && typeof selectTemplate === 'function') {
            selectTemplate(item.sablon);
        }
        if (item.tema && typeof setCategoryTheme === 'function') {
            setCategoryTheme(item.tema);
        }
        if (typeof selectRatio === 'function') {
            selectRatio('portrait');
        }

        // Panel Alanlarını Doldur
        const elH = document.getElementById('inputHeadline');
        if (elH && item.baslik) elH.value = item.baslik;

        const elSub = document.getElementById('inputSubtext');
        if (elSub && (item.alt_metin || item.metin)) elSub.value = item.alt_metin || item.metin;

        const elCat = document.getElementById('inputCategory');
        if (elCat && item.kategori) elCat.value = item.kategori;

        const elBadge = document.getElementById('inputBadge');
        if (elBadge && item.rozet) elBadge.value = item.rozet;

        // Marka Bilgileri
        state.logoText = 'VZ';
        state.pageName = 'VERİ ZEKALI';
        if (item.gorsel_url) {
            state.mediaUrl = item.gorsel_url;
        }

        // Çizimi Güncelle
        if (typeof renderCanvas === 'function') {
            renderCanvas();
        }
    }, data);

    // Fontların ve görselin yüklenmesi için 2 saniye bekle
    await new Promise(r => setTimeout(r, 2000));

    // Stüdyonun Kendi Kartını 1080x1350 Piksel Olarak Yakala
    const postCanvas = await page.$('#instagramPostCanvas');
    await postCanvas.screenshot({ path: 'output.png' });
    await browser.close();
    console.log("[✓] 1080x1350 Görsel Başarıyla Üretildi: output.png");

    // Üretilen Görseli Tabloya ve Drive'a İlet
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
    console.log("[✓] Tablo ve Drive Güncellendi:", updateJson);
}

runStudioRender().catch(err => {
    console.error("Hata:", err);
    process.exit(1);
});
