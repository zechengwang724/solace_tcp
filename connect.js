import solace from 'solclientjs';
import dotenv from 'dotenv';

dotenv.config();

const factoryProps = new solace.SolclientFactoryProperties();
factoryProps.profile = solace.SolclientFactoryProfiles.version10;
try {
    solace.SolclientFactory.init(factoryProps);
} catch (error) {
    console.error("FATAL: Failed to initialize SolclientFactory.", error);
    process.exit(1);
}
solace.SolclientFactory.setLogLevel(solace.LogLevel.TRACE);

const SOLACE_HOST = process.env.SOL_HOST;
const SOLACE_VPN_NAME = process.env.SOL_VPN_NAME;
const SOLACE_USERNAME = process.env.SOL_USERNAME;
const SOLACE_PASSWORD = process.env.SOL_PASS;

if (!SOLACE_HOST || !SOLACE_VPN_NAME || !SOLACE_USERNAME || !SOLACE_PASSWORD) {
    console.error("ERROR: 請在 .env 檔案中設定 SOL_URL, SOL_VPN_NAME, SOL_USERNAME, SOL_PASSWORD");
    process.exit(1);
}


const sessionProperties = new solace.SessionProperties();
sessionProperties.url = SOLACE_HOST;
sessionProperties.vpnName = SOLACE_VPN_NAME;
sessionProperties.userName = SOLACE_USERNAME;
sessionProperties.password = SOLACE_PASSWORD;
sessionProperties.compressionLevel = 5;
sessionProperties.connectTimeoutInMsecs = 5000;
sessionProperties.reapplySubscriptions = true;


let session = null;
try {
    session = solace.SolclientFactory.createSession(sessionProperties);
    if (!session) {
        console.error("ERROR: 無法建立 Session.");
        process.exit(1);
    }
} catch (error) {
    console.error("ERROR: 無法建立 Session.", error);
    process.exit(1);
}

session.on(solace.SessionEventCode.UP_NOTICE, (sessionEvent) => {
    console.log("=== 連線成功！ ===");
    console.log(`Session Event: ${sessionEvent.infoStr}`);
    console.log("測試連線成功，現在斷開連線...");
    session.disconnect();
});

session.on(solace.SessionEventCode.CONNECT_FAILED_ERROR, (sessionEvent) => {
    console.error("XXX 連線失敗 XXX");
    console.error(`錯誤訊息: ${sessionEvent.infoStr}`);
    console.error(`詳細資訊: ${sessionEvent.errorStr || 'N/A'}`);
    console.error(`Subcode: ${sessionEvent.subcode} - ${solace.ErrorSubcode[sessionEvent.subcode] || '未知 Subcode'}`);
});

session.on(solace.SessionEventCode.DISCONNECTED, (sessionEvent) => {
    console.log("已斷開與 Solace Broker 的連線。");
    if (session && !session.isDisposed()) {
        session.dispose();
        console.log("Session disposed.");
    }
});

try {
    console.log(`嘗試連線至 ${SOLACE_HOST} (VPN: ${SOLACE_VPN_NAME})...`);
    session.connect();
} catch (error) {
    console.error("ERROR: 呼叫 session.connect() 時發生錯誤:", error);
}

console.log("腳本執行完畢。等待 Solace 事件...");

process.on('SIGINT', () => {
    console.log("\nSIGINT 收到，準備斷開連線...");
    if (session && !session.isDisposed() && session.isCapable(solace.CapabilityType.PEER_SHUTDOWN)) {
        session.disconnect();
        // 等待 DISCONNECTED 事件或超時
        setTimeout(() => {
            if (session && !session.isDisposed()) {
                session.dispose();
            }
            process.exit(0);
        }, 2000);
    } else {
        if (session && !session.isDisposed()) {
            session.dispose();
        }
        process.exit(0);
    }
});