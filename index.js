import solace from 'solclientjs';
import dotenv from 'dotenv';

import { unPackSolMsg } from './serializer.js';
import { unPackTickSTKv1, unPackTickFOPv1, unPackTickIND } from './transformers.js';

dotenv.config();

try {
    const factoryProps = new solace.SolclientFactoryProperties();
    factoryProps.profile = solace.SolclientFactoryProfiles.version10_5;
    solace.SolclientFactory.init(factoryProps);
    solace.SolclientFactory.setLogLevel(solace.LogLevel.INFO);
} catch (error) {
    console.error("FATAL: Failed to initialize SolclientFactory.", error);
    process.exit(1);
}

class SolaceSubscriber {
    constructor(host, vpnName, userName, password) {
        this.host = host;
        this.vpnName = vpnName;
        this.userName = userName;
        this.password = password;
        this.session = null;
    }

    _initializeSession() {
        const sessionProperties = new solace.SessionProperties();
        sessionProperties.url = this.host;
        sessionProperties.vpnName = this.vpnName;
        sessionProperties.userName = this.userName;
        sessionProperties.password = this.password;
        sessionProperties.clientName = 'NODE_TEST';
        sessionProperties.connectTimeoutInMsecs = 5000;
        sessionProperties.compressionLevel = 5;
        sessionProperties.reapplySubscriptions = true;

        try {
            this.session = solace.SolclientFactory.createSession(sessionProperties);
            if (!this.session) {
                console.error("ERROR: Could not create session.");
                throw new Error("Session creation failed.");
            }
        } catch (error) {
            console.error("ERROR: Could not create session.", error);
            throw error;
        }
    }

    _registerSessionEvents() {
        this.session.on(solace.SessionEventCode.UP_NOTICE, (sessionEvent) => {
            console.log("=== Connection successful! ===");
            console.log(`Session Event: ${sessionEvent.infoStr}`);
            console.log("=== Session is UP. Ready to subscribe to topics. ===");
        });

        this.session.on(solace.SessionEventCode.CONNECT_FAILED_ERROR, (sessionEvent) => {
            console.error("XXX Connection failed XXX");
            console.error(`Error: ${sessionEvent.infoStr}`);
            console.error(`Details: ${sessionEvent.errorStr || 'N/A'}`);
            console.error(`Subcode: ${sessionEvent.subcode} - ${solace.ErrorSubcode[sessionEvent.subcode] || 'Unknown Subcode'}`);
        });

        this.session.on(solace.SessionEventCode.DISCONNECTED, (sessionEvent) => {
            console.log("Disconnected from Solace Broker.");
            console.log(`Session Event: ${sessionEvent.infoStr}`);
            if (this.session) {
                this.session.dispose();
                console.log("Session disposed.");
            }
        });

        this.session.on(solace.SessionEventCode.SUBSCRIPTION_OK, (sessionEvent) => {
            console.log(`Successfully subscribed to topic: ${sessionEvent.correlationKey}`);
            console.log("=== Ready to receive messages. ===");
        });

        this.session.on(solace.SessionEventCode.SUBSCRIPTION_ERROR, (sessionEvent) => {
            console.error(`XXX Could not subscribe to topic: ${sessionEvent.correlationKey} XXX`);
            console.error(`Error: ${sessionEvent.infoStr}`);
            console.error(`Details: ${sessionEvent.errorStr || 'N/A'}`);
            console.error(`Subcode: ${sessionEvent.subcode} - ${solace.ErrorSubcode[sessionEvent.subcode] || 'Unknown Subcode'}`);
        });

        this.session.on(solace.SessionEventCode.MESSAGE, (message) => {
            const dest = message.getDestination()?.getName();
            if (!dest) return;
            const data = unPackSolMsg(message);
            const topicArr = dest.split('/');
            const formatType = topicArr[2];

            if (dest.startsWith('TIC') || dest.startsWith('QUO')) {
                if (formatType === 'STK') {
                    if (dest.startsWith('TIC')) {
                        const unpackedData = unPackTickSTKv1(data);
                        console.log(`Received STK Tick on topic "${dest}":`, JSON.stringify(unpackedData, null, 2));
                    }
                } else if (formatType === 'FOP') {
                    if (dest.startsWith('TIC')) {
                        const unpackedData = unPackTickFOPv1(data);
                        console.log(`Received FOP Tick on topic "${dest}":`, JSON.stringify(unpackedData, null, 2));
                    }
                }
            } else if (dest.startsWith('I')) {
                const unpackedData = unPackTickIND(data);
                console.log(`Received IND Tick on topic "${dest}":`, JSON.stringify(unpackedData, null, 2));
            } else {
                this.log('warn', 'Unsupported destination:', dest);
            }
        });
    }

