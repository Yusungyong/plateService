const sharp = require('sharp');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const files = {'app-home':'KakaoTalk_20260915_211008421_02.png','app-map':'KakaoTalk_20260915_211008421_01.png','app-profile':'KakaoTalk_20260915_211008421.png'};
(async () => {for (const [name, file] of Object.entries(files)) for (const width of [400,800]) {
 const dest = path.join(root, 'src/assets/home', `${name}-${width}.png`);
 await sharp(path.join(root,'public/images/home',file)).resize({width,withoutEnlargement:true}).png({palette:true,quality:85,compressionLevel:9}).toFile(dest);
 console.log(path.basename(dest), fs.statSync(dest).size);
}})().catch(error => {console.error(error);process.exitCode=1;});
