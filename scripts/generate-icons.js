// scripts/generate-icons.js
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const pngToIcoModule = require('png-to-ico');
const pngToIco = pngToIcoModule.default || pngToIcoModule;

const SVG_PATH = path.join(__dirname, '../assets/icon.svg');
const ASSETS_DIR = path.join(__dirname, '../assets');

async function generateIcons() {
    try {
        if (!fs.existsSync(ASSETS_DIR)) {
            fs.mkdirSync(ASSETS_DIR, { recursive: true });
        }

        if (!fs.existsSync(SVG_PATH)) {
            console.error(`❌ Error: Source SVG not found at ${SVG_PATH}`);
            process.exit(1);
        }

        console.log('📦 1. Generating assets/icon.png (VSCode Extension Icon)...');
        await sharp(SVG_PATH)
            .resize(256, 256)
            .png()
            .toFile(path.join(ASSETS_DIR, 'icon.png'));

        console.log('🩹 2. Generating multi-resolution assets/icon.ico for Windows Desktop...');
        const sizes = [16, 32, 48, 256];
        const tempPngPaths = [];

        for (const size of sizes) {
            const tempPath = path.join(ASSETS_DIR, `temp-${size}.png`);
            await sharp(SVG_PATH).resize(size, size).png().toFile(tempPath);
            tempPngPaths.push(tempPath);
        }

        const icoBuffer = await pngToIco(tempPngPaths);
        fs.writeFileSync(path.join(ASSETS_DIR, 'icon.ico'), icoBuffer);

        // 一時ファイルの削除
        tempPngPaths.forEach((p) => {
            if (fs.existsSync(p)) fs.unlinkSync(p);
        });

        console.log('✨ Icons generated successfully!');
        console.log(` - PNG Icon: ${path.join(ASSETS_DIR, 'icon.png')}`);
        console.log(` - ICO Icon: ${path.join(ASSETS_DIR, 'icon.ico')}`);
    } catch (error) {
        console.error('❌ Error generating icons:', error);
        process.exit(1);
    }
}

generateIcons();