    connect() {
        if (!this.session) {
            this._initializeSession();
            this._registerSessionEvents();
        }
        try {
            console.log(`Attempting to connect to ${this.host} (VPN: ${this.vpnName})...`);
            this.session.connect();
        } catch (error) {
            console.error("ERROR: Call to session.connect() failed:", error);
        }
    }

    subscribe(subscribeTopic) {
        if (!this.session) {
            console.log("WARN: Session is not valid or is disposed. Cannot subscribe.");
            return;
        }


        try {
            console.log(`Attempting to subscribe to topic: ${subscribeTopic}`);
            this.session.subscribe(
                solace.SolclientFactory.createTopic(subscribeTopic),
                true,
                subscribeTopic,
                10000
            );
        } catch (error) {
            console.error(`ERROR: Subscription attempt failed for topic "${topicString}":`, error);
        }
    }

    disconnect() {
        console.log("Disconnecting from Solace Broker...");
        if (this.session) {
            try {
                this.session.disconnect();
            } catch (error) {
                console.error("Error during disconnect:", error);
                this.session.dispose();
            }
        }
    }
}



const SOLACE_HOST = process.env.SOL_HOST;
const SOLACE_VPN_NAME = process.env.SOL_VPN_NAME;
const SOLACE_USERNAME = process.env.SOL_USERNAME;
const SOLACE_PASSWORD = process.env.SOL_PASS;

if (!SOLACE_HOST || !SOLACE_VPN_NAME || !SOLACE_USERNAME || !SOLACE_PASSWORD) {
    console.error("ERROR: Please set SOL_HOST, SOL_VPN_NAME, SOL_USERNAME, SOL_PASSWORD in your .env file.");
    process.exit(1);
}

const subscriber = new SolaceSubscriber(
    SOLACE_HOST,
    SOLACE_VPN_NAME,
    SOLACE_USERNAME,
    SOLACE_PASSWORD
);


// 執行連線
subscriber.connect();
console.log("連線執行完畢。等待 Solace 事件...");


// 執行訂閱
setTimeout(() => {
    if (subscriber && subscriber.session) {
        const StkTseTopic = "TIC/v1/STK/*/TSE/2330"; // 上市(台積電
        const StkOtcTopic = "TIC/v1/STK/*/OTC/3081"; // 上櫃(聯亞
        const FutTopic = "TIC/v1/FOP/*/TFE/TXFF5"; // 期貨(台股期貨06
        const OptTopic = "TIC/v1/FOP/*/OPT/TXO21000R5"; // 選擇權(台指選擇權6月
        const IndTseTopic = "I/TSE/001"; // 指數(加權指數
        const IndOtcTopic = "I/OTC/101"; // 指數(櫃買指數
        subscriber.subscribe(FutTopic);

    } else {
        console.log("Cannot attempt manual subscription: subscriber or session not ready.");
    }
}, 3000);


// 退出
process.on('SIGINT', () => {
    console.log("\nSIGINT received, preparing to disconnect...");
    if (subscriber && subscriber.session) {
        subscriber.disconnect();
    }
    setTimeout(() => {
        console.log("Exiting.");
        process.exit(0);
    }, 2000);
});