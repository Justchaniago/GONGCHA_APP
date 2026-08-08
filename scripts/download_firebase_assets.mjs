import { initializeApp } from 'firebase/app';
import { getStorage, ref, listAll, getDownloadURL } from 'firebase/storage';
import fs from 'node:fs';
import path from 'node:path';

const firebaseConfig = {
  apiKey: 'AIzaSyCpCLkG0gjvcHMghrgbUcw6N0Cbr79UlBo',
  authDomain: 'gongcha-backend.firebaseapp.com',
  projectId: 'gongcha-backend',
  storageBucket: 'gongcha-backend.firebasestorage.app',
  messagingSenderId: '79343384792',
  appId: '1:79343384792:web:9ff7405f35686988eb7fad',
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

const outputDir = path.resolve(process.cwd(), 'firebase_downloads');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const targetFolders = [
  'products',
  'product',
  'stores',
  'store',
  'promotions',
  'banners',
  'avatars',
  'rewards',
  'menu',
];

async function downloadFolder(folderPath) {
  try {
    const folderRef = ref(storage, folderPath);
    const res = await listAll(folderRef);
    
    let downloadedCount = 0;

    for (const itemRef of res.items) {
      try {
        const url = await getDownloadURL(itemRef);
        const localFilePath = path.join(outputDir, itemRef.fullPath);
        fs.mkdirSync(path.dirname(localFilePath), { recursive: true });
        
        console.log(`Downloading: ${itemRef.fullPath}`);
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        fs.writeFileSync(localFilePath, Buffer.from(buffer));
        downloadedCount++;
      } catch (e) {
        console.warn(`Failed to download item ${itemRef.fullPath}:`, e.message);
      }
    }

    for (const prefixRef of res.prefixes) {
      downloadedCount += await downloadFolder(prefixRef.fullPath);
    }
    return downloadedCount;
  } catch (err) {
    console.log(`Folder '${folderPath}' not found or unreadable:`, err.message);
    return 0;
  }
}

async function main() {
  console.log('Starting automated Firebase Storage image asset download...');
  let totalDownloaded = 0;
  for (const folder of targetFolders) {
    totalDownloaded += await downloadFolder(folder);
  }
  console.log(`\nAUTOMATED DOWNLOAD COMPLETE!`);
  console.log(`Total images downloaded: ${totalDownloaded}`);
  console.log(`Destination folder: ${outputDir}`);
  process.exit(0);
}

main();
