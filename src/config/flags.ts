export const USE_FASTAPI_BACKEND = true;

// 🎛️ TOGGLE TEST LOKAL / CLOUD
// Ubah ke true untuk testing lokal, atau false untuk testing Cloud Run (Staging)
export const TEST_LOCALLY = false;

// 💻 Alamat URL Lokal berdasarkan simulator yang digunakan:
// - iOS Simulator / Web: 'http://localhost:8000'
// - Android Emulator: 'http://10.0.2.2:8000'
// - Real Device (HP Fisik): Gunakan IP Wi-Fi komputer Anda, misal: 'http://192.168.1.50:8000'
const LOCAL_URL = 'http://localhost:8000'; 

const CLOUD_URL = 'https://gongcha-backend-353793177534.asia-southeast1.run.app';

export const FASTAPI_BASE_URL = TEST_LOCALLY ? LOCAL_URL : CLOUD_URL;
