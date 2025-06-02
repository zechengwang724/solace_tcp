import { pack, unpack } from "msgpackr";
import solace from 'solclientjs';

const content_type = new solace.SDTMapContainer();
content_type.addField(
    "ct",
    solace.SDTField.create(solace.SDTFieldType.STRING, "msgpack")
);

const convertSdt2Obj = (msg, field) => {
    const obj = {};
    if (field.getType() === solace.SDTFieldType.MAP) {
        const sdtMap = field.getValue();
        sdtMap.getKeys().forEach((key) => {
            obj[key] = sdtMap.getField(key).getValue();
        });
    }
    return obj;
}

const unPackSolMsg = (msg) => {
    let map = msg.getUserPropertyMap();
    let contentType = map?.getField("ct")?.getValue();
    if (contentType === "msgpack") {
        const resp_binary = msg.getBinaryAttachment();
        if (resp_binary instanceof Uint8Array) {
            const resp = unpack(resp_binary);
            return resp;
        } else {
            console.error("No binary attachment");
            return undefined;
        }
    }
    else if (contentType === "sdt") {
        const sdtMap = msg.getSdtContainer();
        if (sdtMap) {
            const resp = convertSdt2Obj(msg, sdtMap);
            return resp;
        }
    }
    else {
        console.error("Unknown content type:", contentType);
        return undefined;
    }
};

export { unPackSolMsg };